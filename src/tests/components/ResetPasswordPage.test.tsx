import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordPage from '@/app/[locale]/(auth)/reset-password/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';

const dict = getDictionary('no');
const resetPassword = vi.fn();

vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams('email=ola@kunde.no&code=123456'),
}));
vi.mock('@/services/userService', () => ({
    default: { resetPassword: (...args: unknown[]) => resetPassword(...args), requestPasswordReset: vi.fn() },
}));

const page = () => (
    <DictionaryProvider locale="no">
        <ResetPasswordPage />
    </DictionaryProvider>
);

const submitPassword = async (password: string) => {
    await userEvent.type(screen.getByLabelText(new RegExp(`^${dict.auth.newPassword}`)), password);
    await userEvent.click(screen.getByRole('button', { name: dict.auth.setPassword }));
};

describe('reset password page', () => {
    beforeEach(() => resetPassword.mockReset().mockResolvedValue({ message: 'ok' }));

    it('does not send a password the API would refuse', async () => {
        render(page());

        await submitPassword('passord1');

        expect(resetPassword).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent(dict.validation.password);
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
});
