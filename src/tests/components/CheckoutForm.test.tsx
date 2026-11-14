import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import { TikTokPixel, setConsent } from '@sjolystinnovation/app-kit/consent';
import { resetTestMocks } from '@sjolystinnovation/app-kit/testing';
import CheckoutForm from '@/components/shop/CheckoutForm';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { CONSENT_OPTIONS } from '@/lib/consent';
import type { BuildDetail } from '@/services/buildService';
import type { PublicDeliveryOption } from '@/services/shopService';
import { acceptPixel, events, loadPixel, loadTikTok, resetPixel, tikTokEvents } from '../pixel';

const service = vi.hoisted(() => ({ checkout: vi.fn(), config: vi.fn() }));
const session = vi.hoisted(() => ({ roles: ['Admin'] as string[] }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('@/services/shopService', () => ({ default: service }));
vi.mock('next/navigation', async importActual => ({
    ...(await importActual<typeof import('next/navigation')>()),
    usePathname: () => '/no/builds/gaming-pc/buy',
}));
vi.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { roles: session.roles } }, status: 'authenticated' }),
}));

const build = { slug: 'gaming-pc', title: 'Gaming PC', priceNok: 9990, availability: 'Available', published: true } as BuildDetail;

const delivery: PublicDeliveryOption[] = [
    { method: 'Shipping', priceNok: 300, label: 'Sending', description: 'Sendes med Posten', maxDistanceKm: null },
    { method: 'HomeDelivery', priceNok: 100, label: 'Levering hjem', description: null, maxDistanceKm: 30 },
    { method: 'Pickup', priceNok: 0, label: 'Henting i Lye', description: null, maxDistanceKm: null },
];

const renderForm = (mode: 'AdminsOnly' | 'Everyone' | 'Off' = 'AdminsOnly') =>
    render(
        <DictionaryProvider locale="no">
            <CheckoutForm build={build} delivery={delivery} mode={mode} termsVersion="2026-10-19T12:00:00.000000Z" locale="no" />
        </DictionaryProvider>,
    );

const refused = (status: number, data: object) =>
    request(
        () => Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, data } })),
        'Failed',
    ).catch((e: unknown) => e);

const fillContact = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText(/Navn/), 'Kari Nordmann');
    await user.type(screen.getByLabelText(/E-post/), 'kari@example.no');
    await user.type(screen.getByLabelText(/Mobilnummer/), '912 34 567');
};

beforeEach(() => {
    resetTestMocks();
    service.checkout.mockReset();
    service.config.mockReset();
    session.roles = ['Admin'];
});

describe('CheckoutForm', () => {
    it('asks for the address only for shipping and home delivery', async () => {
        const user = userEvent.setup();
        renderForm();

        // Shipping is the first enabled option and is selected at the start.
        expect(screen.getByLabelText(/Gateadresse/)).toBeInTheDocument();
        expect(screen.queryByLabelText(/Når passer det å hente/)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/innenfor 30 km/)).not.toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: /Levering hjem/ }));
        expect(screen.getByLabelText(/Postnummer/)).toBeInTheDocument();
        expect(screen.getByLabelText('Adressen er innenfor 30 km fra oss')).toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: /Henting i Lye/ }));
        expect(screen.queryByLabelText(/Gateadresse/)).not.toBeInTheDocument();
        expect(screen.getByLabelText(/Når passer det å hente/)).toBeInTheDocument();
        expect(screen.getByText('Vi avtaler tidspunkt etterpå.')).toBeInTheDocument();
    });

    it('shows Du må fylle ut navn. and Du må godta salgsvilkårene. on an empty submit', async () => {
        const user = userEvent.setup();
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        expect(screen.getByText('Du må fylle ut navn.')).toBeInTheDocument();
        expect(screen.getByText('Du må godta salgsvilkårene.')).toBeInTheDocument();
        expect(service.checkout).not.toHaveBeenCalled();
    });

    it('rejects a phone number that is not Norwegian', async () => {
        const user = userEvent.setup();
        renderForm();

        await user.type(screen.getByLabelText(/Mobilnummer/), '0701234567');
        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        expect(screen.getByText('Skriv inn et norsk mobilnummer.')).toBeInTheDocument();
    });

    it('asks to confirm the distance for home delivery', async () => {
        const user = userEvent.setup();
        renderForm();

        await user.click(screen.getByRole('radio', { name: /Levering hjem/ }));
        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        expect(screen.getByText('Du må bekrefte at adressen er innenfor 30 km.')).toBeInTheDocument();
    });

    it('adds the delivery price to the total', async () => {
        const user = userEvent.setup();
        renderForm();

        expect(screen.getByTestId('total')).toHaveTextContent(/10\s?290/);

        await user.click(screen.getByRole('radio', { name: /Henting i Lye/ }));
        expect(screen.getByTestId('total')).toHaveTextContent(/9\s?990/);
    });

    it('sends the form and goes to Vipps', async () => {
        const user = userEvent.setup();
        const assign = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign });
        service.checkout.mockResolvedValue({ redirectUrl: 'https://vipps.test/pay', token: 'abc' });
        renderForm();

        await fillContact(user);
        await user.type(screen.getByLabelText(/Gateadresse/), 'Storgata 1');
        await user.type(screen.getByLabelText(/Postnummer/), '4347');
        await user.type(screen.getByLabelText(/Sted/), 'Lye');
        await user.click(screen.getByRole('checkbox', { name: /Jeg godtar salgsvilkårene/ }));
        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        await waitFor(() => expect(assign).toHaveBeenCalledWith('https://vipps.test/pay'));
        expect(service.checkout).toHaveBeenCalledWith({
            buildSlug: 'gaming-pc',
            deliveryMethod: 'Shipping',
            name: 'Kari Nordmann',
            email: 'kari@example.no',
            phone: '912 34 567',
            streetAddress: 'Storgata 1',
            postalCode: '4347',
            city: 'Lye',
            withinDistance: false,
            pickupNote: null,
            acceptTerms: true,
            termsVersion: '2026-10-19T12:00:00.000000Z',
            locale: 'no',
        });
        vi.unstubAllGlobals();
    });

    const submitShipping = async (user: ReturnType<typeof userEvent.setup>) => {
        await fillContact(user);
        await user.type(screen.getByLabelText(/Gateadresse/), 'Storgata 1');
        await user.type(screen.getByLabelText(/Postnummer/), '4347');
        await user.type(screen.getByLabelText(/Sted/), 'Lye');
        await user.click(screen.getByRole('checkbox', { name: /Jeg godtar salgsvilkårene/ }));
        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));
    };

    it('sends a Meta Pixel InitiateCheckout with the total including delivery before the checkout call', async () => {
        resetPixel();
        const fbq = acceptPixel();
        const user = userEvent.setup();
        const assign = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign });
        service.checkout.mockResolvedValue({ redirectUrl: 'https://vipps.test/pay', token: 'abc' });
        renderForm();

        await submitShipping(user);

        await waitFor(() => expect(assign).toHaveBeenCalled());
        expect(events(fbq)).toEqual([
            ['track', 'InitiateCheckout', { content_ids: ['gaming-pc'], content_type: 'product', num_items: 1, value: 10290, currency: 'NOK' }],
        ]);
        expect(fbq.mock.invocationCallOrder[0]).toBeLessThan(service.checkout.mock.invocationCallOrder[0]);
        vi.unstubAllGlobals();
        resetPixel();
    }, 15_000);

    it('identifies the buyer to TikTok right before a TikTok InitiateCheckout, and both before the checkout call', async () => {
        resetPixel();
        const fbq = acceptPixel();
        const ttq = loadTikTok();
        const user = userEvent.setup();
        const assign = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign });
        service.checkout.mockResolvedValue({ redirectUrl: 'https://vipps.test/pay', token: 'abc' });
        renderForm();

        await submitShipping(user);

        await waitFor(() => expect(assign).toHaveBeenCalled());
        // Only the email and the phone in E.164. The name and the address are not sent.
        expect(tikTokEvents(ttq)).toEqual([
            ['identify', { email: 'kari@example.no', phone_number: '+4791234567', external_id: '' }],
            ['track', 'InitiateCheckout', {
                contents: [{ content_id: 'gaming-pc', quantity: 1, price: 9990 }],
                content_type: 'product',
                value: 10290,
                currency: 'NOK',
            }],
        ]);
        const identifyOrder = ttq.mock.invocationCallOrder[ttq.mock.calls.findIndex(call => call[0] === 'identify')]!;
        expect(identifyOrder).toBeLessThan(ttq.mock.invocationCallOrder[ttq.mock.calls.findIndex(call => call[0] === 'track')]!);
        expect(identifyOrder).toBeLessThan(fbq.mock.invocationCallOrder[0]!);
        expect(Math.max(...ttq.mock.invocationCallOrder)).toBeLessThan(service.checkout.mock.invocationCallOrder[0]!);
        vi.unstubAllGlobals();
        resetPixel();
    }, 15_000);

    it('sends nothing to TikTok without consent', async () => {
        resetPixel();
        const ttq = loadTikTok();
        const user = userEvent.setup();
        const assign = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign });
        service.checkout.mockResolvedValueOnce({ redirectUrl: 'https://vipps.test/pay', token: 'abc' });
        renderForm();

        await submitShipping(user);

        await waitFor(() => expect(assign).toHaveBeenCalled());
        expect(ttq).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
        resetPixel();
    }, 15_000);

    /** The calls the real TikTok Pixel queued on its ttq array, without consent and page calls. */
    const queued = () =>
        ((window as Window & { ttq?: unknown[][] }).ttq ?? []).filter(call => call[0] === 'identify' || call[0] === 'track');

    it('queues identify before InitiateCheckout on the real TikTok Pixel mounted after accept', async () => {
        resetPixel();
        const user = userEvent.setup();
        const assign = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign });
        service.checkout.mockResolvedValueOnce({ redirectUrl: 'https://vipps.test/pay', token: 'abc' });
        setConsent({ marketing: true, ...CONSENT_OPTIONS });
        renderForm();
        const pixel = render(<TikTokPixel {...CONSENT_OPTIONS} pixelId="C4A1B2C3D4E5F6G7H8I9" />);
        await waitFor(() => expect(Array.isArray((window as Window & { ttq?: unknown }).ttq)).toBe(true));

        await submitShipping(user);

        await waitFor(() => expect(assign).toHaveBeenCalled());
        expect(queued()).toEqual([
            ['identify', { email: 'kari@example.no', phone_number: '+4791234567', external_id: '' }],
            ['track', 'InitiateCheckout', expect.objectContaining({ value: 10290, currency: 'NOK' })],
        ]);
        pixel.unmount();
        vi.unstubAllGlobals();
        resetPixel();
    }, 15_000);

    it('sends no identify and no track once the TikTok Pixel has unmounted', async () => {
        resetPixel();
        const user = userEvent.setup();
        const assign = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign });
        service.checkout.mockResolvedValueOnce({ redirectUrl: 'https://vipps.test/pay', token: 'abc' });
        setConsent({ marketing: true, ...CONSENT_OPTIONS });
        renderForm();
        const pixel = render(<TikTokPixel {...CONSENT_OPTIONS} pixelId="C4A1B2C3D4E5F6G7H8I9" />);
        await waitFor(() => expect(Array.isArray((window as Window & { ttq?: unknown }).ttq)).toBe(true));
        pixel.unmount();
        await act(async () => { await Promise.resolve(); });

        await submitShipping(user);

        await waitFor(() => expect(assign).toHaveBeenCalled());
        expect(queued()).toEqual([]);
        vi.unstubAllGlobals();
        resetPixel();
    }, 15_000);

    it('sends no InitiateCheckout without consent', async () => {
        resetPixel();
        const fbq = loadPixel();
        const user = userEvent.setup();
        const assign = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign });
        service.checkout.mockResolvedValueOnce({ redirectUrl: 'https://vipps.test/pay', token: 'abc' });
        renderForm();

        await submitShipping(user);

        await waitFor(() => expect(assign).toHaveBeenCalled());
        expect(fbq).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
        resetPixel();
    }, 15_000);

    it('sends no InitiateCheckout when client validation stops the submit', async () => {
        resetPixel();
        const fbq = acceptPixel();
        const user = userEvent.setup();
        renderForm();

        await fillContact(user);
        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        expect(await screen.findByText('Du må godta salgsvilkårene.')).toBeInTheDocument();
        expect(service.checkout).not.toHaveBeenCalled();
        expect(events(fbq)).toEqual([]);
        resetPixel();
    }, 15_000);

    it('shows the unavailable text on 409 buildUnavailable', async () => {
        const user = userEvent.setup();
        service.checkout.mockRejectedValue(await refused(409, { message: 'x', code: 'buildUnavailable' }));
        renderForm();

        await fillContact(user);
        await user.click(screen.getByRole('radio', { name: /Henting i Lye/ }));
        await user.click(screen.getByRole('checkbox', { name: /Jeg godtar salgsvilkårene/ }));
        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        expect(await screen.findByText('Datamaskinen er ikke lenger tilgjengelig. Noen andre har kjøpt eller reservert den.')).toBeInTheDocument();
    });

    const submitPickup = async (user: ReturnType<typeof userEvent.setup>) => {
        await fillContact(user);
        await user.click(screen.getByRole('radio', { name: /Henting i Lye/ }));
        await user.click(screen.getByRole('checkbox', { name: /Jeg godtar salgsvilkårene/ }));
        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));
    };

    it('shows the Norwegian text beside the field for a 400 field error, not the API English', async () => {
        const user = userEvent.setup();
        service.checkout.mockRejectedValue(await refused(400, { errors: { Phone: ['Use a Norwegian mobile number.'] } }));
        renderForm();
        await submitPickup(user);

        expect(await screen.findByText('Skriv inn et norsk mobilnummer.')).toBeInTheDocument();
        expect(screen.queryByText('Use a Norwegian mobile number.')).not.toBeInTheDocument();
        expect(screen.queryByText('Betalingen kunne ikke startes. Prøv igjen, eller ta kontakt.')).not.toBeInTheDocument();
    });

    it('says the field is too long when the API refuses a filled-in field on length', async () => {
        const user = userEvent.setup();
        service.checkout.mockRejectedValue(await refused(400, { errors: { Name: ['Use 120 characters or fewer.'] } }));
        renderForm();
        await submitPickup(user);

        expect(await screen.findByText('Bruk 120 eller færre tegn.')).toBeInTheDocument();
    });

    it('says the terms must be accepted when the API refuses AcceptTerms', async () => {
        const user = userEvent.setup();
        service.checkout.mockRejectedValue(await refused(400, { errors: { AcceptTerms: ['Accept the terms.'] } }));
        renderForm();
        await submitPickup(user);

        expect(await screen.findByText('Du må godta salgsvilkårene.')).toBeInTheDocument();
    });

    it.each([
        ['BuildSlug', 'The build slug is required.'],
        ['DeliveryMethod', 'Choose a delivery method.'],
        ['StreetAddress', 'Enter the street address.'],
    ])('shows the generic failed text when the only error is on %s, which has no field on screen', async (key, message) => {
        const user = userEvent.setup();
        service.checkout.mockRejectedValue(await refused(400, { errors: { [key]: [message] } }));
        renderForm();
        await submitPickup(user);

        expect(await screen.findByText('Betalingen kunne ikke startes. Prøv igjen, eller ta kontakt.')).toBeInTheDocument();
        expect(screen.queryByText(message)).not.toBeInTheDocument();
    });

    it('unticks the terms and says they changed on 409 termsChanged, then sends the new version', async () => {
        const user = userEvent.setup();
        vi.stubGlobal('location', { ...window.location, assign: vi.fn() });
        service.checkout.mockRejectedValueOnce(await refused(409, { message: 'x', code: 'termsChanged' }));
        service.config.mockResolvedValue({ buyButton: 'AdminsOnly', delivery, termsVersion: '2026-10-20T08:00:00.000000Z' });
        renderForm();
        await submitPickup(user);

        expect(await screen.findByText('Vilkårene er endret. Les dem på nytt og godta før du betaler.')).toBeInTheDocument();
        const terms = screen.getByRole('checkbox', { name: /Jeg godtar salgsvilkårene/ });
        expect(terms).not.toBeChecked();
        expect(service.config).toHaveBeenCalledWith('no');

        service.checkout.mockResolvedValue({ redirectUrl: 'https://vipps.test/pay', token: 'abc' });
        await user.click(terms);
        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        await waitFor(() => expect(service.checkout).toHaveBeenCalledTimes(2));
        expect(service.checkout.mock.calls[0][0].termsVersion).toBe('2026-10-19T12:00:00.000000Z');
        expect(service.checkout.mock.calls[1][0].termsVersion).toBe('2026-10-20T08:00:00.000000Z');
        vi.unstubAllGlobals();
    });

    it('shows the failed text on a 502 from the payment provider', async () => {
        const user = userEvent.setup();
        service.checkout.mockRejectedValue(await refused(502, { message: 'Bad gateway', code: 'paymentProviderUnavailable' }));
        renderForm();
        await submitPickup(user);

        expect(await screen.findByText('Vipps svarer ikke. Prøv igjen om litt.')).toBeInTheDocument();
    });

    it('enables the form again when the page comes back from the bfcache after Vipps', async () => {
        const user = userEvent.setup();
        vi.stubGlobal('location', { ...window.location, assign: vi.fn() });
        service.checkout.mockResolvedValue({ redirectUrl: 'https://vipps.test/pay', token: 'abc' });
        renderForm();
        await submitPickup(user);
        await waitFor(() => expect(screen.getByRole('button', { name: 'Betal med Vipps' })).toBeDisabled());
        expect(screen.getByRole('button', { name: 'Betal med Vipps' })).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByRole('status')).toHaveTextContent('Går til Vipps…');

        act(() => { window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true })); });

        expect(screen.getByRole('button', { name: 'Betal med Vipps' })).toBeEnabled();
        expect(screen.getByRole('status')).toBeEmptyDOMElement();
        vi.unstubAllGlobals();
    });

    it.each([
        ['no', 'Betal med Vipps', '/vipps/betal-med-vipps.svg'],
        ['en', 'Pay with Vipps', '/vipps/pay-with-vipps.svg'],
    ] as const)('submits with the official Vipps artwork in %s', (locale, name, src) => {
        render(
            <DictionaryProvider locale={locale}>
                <CheckoutForm build={build} delivery={delivery} mode="Everyone" termsVersion="none" locale={locale} />
            </DictionaryProvider>,
        );

        const button = screen.getByRole('button', { name });
        expect(button).toHaveAttribute('type', 'submit');
        expect(button.querySelector('img')).toHaveAttribute('src', src);
    });

    it.each([
        ['no', 'Vi leverer bare i Norge. Les også personvernerklæringen.', 'personvernerklæringen', '/no/privacy'],
        ['en', 'We only deliver in Norway. Also read the privacy notice.', 'privacy notice', '/en/privacy'],
    ] as const)('says where it delivers and links the privacy notice under the terms in %s', (locale, note, link, href) => {
        render(
            <DictionaryProvider locale={locale}>
                <CheckoutForm build={build} delivery={delivery} mode="Everyone" termsVersion="none" locale={locale} />
            </DictionaryProvider>,
        );

        const privacy = screen.getByRole('link', { name: link });
        expect(privacy).toHaveAttribute('href', href);
        expect(privacy.closest('p')).toHaveTextContent(note);
    });

    it('links the checkbox errors to their checkboxes', async () => {
        const user = userEvent.setup();
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        expect(screen.getByRole('checkbox', { name: /Jeg godtar salgsvilkårene/ })).toHaveAccessibleDescription('Du må godta salgsvilkårene.');
    });

    it('links the distance error to its checkbox', async () => {
        const user = userEvent.setup();
        renderForm();

        await user.click(screen.getByRole('radio', { name: /Levering hjem/ }));
        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        expect(screen.getByLabelText('Adressen er innenfor 30 km fra oss')).toHaveAccessibleDescription('Du må bekrefte at adressen er innenfor 30 km.');
    });

    it('moves focus to the first field with an error after a failed submit', async () => {
        const user = userEvent.setup();
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        expect(screen.getByLabelText(/Navn/)).toHaveFocus();
    });

    it('shows that the shop is not open to a visitor in AdminsOnly mode', () => {
        session.roles = [];
        renderForm();

        expect(screen.getByText('Kjøp er ikke åpnet ennå.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Betal med Vipps' })).not.toBeInTheDocument();
    });

    describe('the marketing data for the server Purchase event', () => {
        const PAGE = 'https://www.altinnendata.no/no/builds/gaming-pc/buy?ttclid=E.C.P.click&email=kari%40example.no#betal';
        const COOKIES = ['_fbp', '_fbc', '_ttp', 'ttclid'];

        const setCookies = (cookies: Record<string, string>) => {
            for (const [name, value] of Object.entries(cookies)) document.cookie = `${name}=${value}; path=/`;
        };

        afterEach(() => {
            for (const name of COOKIES) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            vi.unstubAllGlobals();
            resetPixel();
        });

        /** Submits a filled shipping order from `href` and gives what went to ShopService.checkout. */
        const checkoutFrom = async (href = PAGE) => {
            const user = userEvent.setup();
            const assign = vi.fn();
            vi.stubGlobal('location', { ...window.location, href, assign });
            service.checkout.mockResolvedValueOnce({ redirectUrl: 'https://vipps.test/pay', token: 'abc' });
            renderForm();
            await submitShipping(user);
            await waitFor(() => expect(assign).toHaveBeenCalled());
            return service.checkout.mock.calls[0]![0] as Record<string, unknown>;
        };

        const noNulls = (value: unknown): boolean =>
            value !== null && (typeof value !== 'object' || Object.values(value as object).every(noNulls));

        it('sends the consent ID, the ad cookies and the page without its query with consent', async () => {
            const { consentId } = setConsent({ marketing: true, ...CONSENT_OPTIONS });
            setCookies({ _fbp: 'fb.1.1700000000000.123456789', _fbc: 'fb.1.1700000000000.IwAR0abc', _ttp: 'ttp-abc_123', ttclid: 'E.C.P.click' });

            const sent = await checkoutFrom();

            expect(sent.marketing).toEqual({
                consentId,
                fbp: 'fb.1.1700000000000.123456789',
                fbc: 'fb.1.1700000000000.IwAR0abc',
                ttp: 'ttp-abc_123',
                ttclid: 'E.C.P.click',
                pageUrl: 'https://www.altinnendata.no/no/builds/gaming-pc/buy',
            });
            expect(sent).toMatchObject({ buildSlug: 'gaming-pc', email: 'kari@example.no' });
        }, 15_000);

        it('keeps the query, the click ID and the email out of the page URL', async () => {
            setConsent({ marketing: true, ...CONSENT_OPTIONS });

            const sent = await checkoutFrom();

            const { pageUrl } = sent.marketing as { pageUrl: string };
            expect(pageUrl).toBe('https://www.altinnendata.no/no/builds/gaming-pc/buy');
            expect(pageUrl).not.toContain('?');
            expect(pageUrl).not.toContain('ttclid');
            expect(pageUrl).not.toContain('kari');
        }, 15_000);

        it.each([
            ['the visitor declined marketing', () => setConsent({ marketing: false, ...CONSENT_OPTIONS })],
            ['the visitor has made no choice', () => window.localStorage.clear()],
            ['the choice was made for an older notice', () => setConsent({ marketing: true, noticeVersion: 'older-notice' })],
        ])('sends no marketing key when %s', async (_, choose) => {
            choose();
            setCookies({ _fbp: 'fb.1.1700000000000.123456789', _ttp: 'ttp-abc_123' });

            const sent = await checkoutFrom();

            expect(sent).not.toHaveProperty('marketing');
        }, 15_000);

        it('sends no marketing key when the yes is older than the consent max age', async () => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date(Date.now() - 366 * 24 * 60 * 60 * 1000));
            setConsent({ marketing: true, ...CONSENT_OPTIONS });
            vi.useRealTimers();
            setCookies({ _fbp: 'fb.1.1700000000000.123456789' });

            const sent = await checkoutFrom();

            expect(sent).not.toHaveProperty('marketing');
        }, 15_000);

        it('sends no marketing key when the visitor said yes and then no', async () => {
            setConsent({ marketing: true, ...CONSENT_OPTIONS });
            setConsent({ marketing: false, ...CONSENT_OPTIONS });
            setCookies({ _fbp: 'fb.1.1700000000000.123456789' });

            const sent = await checkoutFrom();

            expect(sent).not.toHaveProperty('marketing');
        }, 15_000);

        // The yes holds in memory for this page when storage is blocked. The banner posted it to the consent log,
        // and the API checks that log, so the checkout still sends it.
        it('sends the marketing data for a yes that only holds in memory because storage is blocked', async () => {
            const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('blocked');
            });
            const { consentId } = setConsent({ marketing: true, ...CONSENT_OPTIONS });
            setItem.mockRestore();
            setCookies({ _ttp: 'ttp-abc_123' });

            const sent = await checkoutFrom();

            expect(sent.marketing).toEqual({ consentId, ttp: 'ttp-abc_123', pageUrl: 'https://www.altinnendata.no/no/builds/gaming-pc/buy' });
        }, 15_000);

        it('leaves out an https page on another host and keeps the rest', async () => {
            const { consentId } = setConsent({ marketing: true, ...CONSENT_OPTIONS });
            setCookies({ _fbp: 'fb.1.1700000000000.123456789' });

            const sent = await checkoutFrom('https://evil.example/no/builds/gaming-pc/buy');

            expect(sent.marketing).toEqual({ consentId, fbp: 'fb.1.1700000000000.123456789' });
        }, 15_000);

        it('leaves out a cookie over the limit and keeps the rest', async () => {
            const { consentId } = setConsent({ marketing: true, ...CONSENT_OPTIONS });
            setCookies({ _fbp: 'a'.repeat(257), _ttp: 'ttp-abc_123', ttclid: 'b'.repeat(1001) });

            const sent = await checkoutFrom();

            expect(sent.marketing).toEqual({ consentId, ttp: 'ttp-abc_123', pageUrl: 'https://www.altinnendata.no/no/builds/gaming-pc/buy' });
        }, 15_000);

        it('leaves out a missing cookie and a page off the site, and never sends null', async () => {
            const { consentId } = setConsent({ marketing: true, ...CONSENT_OPTIONS });

            const sent = await checkoutFrom('http://localhost:3000/no/builds/gaming-pc/buy');

            expect(sent.marketing).toEqual({ consentId });
            expect(noNulls(sent.marketing)).toBe(true);
            expect(Object.values(sent.marketing as object).every(value => typeof value === 'string')).toBe(true);
        }, 15_000);

        it('does not build fbc from an fbclid on the page', async () => {
            const { consentId } = setConsent({ marketing: true, ...CONSENT_OPTIONS });
            setCookies({ _fbp: 'fb.1.1700000000000.123456789' });

            const sent = await checkoutFrom('https://www.altinnendata.no/no/builds/gaming-pc/buy?fbclid=IwAR0abc');

            expect(sent.marketing).toEqual({ consentId, fbp: 'fb.1.1700000000000.123456789', pageUrl: 'https://www.altinnendata.no/no/builds/gaming-pc/buy' });
        }, 15_000);
    });
});
