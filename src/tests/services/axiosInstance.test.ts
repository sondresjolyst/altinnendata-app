import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Session } from 'next-auth';

const getSession = vi.fn();

vi.mock('next-auth/react', () => ({
    getSession: () => getSession(),
}));

const { default: axiosInstance } = await import('@/services/axiosInstance');
const { closeSessionPrompt, getSessionPromptOpen } = await import('@/lib/sessionExpiry');

const session = (error?: string): Session => ({
    user: { id: '1', name: 'admin', email: 'a@b.no', roles: ['Admin'] },
    accessToken: 'token',
    error,
    expires: '',
});

const originalAdapter = axiosInstance.defaults.adapter;

function rejectWith(status: number) {
    axiosInstance.defaults.adapter = async () => {
        throw Object.assign(new Error(`status ${status}`), { isAxiosError: true, response: { status } });
    };
}

describe('axios instance on an unauthorized response', () => {
    beforeEach(() => {
        getSession.mockReset();
        closeSessionPrompt();
    });

    afterEach(() => {
        axiosInstance.defaults.adapter = originalAdapter;
        closeSessionPrompt();
    });

    it('asks for a new sign-in when the session cannot recover', async () => {
        getSession.mockResolvedValue(session('RefreshTokenRejected'));
        rejectWith(401);

        await expect(axiosInstance.get('/builds')).rejects.toThrow();

        // Signing out here is what threw the customer out of a half-written build.
        expect(getSessionPromptOpen()).toBe(true);
    });

    it('asks for a new sign-in when the session cookie is gone', async () => {
        getSession.mockResolvedValue(null);
        rejectWith(401);

        await expect(axiosInstance.get('/builds')).rejects.toThrow();

        // Signed out in another tab, or the cookie cleared after a callback error: there is no
        // session left to carry an error field, and the user still needs the prompt.
        expect(getSessionPromptOpen()).toBe(true);
    });

    it('stays quiet when a request races an expiring token on a recoverable session', async () => {
        getSession.mockResolvedValue(session());
        rejectWith(401);

        await expect(axiosInstance.get('/builds')).rejects.toThrow();

        // The common case: the next session read refreshes and the retry succeeds. Prompting
        // here would nag the user for nothing.
        expect(getSessionPromptOpen()).toBe(false);
    });

    it('stays quiet when the session is only transiently unhappy', async () => {
        getSession.mockResolvedValue(session('ECONNREFUSED'));
        rejectWith(401);

        await expect(axiosInstance.get('/builds')).rejects.toThrow();

        expect(getSessionPromptOpen()).toBe(false);
    });

    it('stays quiet on a status that is not about the session at all', async () => {
        getSession.mockResolvedValue(null);
        rejectWith(403);

        await expect(axiosInstance.get('/admin/users')).rejects.toThrow();

        expect(getSessionPromptOpen()).toBe(false);
    });
});
