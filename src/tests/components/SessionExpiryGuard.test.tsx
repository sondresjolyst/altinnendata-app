import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from 'next-auth';
import SessionExpiryGuard from '@/components/SessionExpiryGuard';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import { closeSessionPrompt, getSessionPromptOpen, openSessionPrompt } from '@/lib/sessionExpiry';

const dict = getDictionary('no');

const signIn = vi.fn();
const signOut = vi.fn();
const getSession = vi.fn();
const success = vi.fn();
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
        sessionState = { data: session(), status: 'authenticated' };
        closeSessionPrompt();
    });

    afterEach(() => closeSessionPrompt());

    it('shows nothing while the session is healthy and nothing has failed', () => {
        render(guard());

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByText(dict.auth.sessionExpiredBody)).not.toBeInTheDocument();
    });

    it('opens the prompt when a request finds a dead session', () => {
        render(guard());

        act(() => openSessionPrompt());

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByLabelText(new RegExp(`^${dict.auth.email}`))).toHaveValue('a@b.no');
    });

    it('signs in without navigating away from the form', async () => {
        signIn.mockResolvedValue({ error: null });
        getSession.mockResolvedValue(session());
        render(guard());
        act(() => openSessionPrompt());

        await signInWith('Password1');

        // redirect: false is the whole point. A redirecting sign-in would unmount the form and
        // reintroduce the bug this component exists to kill.
        expect(signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({ redirect: false }));
        expect(getSessionPromptOpen()).toBe(false);
        expect(success).toHaveBeenCalledWith(dict.auth.sessionRestored);
    });

    it('keeps the prompt open when the password is wrong', async () => {
        signIn.mockResolvedValue({ error: 'CredentialsSignin' });
        render(guard());
        act(() => openSessionPrompt());

        await signInWith('wrong');

        // A typo must not cost the user their work either.
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(dict.auth.invalidCredentials)).toBeInTheDocument();
        expect(success).not.toHaveBeenCalled();
    });

    it('does not claim success when the new session still cannot save', async () => {
        signIn.mockResolvedValue({ error: null });
        getSession.mockResolvedValue(session({ error: 'RefreshTokenRejected' }));
        render(guard());
        act(() => openSessionPrompt());

        await signInWith('Password1');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(dict.auth.sessionNotRestored)).toBeInTheDocument();
        expect(success).not.toHaveBeenCalled();
    });

    it('warns before the absolute cap, with the minutes left', () => {
        sessionState = { data: session({ absoluteExpiresAt: Date.now() + 12 * 60 * 1000 }), status: 'authenticated' };

        render(guard());

        expect(screen.getByText(dict.auth.sessionExpiringSoon.replace('{minutes}', '12'))).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not warn while the cap is still far away', () => {
        sessionState = { data: session({ absoluteExpiresAt: Date.now() + 6 * 60 * 60 * 1000 }), status: 'authenticated' };

        render(guard());

        expect(screen.queryByText(/{minutes}/)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: dict.auth.reSignIn })).not.toBeInTheDocument();
    });

    it('offers the prompt from the banner once the session is dead', async () => {
        sessionState = { data: session({ error: 'AbsoluteSessionExpired' }), status: 'authenticated' };
        render(guard());

        expect(screen.getByText(dict.auth.sessionExpiredBody)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: dict.auth.reSignIn }));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('refuses to hand the page to a different account', async () => {
        signIn.mockResolvedValue({ error: null });
        getSession.mockResolvedValue({
            user: { id: '2', name: 'other', email: 'c@d.no', roles: ['Admin'] },
            accessToken: 'token',
            expires: '',
        });
        render(guard());
        act(() => openSessionPrompt());

        await signInWith('Password1');

        // The form belongs to whoever opened it, and signIn has already swapped the session,
        // so detecting the mismatch has to end it rather than only report it.
        expect(signOut).toHaveBeenCalledWith(expect.objectContaining({ callbackUrl: '/no/login' }));
        expect(screen.getByText(dict.auth.sessionWrongUser)).toBeInTheDocument();
        expect(getSessionPromptOpen()).toBe(true);
    });

    it('shows the generic message for a failure that is not about credentials', async () => {
        signIn.mockResolvedValue({ error: null });
        getSession.mockRejectedValue(new Error('Failed to fetch'));
        render(guard());
        act(() => openSessionPrompt());

        await signInWith('Password1');

        // A raw fetch error has no place in an otherwise Norwegian UI.
        expect(screen.getByText(dict.common.somethingWentWrong)).toBeInTheDocument();
    });

    it('closes the prompt when it unmounts, so the gate can redirect again', () => {
        const view = render(guard());
        act(() => openSessionPrompt());
        expect(getSessionPromptOpen()).toBe(true);

        view.unmount();

        expect(getSessionPromptOpen()).toBe(false);
    });

    it('reports an expired session rather than zero minutes left', () => {
        sessionState = { data: session({ absoluteExpiresAt: Date.now() - 1000 }), status: 'authenticated' };

        render(guard());

        expect(screen.getByText(dict.auth.sessionExpiredBody)).toBeInTheDocument();
        expect(screen.queryByText(dict.auth.sessionExpiringSoon.replace('{minutes}', '0'))).not.toBeInTheDocument();
    });

    it('puts the cursor in the password field when it opens', () => {
        render(guard());

        act(() => openSessionPrompt());

        expect(screen.getByLabelText(new RegExp(`^${dict.auth.password}`))).toHaveFocus();
    });

    it('closes on Escape', async () => {
        render(guard());
        act(() => openSessionPrompt());

        await userEvent.keyboard('{Escape}');

        expect(getSessionPromptOpen()).toBe(false);
    });

    it('keeps Tab inside the dialog', async () => {
        render(
            <DictionaryProvider locale="no">
                <input aria-label="behind the overlay" />
                <SessionExpiryGuard />
            </DictionaryProvider>,
        );
        act(() => openSessionPrompt());

        // Tab from the last control must wrap to the first, not walk into the form behind the
        // overlay, which the user cannot see and must not edit.
        const controls = screen.getByRole('dialog').querySelectorAll('input, button');
        (controls[controls.length - 1] as HTMLElement).focus();
        await userEvent.tab();

        expect(screen.getByLabelText('behind the overlay')).not.toHaveFocus();
        expect(controls[0]).toHaveFocus();
    });

    it('wraps backwards too', async () => {
        render(guard());
        act(() => openSessionPrompt());

        const controls = screen.getByRole('dialog').querySelectorAll('input, button');
        (controls[0] as HTMLElement).focus();
        await userEvent.tab({ shift: true });

        expect(controls[controls.length - 1]).toHaveFocus();
    });

    it('gives focus back where it was when it closes', async () => {
        render(
            <DictionaryProvider locale="no">
                <button type="button">save</button>
                <SessionExpiryGuard />
            </DictionaryProvider>,
        );
        const save = screen.getByRole('button', { name: 'save' });
        save.focus();

        act(() => openSessionPrompt());
        await userEvent.keyboard('{Escape}');

        expect(save).toHaveFocus();
    });
});
