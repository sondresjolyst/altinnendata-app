import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { JWT } from 'next-auth/jwt';
import { authOptions } from '@/lib/authOptions';
import { apiClient } from '@/services/userService';
import { SESSION_ERRORS, isTerminalSessionError } from '@sjolystinnovation/app-kit/session';

const SECRET = 'a-test-secret-long-enough-for-hmac-sha256';
process.env.ALTINNENDATA_API_JWT_SECRET = SECRET;

const HOUR_S = 60 * 60;

function apiToken({ lifetime = HOUR_S, secret = SECRET }: { lifetime?: number; secret?: string } = {}) {
    const iat = Math.floor(Date.now() / 1000);
    return jwt.sign(
        { sub: 'u1', unique_name: 'admin', email: 'a@b.no', role: ['Admin'], iat, nbf: iat - 5, exp: iat + lifetime },
        secret,
    );
}

// A fresh refresh token per case: the single-flight map is module state and must not leak
// between tests.
let tokenSeq = 0;

function sessionToken(overrides: Partial<JWT> = {}): JWT {
    return {
        accessToken: apiToken(),
        refreshToken: `RT-${++tokenSeq}`,
        refreshAt: Date.now() + 30 * 60 * 1000,
        loginAt: Date.now(),
        user: { id: 'u1', name: 'admin', email: 'a@b.no', roles: ['Admin'] },
        ...overrides,
    };
}

// The callback's declared signature carries next-auth's full argument union. The jwt callback
// reads only token and user.
const runJwt = (token: JWT): Promise<JWT> =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (authOptions.callbacks!.jwt as any)({ token });

// Drive the real UserService.refreshToken, so the 400/401 mapping onto
// RefreshTokenRejectedError is covered here too rather than mocked away.
const originalAdapter = apiClient.defaults.adapter;
let calls = 0;

function respondWith(body: { token: string; refreshToken: string } | Promise<{ token: string; refreshToken: string }>) {
    apiClient.defaults.adapter = async config => {
        calls += 1;
        return { data: await body, status: 200, statusText: 'OK', headers: {}, config };
    };
}

function failWith(status: number) {
    apiClient.defaults.adapter = async () => {
        calls += 1;
        throw Object.assign(new Error(`status ${status}`), {
            isAxiosError: true,
            response: { status, data: { message: 'Invalid or expired refresh token' } },
        });
    };
}

describe('the jwt callback', () => {
    beforeEach(() => {
        calls = 0;
    });

    afterEach(() => {
        apiClient.defaults.adapter = originalAdapter;
    });

    it('leaves a healthy token alone and does not call the API', async () => {
        failWith(500);
        const token = sessionToken();

        const result = await runJwt(token);

        expect(result).toEqual(token);
        expect(calls).toBe(0);
    });

    it('refreshes before the access token expires, not after', async () => {
        respondWith({ token: apiToken(), refreshToken: 'RT-next' });

        // Inside the skew window: still valid, but close enough that the next save would race it.
        await runJwt(sessionToken({ refreshAt: Date.now() - 1000 }));

        expect(calls).toBe(1);
    });

    it('clears a recorded error once a refresh succeeds', async () => {
        respondWith({ token: apiToken(), refreshToken: 'RT-next' });

        const result = await runJwt(sessionToken({ refreshAt: 0, error: 'ECONNREFUSED' }));

        expect(result.error).toBeUndefined();
        expect(result.refreshToken).toBe('RT-next');
    });

    it('keeps the session through a transient refresh failure', async () => {
        failWith(500);
        const token = sessionToken({ refreshAt: 0 });

        const result = await runJwt(token);

        // An API restart must not log an admin out mid-build.
        expect(result.error).toBeUndefined();
        expect(isTerminalSessionError(result.error)).toBe(false);
        expect(result.refreshToken).toBe(token.refreshToken);
    });

    it('keeps the session when the API cannot be reached at all', async () => {
        apiClient.defaults.adapter = async () => {
            calls += 1;
            throw Object.assign(new Error('connect ECONNREFUSED'), { isAxiosError: true, code: 'ECONNREFUSED' });
        };

        const result = await runJwt(sessionToken({ refreshAt: 0 }));

        expect(result.error).toBeUndefined();
    });

    it('ends the session when the API rejects the refresh token itself', async () => {
        failWith(401);

        const result = await runJwt(sessionToken({ refreshAt: 0 }));

        expect(result.error).toBe(SESSION_ERRORS.refreshRejected);
        expect(isTerminalSessionError(result.error)).toBe(true);
    });

    it('ends the session when the API rejects the access token as malformed', async () => {
        failWith(400);

        const result = await runJwt(sessionToken({ refreshAt: 0 }));

        expect(result.error).toBe(SESSION_ERRORS.refreshRejected);
    });

    it('keeps the rotated tokens even when the new access token cannot be read', async () => {
        respondWith({ token: apiToken({ secret: 'a-different-secret-entirely' }), refreshToken: 'RT-next' });

        const result = await runJwt(sessionToken({ refreshAt: 0 }));

        // The API has already consumed the old token. Throwing the new one away would make the
        // next read replay a dead token, which revokes every device the user is signed in on.
        expect(result.refreshToken).toBe('RT-next');
        expect(result.error).toBeUndefined();
        // Near the window the rotation is remembered for. A sooner retry would be answered
        // from that memory instead of reaching the API.
        expect(result.refreshAt! - Date.now()).toBeGreaterThan(55_000);
    });

    it('stops asking the API once the session is terminally dead', async () => {
        failWith(401);

        const result = await runJwt(sessionToken({ refreshAt: 0, error: SESSION_ERRORS.refreshRejected }));

        expect(calls).toBe(0);
        expect(result.error).toBe(SESSION_ERRORS.refreshRejected);
    });

    it('ends the session at the absolute cap, however fresh the access token is', async () => {
        failWith(500);

        const result = await runJwt(sessionToken({ loginAt: Date.now() - 8 * 24 * 60 * 60 * 1000 }));

        expect(result.error).toBe(SESSION_ERRORS.absoluteExpiry);
        expect(calls).toBe(0);
    });

    it('reports a session with no refresh token instead of hanging on to it', async () => {
        const result = await runJwt(sessionToken({ refreshAt: 0, refreshToken: undefined }));

        expect(result.error).toBe(SESSION_ERRORS.noRefreshToken);
    });

    it('collapses parallel refreshes of the same token into one API call', async () => {
        let release: (value: { token: string; refreshToken: string }) => void = () => {};
        respondWith(new Promise(resolve => { release = resolve; }));
        const token = sessionToken({ refreshAt: 0 });

        const both = Promise.all([runJwt(token), runJwt(token)]);
        release({ token: apiToken(), refreshToken: 'RT-next' });
        const [first, second] = await both;

        // Letting both through would make the loser present a token the API already consumed,
        // and the API answers a replay by revoking every refresh token the user holds.
        expect(calls).toBe(1);
        expect(first.refreshToken).toBe('RT-next');
        expect(second.refreshToken).toBe('RT-next');
    });

    it('answers a read that was already carrying the consumed token', async () => {
        respondWith({ token: apiToken(), refreshToken: 'RT-next' });
        const token = sessionToken({ refreshAt: 0 });

        const first = await runJwt(token);
        // A request that was on the wire during the rotation arrives afterwards still holding
        // the old token. Rotating again would present a token the API has consumed, and it
        // answers that by revoking every session the user has.
        const late = await runJwt(token);

        expect(calls).toBe(1);
        expect(late.refreshToken).toBe(first.refreshToken);
    });

    it('rotates a token it has not seen before', async () => {
        respondWith({ token: apiToken(), refreshToken: 'RT-next' });

        await runJwt(sessionToken({ refreshAt: 0 }));
        await runJwt(sessionToken({ refreshAt: 0 }));

        expect(calls).toBe(2);
    });

    it('does not fall into a rotation on every read when the token carries no lifetime', async () => {
        const iat = Math.floor(Date.now() / 1000);
        const noExpiry = jwt.sign({ sub: 'u1', unique_name: 'admin', email: 'a@b.no', role: ['Admin'], iat }, SECRET);
        respondWith({ token: noExpiry, refreshToken: 'RT-next' });

        const result = await runJwt(sessionToken({ refreshAt: 0 }));

        // NaN is falsy, so an unguarded refreshAt would make every session read spend a
        // rotation, and each rotation is a chance to replay.
        // The skew floor, not the retry window: this token was read, it just has no lifetime.
        expect(result.refreshAt! - Date.now()).toBeGreaterThan(25_000);
    });

    it('backs off instead of retrying a sick API on every request', async () => {
        failWith(503);

        const result = await runJwt(sessionToken({ refreshAt: 0 }));

        expect(result.error).toBeUndefined();
        // Near the window the rotation is remembered for. A sooner retry would be answered
        // from that memory instead of reaching the API.
        expect(result.refreshAt! - Date.now()).toBeGreaterThan(55_000);
    });

    it('shortens the skew for a short-lived access token so not every read refreshes', async () => {
        respondWith({ token: apiToken({ lifetime: 120 }), refreshToken: 'RT-next' });

        const result = await runJwt(sessionToken({ refreshAt: 0 }));

        // A quarter of a 120s lifetime is 30s, so refreshAt must sit ahead of now, not behind it.
        expect(result.refreshAt).toBeGreaterThan(Date.now());
        expect(result.refreshAt! - Date.now()).toBeLessThan(120 * 1000);
    });

    it('re-reads the roles the API returns on a refresh', async () => {
        respondWith({ token: apiToken(), refreshToken: 'RT-next' });

        const result = await runJwt(
            sessionToken({ refreshAt: 0, user: { id: 'u1', name: 'admin', email: 'a@b.no', roles: [] } }),
        );

        expect(result.user?.roles).toEqual(['Admin']);
    });
});

describe('the session callback', () => {
    const runSession = (token: JWT) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (authOptions.callbacks!.session as any)({ session: { user: null, expires: '' }, token });

    it('publishes the absolute expiry so the UI can warn before it lands', async () => {
        const loginAt = Date.now();

        const session = await runSession(sessionToken({ loginAt }));

        expect(session.absoluteExpiresAt).toBe(loginAt + 7 * 24 * 60 * 60 * 1000);
    });

    it('passes the error through so the gate and the prompt can see it', async () => {
        const session = await runSession(sessionToken({ error: SESSION_ERRORS.absoluteExpiry }));

        expect(session.error).toBe(SESSION_ERRORS.absoluteExpiry);
    });
});
