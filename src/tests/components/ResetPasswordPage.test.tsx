import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import { nbResetPasswordFlowStrings as nb } from '@sjolystinnovation/app-kit/locales/nb';
import { defaultResetPasswordFlowStrings } from '@sjolystinnovation/app-kit/ui';
import ResetPasswordPage from '@/app/[locale]/(auth)/reset-password/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import { navigation, resetTestMocks } from '@sjolystinnovation/app-kit/testing';

const dict = getDictionary('no');
const resetPassword = vi.fn();

vi.mock('next/navigation', async () => (await import('@sjolystinnovation/app-kit/testing')).nextNavigationMock());
vi.mock('@/services/userService', () => ({
    default: { resetPassword: (...args: unknown[]) => resetPassword(...args), requestPasswordReset: vi.fn() },
}));

const text = (locale: Locale) => (locale === 'no' ? nb : defaultResetPasswordFlowStrings);

const page = (locale: Locale = 'no') => (
    <DictionaryProvider locale={locale}>
        <ResetPasswordPage />
    </DictionaryProvider>
);

const submitPassword = async (password: string, locale: Locale = 'no') => {
    await userEvent.type(screen.getByLabelText(new RegExp(`^${text(locale).newPassword}`)), password);
    await userEvent.click(screen.getByRole('button', { name: text(locale).setPassword }));
};

// The Error that the user service throws for an API refusal with a code.
const refused = (status: number, data: object) =>
    request(
        () => Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, data } })),
        'Failed',
    ).catch((e: unknown) => e);

describe('reset password page', () => {
    beforeEach(() => {
        resetTestMocks();
        navigation.searchParams = new URLSearchParams('email=ola@kunde.no&code=123456');
        resetPassword.mockReset().mockResolvedValue({ message: 'ok' });
    });

    it('does not send a password the API would refuse', async () => {
        render(page());

        await submitPassword('passord1');

        expect(resetPassword).not.toHaveBeenCalled();
        expect(screen.getByLabelText(new RegExp(`^${nb.newPassword}`))).toHaveAccessibleDescription(dict.validation.password);
    });

    it('does not count Å as an uppercase letter, as the API does not', async () => {
        render(page());

        await submitPassword('Ålesund1');

        expect(resetPassword).not.toHaveBeenCalled();
    });

    it('sends a password that meets the rules', async () => {
        render(page());

        await submitPassword('Ålesund1A');

        expect(resetPassword).toHaveBeenCalledWith({ email: 'ola@kunde.no', code: '123456', newPassword: 'Ålesund1A' });
    });

    it.each(['no', 'en'] as const)('shows a wrong reset code in the page language (%s)', async locale => {
        resetPassword.mockRejectedValueOnce(await refused(400, { message: 'Invalid or expired reset code.', code: 'invalidResetCode' }));
        render(page(locale));

        await submitPassword('Ålesund1A', locale);

        expect(await screen.findByText(text(locale).errors.invalidResetCode)).toBeInTheDocument();
    });

    it('shows too many attempts in Norwegian', async () => {
        resetPassword.mockRejectedValueOnce(await refused(429, { message: 'Too many attempts. Request a new reset code.', code: 'tooManyResetAttempts' }));
        render(page());

        await submitPassword('Ålesund1A');

        expect(await screen.findByText(nb.errors.tooManyResetAttempts)).toBeInTheDocument();
        expect(screen.queryByText('Too many attempts. Request a new reset code.')).not.toBeInTheDocument();
    });

    it('shows a field error from the API under its field in Norwegian', async () => {
        resetPassword.mockRejectedValueOnce(await refused(400, {
            errors: { NewPassword: ['Passwords must be at least 10 characters.'] },
            codes: { NewPassword: ['passwordTooShort'] },
            limits: { NewPassword: 10 },
        }));
        render(page());

        await submitPassword('Ålesund1A');

        expect(await screen.findByText('Passordet er for kort. Bruk minst 10 tegn.')).toBeInTheDocument();
        expect(screen.getByLabelText(new RegExp(`^${nb.newPassword}`))).toHaveAccessibleDescription('Passordet er for kort. Bruk minst 10 tegn.');
    });

    it('keeps the app intro and leaves out the sign-in prompt in English', () => {
        navigation.searchParams = new URLSearchParams('');
        render(page('en'));

        expect(screen.getByText(getDictionary('en').auth.resetIntro)).toBeInTheDocument();
        expect(screen.queryByText(defaultResetPasswordFlowStrings.signInPrompt!)).not.toBeInTheDocument();
    });
});
