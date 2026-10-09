import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from 'next-auth';
import SessionExpiryGuard from '@/components/SessionExpiryGuard';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import { closeSessionPrompt, openSessionPrompt } from '@sjolystinnovation/app-kit/session';

// The guard itself is tested in app-kit. These tests cover what this app passes to it.
const dict = getDictionary('no');

const signIn = vi.fn();
const signOut = vi.fn();
const getSession = vi.fn();
const success = vi.fn();
const assign = vi.fn();
let sessionState: { data: Session | null; status: 'loading' | 'authenticated' | 'unauthenticated' };

vi.mock('next-auth/react', () => ({
    useSession: () => sessionState,
    signIn: (...args: unknown[]) => signIn(...args),
    signOut: (...args: unknown[]) => signOut(...args),
    getSession: () => getSession(),
}));

vi.mock('sonner', () => ({
    toast: { success: (message: string) => success(message), error: vi.fn() },
}));

const session = (overrides: Partial<Session> = {}): Session => ({
    user: { id: '1', name: 'admin', email: 'a@b.no', roles: ['Admin'] },
    accessToken: 'token',
    expires: '',
    ...overrides,
});

const guard = () => (
    <DictionaryProvider locale="no">
        <SessionExpiryGuard />
    </DictionaryProvider>
);

const signInWith = async (password: string) => {
    await userEvent.type(screen.getByLabelText(new RegExp(`^${dict.auth.password}`)), password);
    await userEvent.click(screen.getByRole('button', { name: dict.auth.signIn }));
};

describe('SessionExpiryGuard', () => {
    beforeEach(() => {
        signIn.mockReset();
        signOut.mockReset();
        getSession.mockReset();
        success.mockReset();
        assign.mockReset();
        vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, assign } as Location);
        sessionState = { data: session(), status: 'authenticated' };
        closeSessionPrompt();
    });

    afterEach(() => {
        closeSessionPrompt();
        vi.restoreAllMocks();
    });

    it('uses the dictionary wording in the banner and the prompt', () => {
        sessionState = { data: session({ error: 'AbsoluteSessionExpired' }), status: 'authenticated' };
        render(guard());
        expect(screen.getAllByText(dict.auth.sessionExpiredBody).length).toBeGreaterThan(0);

        act(() => openSessionPrompt());

        expect(screen.getByRole('heading', { name: dict.auth.sessionExpiredTitle })).toBeInTheDocument();
        expect(screen.getByLabelText(new RegExp(`^${dict.auth.email}`))).toHaveValue('a@b.no');
    });

    it('shows the dictionary toast after a good sign-in', async () => {
        signIn.mockResolvedValue({ error: null, ok: true });
        getSession.mockResolvedValue(session());
        render(guard());
        act(() => openSessionPrompt());

        await signInWith('Password1');

        expect(success).toHaveBeenCalledWith(dict.auth.sessionRestored);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('sends another account to /no/login', async () => {
        signIn.mockResolvedValue({ error: null, ok: true });
        getSession
            .mockResolvedValueOnce(session({ user: { id: '2', name: 'other', email: 'c@d.no', roles: ['Admin'] } }))
            .mockResolvedValue(null);
        render(guard());
        act(() => openSessionPrompt());

        await signInWith('Password1');

        expect(signOut).toHaveBeenCalled();
        expect(assign).toHaveBeenCalledWith('/no/login');
        expect(screen.getByText(dict.auth.sessionWrongUser)).toBeInTheDocument();
    });
});
