import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import { resetTestMocks } from '@sjolystinnovation/app-kit/testing';
import CheckoutForm from '@/components/shop/CheckoutForm';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { BuildDetail } from '@/services/buildService';
import type { PublicDeliveryOption } from '@/services/shopService';

const service = vi.hoisted(() => ({ checkout: vi.fn(), config: vi.fn() }));
const session = vi.hoisted(() => ({ roles: ['Admin'] as string[] }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('@/services/shopService', () => ({ default: service }));
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
});
