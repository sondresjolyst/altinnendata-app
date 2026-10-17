import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '@/app/[locale]/(auth)/login/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { nbCredentialsFormStrings as form, nbLoginPageStrings as page } from '@sjolystinnovation/app-kit/locales/nb';
import { defaultCredentialsFormStrings } from '@sjolystinnovation/app-kit/session/react';
import type { Locale } from '@/i18n/config';
import { auth, navigation, resetTestMocks } from '@sjolystinnovation/app-kit/testing';

vi.mock('next-auth/react', async () => (await import('@sjolystinnovation/app-kit/testing')).nextAuthMock());
vi.mock('next/navigation', async () => (await import('@sjolystinnovation/app-kit/testing')).nextNavigationMock());

function renderLogin(locale: Locale = 'no') {
    render(
        <DictionaryProvider locale={locale}>
            <Login />
        </DictionaryProvider>,
    );
}

async function submitWith(result: { error?: string; ok?: boolean; url?: string }, locale: Locale = 'no') {
    const text = locale === 'no' ? form : defaultCredentialsFormStrings;
    auth.signIn.mockResolvedValue(result);
    renderLogin(locale);
    await userEvent.type(screen.getByLabelText(new RegExp(`^${text.email}`)), 'a@b.no');
    await userEvent.type(screen.getByLabelText(new RegExp(`^${text.password}`)), 'pw');
    await userEvent.click(screen.getByRole('button', { name: text.signIn }));
}

describe('Login page', () => {
    beforeEach(resetTestMocks);

    it('is in Norwegian, with a link to reset the password', () => {
        renderLogin();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(page.title);
        expect(screen.getByRole('link', { name: page.forgotPassword })).toHaveAttribute('href', '/no/reset-password');
    });

    it('goes to admin after signing in', async () => {
        await submitWith({ ok: true, url: 'http://localhost/no/admin' });

        await vi.waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith('/no/admin'));
    });

    it('says the API is unavailable when it is', async () => {
        await submitWith({ error: 'SignInUnavailable' });

        expect(await screen.findByText(form.signInUnavailable)).toBeInTheDocument();
    });

    it('says the credentials are wrong for any other failure', async () => {
        await submitWith({ error: 'InvalidCredentials' });

        expect(await screen.findByText(form.invalidCredentials)).toBeInTheDocument();
    });

    it.each([
        ['no', form.lockedOut],
        ['en', defaultCredentialsFormStrings.lockedOut],
    ] as const)('says the sign-in is locked after too many attempts (%s)', async (locale, text) => {
        await submitWith({ error: 'LockedOut' }, locale);

        expect(await screen.findByText(text)).toBeInTheDocument();
        expect(screen.queryByText(locale === 'no' ? form.invalidCredentials : defaultCredentialsFormStrings.invalidCredentials)).not.toBeInTheDocument();
    });

    it('has a Norwegian label on the show password button', () => {
        renderLogin();

        expect(screen.getByRole('button', { name: form.showPassword })).toBeInTheDocument();
    });
});
