import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '@/app/[locale]/(auth)/login/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';

const dict = getDictionary('no');
const signIn = vi.fn();
const push = vi.fn();

vi.mock('next-auth/react', () => ({
    signIn: (...args: unknown[]) => signIn(...args),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, refresh: vi.fn() }),
}));

function renderLogin() {
    render(
        <DictionaryProvider locale="no">
            <Login />
        </DictionaryProvider>,
    );
}

async function submitWith(result: { error?: string; ok?: boolean; url?: string }) {
    signIn.mockResolvedValue(result);
    renderLogin();
    await userEvent.type(screen.getByLabelText(new RegExp(`^${dict.auth.email}`)), 'a@b.no');
    await userEvent.type(screen.getByLabelText(new RegExp(`^${dict.auth.password}`)), 'pw');
    await userEvent.click(screen.getByRole('button', { name: dict.auth.signIn }));
}

describe('Login page', () => {
    it('is in Norwegian, with a link to reset the password', () => {
        renderLogin();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(dict.auth.signInTitle);
        expect(screen.getByRole('link', { name: dict.auth.forgotPassword })).toHaveAttribute('href', '/no/reset-password');
    });

    it('goes to admin after signing in', async () => {
        await submitWith({ ok: true, url: 'http://localhost/no/admin' });

        await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/no/admin'));
    });

    it('says the API is unavailable when it is', async () => {
        await submitWith({ error: 'SignInUnavailable' });

        expect(await screen.findByText(dict.auth.signInUnavailable)).toBeInTheDocument();
    });

    it('says the credentials are wrong for any other failure', async () => {
        await submitWith({ error: 'InvalidCredentials' });

        expect(await screen.findByText(dict.auth.invalidCredentials)).toBeInTheDocument();
    });
});
