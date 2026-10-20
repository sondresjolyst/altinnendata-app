import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetTestMocks } from '@sjolystinnovation/app-kit/testing';
import ContactForm from '@/components/ContactForm';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { Locale } from '@/i18n/config';

const service = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('@/services/contactService', () => ({ default: service }));

const renderForm = (locale: Locale) =>
    render(
        <DictionaryProvider locale={locale}>
            <ContactForm />
        </DictionaryProvider>,
    );

beforeEach(() => {
    resetTestMocks();
    service.send.mockReset().mockResolvedValue(undefined);
});

describe('ContactForm', () => {
    it.each([
        ['en', 'Name', 'Email', 'Message', 'Send'],
        ['no', 'Navn', 'E-post', 'Melding', 'Send'],
    ] as const)('sends the site language with the message, so the receipt is in it (%s)', async (locale, name, email, message, send) => {
        const user = userEvent.setup();
        renderForm(locale);

        await user.type(screen.getByLabelText(new RegExp(`^${name}`)), 'Kari Nordmann');
        await user.type(screen.getByLabelText(new RegExp(`^${email}`)), 'kari@example.no');
        await user.type(screen.getByLabelText(new RegExp(`^${message}`)), 'Hei');
        await user.click(screen.getByRole('button', { name: send }));

        await waitFor(() => expect(service.send).toHaveBeenCalledWith(expect.objectContaining({ name: 'Kari Nordmann', message: 'Hei', locale })));
    });
});
