import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionExpiryGuard from '@/components/SessionExpiryGuard';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import { closeSessionPrompt, openSessionPrompt } from '@sjolystinnovation/app-kit/session';
import { auth, makeSession, resetTestMocks, setSession, toastSpies } from '@sjolystinnovation/app-kit/testing';

// The guard itself is tested in app-kit. These tests cover what this app passes to it.
const dict = getDictionary('no');

const assign = vi.fn();

vi.mock('next-auth/react', async () => (await import('@sjolystinnovation/app-kit/testing')).nextAuthMock());
vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());

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
        resetTestMocks();
        assign.mockReset();
        vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, assign } as Location);
        setSession(makeSession());
        closeSessionPrompt();
    });

    afterEach(() => {
        closeSessionPrompt();
        vi.restoreAllMocks();
    });

    it('uses the dictionary wording in the banner and the prompt', () => {
        setSession(makeSession({ error: 'AbsoluteSessionExpired' }));
        render(guard());
        expect(screen.getAllByText(dict.auth.sessionExpiredBody).length).toBeGreaterThan(0);

        act(() => openSessionPrompt());

        expect(screen.getByRole('heading', { name: dict.auth.sessionExpiredTitle })).toBeInTheDocument();
        expect(screen.getByLabelText(new RegExp(`^${dict.auth.email}`))).toHaveValue('a@b.no');
    });

    it('shows the dictionary toast after a good sign-in', async () => {
        auth.signIn.mockResolvedValue({ error: null, ok: true });
        auth.getSession.mockResolvedValue(makeSession());
        render(guard());
        act(() => openSessionPrompt());

        await signInWith('Password1');

        expect(toastSpies.success).toHaveBeenCalledWith(dict.auth.sessionRestored);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('sends another account to /no/login', async () => {
        auth.signIn.mockResolvedValue({ error: null, ok: true });
        auth.getSession
            .mockResolvedValueOnce(makeSession({ user: { id: '2', name: 'other', email: 'c@d.no', roles: ['Admin'] } }))
            .mockResolvedValue(null);
        render(guard());
        act(() => openSessionPrompt());

        await signInWith('Password1');

        expect(auth.signOut).toHaveBeenCalled();
        expect(assign).toHaveBeenCalledWith('/no/login');
        expect(screen.getByText(dict.auth.sessionWrongUser)).toBeInTheDocument();
    });
});
