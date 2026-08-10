import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import UserService from "@/services/userService";
import jwt from 'jsonwebtoken';
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

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

const ABSOLUTE_SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function parseApiToken(token: string): DecodedToken {
    const secret = process.env.ALTINNENDATA_API_JWT_SECRET;
    if (!secret) {
        throw new Error('ALTINNENDATA_API_JWT_SECRET is not configured. Refusing to accept unverified API tokens.');
    }
    return jwt.verify(token, secret) as DecodedToken;
}

type ExtendedUser = {
    id: string;
    name: string;
    email: string;
    roles: string[];
    accessToken: string;
    accessTokenExpires: number;
    refreshToken: string;
};

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials) {
                    throw new Error("Credentials are missing");
                }
                try {
                    const user = await UserService.login({
                        email: credentials.email,
                        password: credentials.password,
                    });
                    if (user) {
                        const decodedToken = parseApiToken(user.token);
                        const raw = decodedToken.role;
                        const roles = Array.isArray(raw) ? raw : raw ? [raw] : [];
                        return {
                            id: decodedToken.sub,
                            name: decodedToken.unique_name,
                            email: credentials.email,
                            roles,
                            accessToken: user.token,
                            accessTokenExpires: decodedToken.exp * 1000,
                            refreshToken: user.refreshToken
                        } as ExtendedUser;
                    }
                    return null;
                } catch (error) {
                    console.error("Error in authorize function:", error);
                    throw new Error("Invalid email or password");
                }
            }
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        maxAge: 7 * 24 * 60 * 60,
    },
    jwt: {
        secret: process.env.NEXTAUTH_SECRET,
    },
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user) {
                const decodedToken = parseApiToken((user as ExtendedUser).accessToken);
                token.accessToken = (user as ExtendedUser).accessToken;
                token.accessTokenExpires = decodedToken.exp * 1000;
                token.refreshToken = (user as ExtendedUser).refreshToken;
                token.loginAt = Date.now();
                token.user = {
                    id: user.id,
                    name: user.name ?? '',
                    email: user.email ?? '',
                    roles: (user as ExtendedUser).roles,
                };
            }

            if (token.loginAt && Date.now() - (token.loginAt as number) > ABSOLUTE_SESSION_MAX_AGE) {
                return { ...token, error: 'AbsoluteSessionExpired' } as JWT;
            }

            if (
                trigger !== "update" &&
                token.accessTokenExpires &&
                Date.now() < (token.accessTokenExpires as number)
            ) {
                return token;
            }

            if (token.refreshToken) {
                try {
                    const refreshed = await UserService.refreshToken({
                        token: token.accessToken as string,
                        refreshToken: token.refreshToken as string,
                    });
                    const decodedToken = parseApiToken(refreshed.token);
                    const raw = decodedToken.role;
                    const roles = Array.isArray(raw) ? raw : raw ? [raw] : [];
                    return {
                        ...token,
                        accessToken: refreshed.token,
                        accessTokenExpires: decodedToken.exp * 1000,
                        refreshToken: refreshed.refreshToken,
                        user: { ...(token.user as object), roles },
                    } as JWT;
                } catch (error) {
                    return {
                        ...token,
                        error: error instanceof Error ? error.message : String(error),
                    } as JWT;
                }
            }

            return {
                ...token,
                error: "AccessTokenExpired",
            } as JWT;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            session.user = token.user!;
            session.accessToken = token.accessToken!;
            session.error = token.error;
            return session;
        },
    },
});

export { handler as GET, handler as POST };
