import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CredentialsForm from '@/components/CredentialsForm';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';

const dict = getDictionary('no');
const signIn = vi.fn();

vi.mock('next-auth/react', () => ({
    signIn: (...args: unknown[]) => signIn(...args),
}));

async function submitWith(error: string) {
    signIn.mockResolvedValue({ error });
    render(
        <DictionaryProvider locale="no">
            <CredentialsForm initialEmail="a@b.no" onSignedIn={() => {}} />
        </DictionaryProvider>,
    );
    await userEvent.type(screen.getByLabelText(new RegExp(`^${dict.auth.password}`)), 'pw');
    await userEvent.click(screen.getByRole('button', { name: dict.auth.signIn }));
}

describe('CredentialsForm on a failed sign-in', () => {
    it('says the API is unavailable when it is', async () => {
        await submitWith('SignInUnavailable');

        expect(await screen.findByText(dict.auth.signInUnavailable)).toBeInTheDocument();
    });

    it('says the credentials are wrong for any other failure', async () => {
        await submitWith('InvalidCredentials');

        expect(await screen.findByText(dict.auth.invalidCredentials)).toBeInTheDocument();
    });
});
