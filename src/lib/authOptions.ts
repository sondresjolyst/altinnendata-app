import axios from 'axios';
import CredentialsProvider from 'next-auth/providers/credentials';
import jwt from 'jsonwebtoken';
import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import UserService, { RefreshTokenRejectedError } from '@/services/userService';
import { resolveJwtSecret } from '@sjolystinnovation/app-kit';
import { SESSION_ERRORS, isTerminalSessionError } from '@sjolystinnovation/app-kit/session';
import { sessionConfig } from '@/lib/session';

type DecodedToken = {
    sub: string;
    unique_name: string;
    email: string;
    role?: string | string[];
    nbf: number;
    exp: number;
    iat: number;
    iss: string;
    aud: string;
};

type ExtendedUser = {
    id: string;
    name: string;
    email: string;
    roles: string[];
    accessToken: string;
    refreshToken: string;
};

const ABSOLUTE_SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// Refresh this far before the access token expires, so it is renewed while the user is idle
// rather than in the middle of their next save.
const MAX_REFRESH_SKEW_MS = 5 * 60 * 1000;

// The soonest a refresh may be due. Only a floor on the skew, so a short-lived API token
// cannot put every session read into a refresh.
const MIN_REFRESH_GAP_MS = 30 * 1000;

function parseApiToken(token: string): DecodedToken {
    return jwt.verify(token, resolveJwtSecret(sessionConfig, process.env)) as DecodedToken;
}

function rolesOf(decoded: DecodedToken): string[] {
    const raw = decoded.role;
    return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

// Never more than a quarter of the token's own lifetime, so a shorter-lived API token cannot
// put every single session read into a refresh. Always at least MIN_REFRESH_GAP_MS away: a
// token with no exp, or with exp equal to iat, would otherwise be due for refresh on every
// read, and each refresh spends a rotation.
function nextRefreshAt(decoded: DecodedToken): number {
    const expiresAt = decoded.exp * 1000;
    const lifetimeMs = Math.max(0, (decoded.exp - decoded.iat) * 1000);
    const refreshAt = expiresAt - Math.min(MAX_REFRESH_SKEW_MS, lifetimeMs / 4);
    if (!Number.isFinite(refreshAt)) return Date.now() + MIN_REFRESH_GAP_MS;
    return Math.max(Date.now() + MIN_REFRESH_GAP_MS, refreshAt);
}

// next-auth runs the jwt callback once per session read, and parallel reads all carry the same
// refresh token. The API rotates on every call, so letting them all through would make the
// losers present a consumed token and trip its replay detection, which revokes every device.
// Collapse refreshes of one token into a single request, and keep the answer for a short while
// afterwards: a read whose request was already on the wire still carries the consumed token,
// and it arrives after the rotation has settled.
//
// The map is per Node process. One container today, so this covers every racing read. A second
// replica would not share it, and the losers would present a consumed token again.
//
// It also sets the real retry gap after a failure, because a sooner retry would be served the
// remembered failure rather than reaching the API.
const REMEMBER_ROTATION_MS = 60 * 1000;

const inFlight = new Map<string, Promise<JWT>>();

function refreshOnce(token: JWT): Promise<JWT> {
    const key = token.refreshToken as string;
    const existing = inFlight.get(key);
    if (existing) return existing;

    const pending = rotate(token);
    inFlight.set(key, pending);
    // Forget it on a timer rather than on settle. Unref so a pending timer cannot hold a
    // serverless invocation open.
    const expiry = setTimeout(() => inFlight.delete(key), REMEMBER_ROTATION_MS);
    expiry.unref?.();
    return pending;
}

async function rotate(token: JWT): Promise<JWT> {
    let refreshed;
    try {
        refreshed = await UserService.refreshToken({
            token: token.accessToken as string,
            refreshToken: token.refreshToken as string,
        });
    } catch (error) {
        if (error instanceof RefreshTokenRejectedError) {
            return { ...token, error: SESSION_ERRORS.refreshRejected } as JWT;
        }
        // A network blip or an API restart must not end the session. Keep the token so a later
        // read tries again. Log the shape only, never the error object: an AxiosError carries
        // the request config, and the refresh body holds both tokens.
        console.error('Refresh token request failed, keeping the session', {
            status: axios.isAxiosError(error) ? error.response?.status : undefined,
            code: axios.isAxiosError(error) ? error.code : undefined,
            message: error instanceof Error ? error.message : String(error),
        });
        return { ...token, refreshAt: Date.now() + REMEMBER_ROTATION_MS } as JWT;
    }

    // The API has rotated by this point, so the new tokens must be kept whatever happens below.
    // Discarding them would leave the session holding a consumed token, and presenting that
    // again is what revokes every refresh token the user has.
    const next: JWT = {
        ...token,
        accessToken: refreshed.token,
        refreshToken: refreshed.refreshToken,
        error: undefined,
    };

    try {
        const decoded = parseApiToken(refreshed.token);
        next.refreshAt = nextRefreshAt(decoded);
        next.user = { ...(token.user as NonNullable<JWT['user']>), roles: rolesOf(decoded) };
    } catch (error) {
        // The token is ours but unreadable (clock skew against its nbf, a rotated secret).
        // Retry shortly with the refresh token we just received.
        console.error('Could not read the refreshed access token, retrying shortly', {
            message: error instanceof Error ? error.message : String(error),
        });
        next.refreshAt = Date.now() + REMEMBER_ROTATION_MS;
    }

    return next;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials) {
                    throw new Error('Credentials are missing');
                }
                try {
                    const user = await UserService.login({
                        email: credentials.email,
                        password: credentials.password,
                    });
                    if (user) {
                        const decodedToken = parseApiToken(user.token);
                        return {
                            id: decodedToken.sub,
                            name: decodedToken.unique_name,
                            email: credentials.email,
                            roles: rolesOf(decodedToken),
                            accessToken: user.token,
                            refreshToken: user.refreshToken,
                        } as ExtendedUser;
                    }
                    return null;
                } catch (error) {
                    console.error('Error in authorize function:', error);
                    throw new Error('Invalid email or password');
                }
            }
        }),
    ],
    pages: {
        signIn: sessionConfig.loginRoute,
    },
    session: {
        maxAge: ABSOLUTE_SESSION_MAX_AGE / 1000,
    },
    jwt: {
        secret: process.env.NEXTAUTH_SECRET,
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                const decodedToken = parseApiToken((user as ExtendedUser).accessToken);
                token.accessToken = (user as ExtendedUser).accessToken;
                token.refreshToken = (user as ExtendedUser).refreshToken;
                token.refreshAt = nextRefreshAt(decodedToken);
                token.loginAt = Date.now();
                token.error = undefined;
                token.user = {
                    id: user.id,
                    name: user.name ?? '',
                    email: user.email ?? '',
                    roles: (user as ExtendedUser).roles,
                };
            }

            if (token.loginAt && Date.now() - (token.loginAt as number) > ABSOLUTE_SESSION_MAX_AGE) {
                return { ...token, error: SESSION_ERRORS.absoluteExpiry } as JWT;
            }

            // Nothing but a new sign-in recovers a terminal session, so stop asking the API.
            // Every pointless attempt is another chance to present a consumed token.
            if (isTerminalSessionError(token.error)) {
                return token;
            }

            if (token.refreshAt && Date.now() < (token.refreshAt as number)) {
                return token;
            }

            if (!token.refreshToken) {
                return { ...token, error: SESSION_ERRORS.noRefreshToken } as JWT;
            }

            return refreshOnce(token);
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            session.user = token.user!;
            session.accessToken = token.accessToken!;
            session.error = token.error;
            // The absolute cap cannot be refreshed away, so the UI needs it to warn in advance.
            session.absoluteExpiresAt = token.loginAt ? token.loginAt + ABSOLUTE_SESSION_MAX_AGE : undefined;
            return session;
        },
    },
};
