import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '@/app/[locale]/(auth)/login/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import { auth, navigation, resetTestMocks } from '@sjolystinnovation/app-kit/testing';

const dict = getDictionary('no');

vi.mock('next-auth/react', async () => (await import('@sjolystinnovation/app-kit/testing')).nextAuthMock());
vi.mock('next/navigation', async () => (await import('@sjolystinnovation/app-kit/testing')).nextNavigationMock());

function renderLogin() {
    render(
        <DictionaryProvider locale="no">
            <Login />
        </DictionaryProvider>,
    );
}

async function submitWith(result: { error?: string; ok?: boolean; url?: string }) {
    auth.signIn.mockResolvedValue(result);
    renderLogin();
    await userEvent.type(screen.getByLabelText(new RegExp(`^${dict.auth.email}`)), 'a@b.no');
    await userEvent.type(screen.getByLabelText(new RegExp(`^${dict.auth.password}`)), 'pw');
    await userEvent.click(screen.getByRole('button', { name: dict.auth.signIn }));
}

describe('Login page', () => {
    beforeEach(resetTestMocks);

    it('is in Norwegian, with a link to reset the password', () => {
        renderLogin();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(dict.auth.signInTitle);
        expect(screen.getByRole('link', { name: dict.auth.forgotPassword })).toHaveAttribute('href', '/no/reset-password');
    });

    it('goes to admin after signing in', async () => {
        await submitWith({ ok: true, url: 'http://localhost/no/admin' });

        await vi.waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith('/no/admin'));
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
