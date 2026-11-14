import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TikTokPixel, setConsent } from '@sjolystinnovation/app-kit/consent';
import { resetTestMocks, toastSpies } from '@sjolystinnovation/app-kit/testing';
import ContactForm from '@/components/ContactForm';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { Locale } from '@/i18n/config';
import { CONSENT_OPTIONS } from '@/lib/consent';
import { acceptPixel, acceptTikTok, events, loadPixel, loadTikTok, resetPixel, tikTokEvents } from '../pixel';

const service = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
const pixels = vi.hoisted(() => ({ failContact: false }));

vi.mock('@/services/contactService', () => ({ default: service }));
vi.mock('@/lib/pixelEvents', async importOriginal => {
    const actual = await importOriginal<typeof import('@/lib/pixelEvents')>();
    return {
        ...actual,
        trackContact: () => {
            if (pixels.failContact) throw new Error('pixel failed');
            actual.trackContact();
        },
    };
});

const renderForm = (locale: Locale) =>
    render(
        <DictionaryProvider locale={locale}>
            <ContactForm />
        </DictionaryProvider>,
    );

beforeEach(() => {
    resetTestMocks();
    resetPixel();
    pixels.failContact = false;
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

describe('ContactForm pixel events', () => {
    type User = ReturnType<typeof userEvent.setup>;

    const fill = async (user: User, { phone = '912 34 567', message = 'Hei' } = {}) => {
        await user.type(screen.getByLabelText(/^Navn/), 'Kari Nordmann');
        await user.type(screen.getByLabelText(/^E-post/), 'Kari@Example.no');
        if (phone) await user.type(screen.getByLabelText(/^Telefon/), phone);
        if (message) await user.type(screen.getByLabelText(/^Melding/), message);
    };

    const send = (user: User) => user.click(screen.getByRole('button', { name: 'Send' }));

    it('sends Contact to Meta and Lead to TikTok once the API took the message', async () => {
        const fbq = acceptPixel();
        const ttq = loadTikTok();
        const user = userEvent.setup();
        renderForm('no');

        await fill(user);
        await send(user);

        await waitFor(() => expect(events(fbq)).toEqual([['track', 'Contact']]));
        expect(tikTokEvents(ttq).filter(call => call[0] === 'track')).toEqual([['track', 'Lead']]);
        expect(fbq.mock.invocationCallOrder[0]).toBeGreaterThan(service.send.mock.invocationCallOrder[0]!);
        expect(Math.min(...ttq.mock.invocationCallOrder)).toBeGreaterThan(service.send.mock.invocationCallOrder[0]!);
    });

    it('identifies the sender to TikTok right before the Lead, with the email lowercased and the phone in E.164', async () => {
        acceptPixel();
        const ttq = acceptTikTok();
        const user = userEvent.setup();
        renderForm('no');

        await fill(user);
        await send(user);

        // Only the email and the phone. The name and the message are not sent.
        await waitFor(() =>
            expect(tikTokEvents(ttq)).toEqual([
                ['identify', { email: 'kari@example.no', phone_number: '+4791234567', external_id: '' }],
                ['track', 'Lead'],
            ]),
        );
    });

    it('leaves out a phone number that is not Norwegian', async () => {
        const ttq = acceptTikTok();
        const user = userEvent.setup();
        renderForm('no');

        await fill(user, { phone: '+44 20 7946 0958' });
        await send(user);

        await waitFor(() =>
            expect(tikTokEvents(ttq)).toEqual([
                ['identify', { email: 'kari@example.no', phone_number: '', external_id: '' }],
                ['track', 'Lead'],
            ]),
        );
    });

    it('sends nothing when the API refuses the message', async () => {
        const fbq = acceptPixel();
        const ttq = loadTikTok();
        service.send.mockRejectedValue(new Error('down'));
        const user = userEvent.setup();
        renderForm('no');

        await fill(user);
        await send(user);

        await waitFor(() => expect(service.send).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled());
        expect(events(fbq)).toEqual([]);
        expect(ttq).not.toHaveBeenCalled();
    });

    it('still shows the message as sent when the pixel event throws', async () => {
        acceptPixel();
        pixels.failContact = true;
        const user = userEvent.setup();
        renderForm('no');

        await fill(user);
        await send(user);

        await waitFor(() => expect(toastSpies.success).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled());
        expect(screen.getByLabelText(/^Melding/)).toHaveValue('');
        expect(toastSpies.error).not.toHaveBeenCalled();
    });

    it('sends nothing when validation stops the submit', async () => {
        const fbq = acceptPixel();
        const ttq = loadTikTok();
        const user = userEvent.setup();
        renderForm('no');

        await fill(user, { message: '' });
        await send(user);

        expect(await screen.findByText('Du må fylle ut melding.')).toBeInTheDocument();
        expect(service.send).not.toHaveBeenCalled();
        expect(events(fbq)).toEqual([]);
        expect(ttq).not.toHaveBeenCalled();
    });

    it('sends nothing without consent, even with both pixels loaded', async () => {
        const fbq = loadPixel();
        const ttq = loadTikTok();
        const user = userEvent.setup();
        renderForm('no');

        await fill(user);
        await send(user);

        await waitFor(() => expect(service.send).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled());
        expect(fbq).not.toHaveBeenCalled();
        expect(ttq).not.toHaveBeenCalled();
    });

    it('queues identify before Lead on the real TikTok Pixel mounted after accept', async () => {
        setConsent({ marketing: true, ...CONSENT_OPTIONS });
        const user = userEvent.setup();
        renderForm('no');
        const pixel = render(<TikTokPixel {...CONSENT_OPTIONS} pixelId="C4A1B2C3D4E5F6G7H8I9" />);
        await waitFor(() => expect(Array.isArray((window as Window & { ttq?: unknown }).ttq)).toBe(true));

        await fill(user);
        await send(user);

        const queued = () =>
            ((window as Window & { ttq?: unknown[][] }).ttq ?? []).filter(call => call[0] === 'identify' || call[0] === 'track');
        await waitFor(() =>
            expect(queued()).toEqual([
                ['identify', { email: 'kari@example.no', phone_number: '+4791234567', external_id: '' }],
                ['track', 'Lead'],
            ]),
        );
        pixel.unmount();
    });
});
