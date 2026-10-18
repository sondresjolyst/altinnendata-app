import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import { resetTestMocks } from '@sjolystinnovation/app-kit/testing';
import CheckoutForm from '@/components/shop/CheckoutForm';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { BuildDetail } from '@/services/buildService';
import type { PublicDeliveryOption } from '@/services/shopService';

const service = vi.hoisted(() => ({ checkout: vi.fn() }));
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
            <CheckoutForm build={build} delivery={delivery} mode={mode} locale="no" />
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

    it('shows the field errors of a 400 beside the fields', async () => {
        const user = userEvent.setup();
        service.checkout.mockRejectedValue(await refused(400, { errors: { Phone: ['Use a Norwegian mobile number.'] } }));
        renderForm();

        await fillContact(user);
        await user.click(screen.getByRole('radio', { name: /Henting i Lye/ }));
        await user.click(screen.getByRole('checkbox', { name: /Jeg godtar salgsvilkårene/ }));
        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        expect(await screen.findByText('Use a Norwegian mobile number.')).toBeInTheDocument();
    });

    it('shows that the shop is not open to a visitor in AdminsOnly mode', () => {
        session.roles = [];
        renderForm();

        expect(screen.getByText('Kjøp er ikke åpnet ennå.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Betal med Vipps' })).not.toBeInTheDocument();
    });
});
