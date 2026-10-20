import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import { resetTestMocks } from '@sjolystinnovation/app-kit/testing';
import PayLinkButton from '@/components/shop/PayLinkButton';

const service = vi.hoisted(() => ({ payWithLink: vi.fn() }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('@/services/shopService', () => ({ default: service }));

const refused = (status: number, data: object) =>
    request(
        () => Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, data } })),
        'Failed',
    ).catch((e: unknown) => e);

const token = 'a'.repeat(43);

beforeEach(() => {
    resetTestMocks();
    service.payWithLink.mockReset();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('the pay link button', () => {
    it('shows the official Vipps button, starts the payment and sends the buyer to Vipps', async () => {
        const assign = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign });
        service.payWithLink.mockResolvedValue({ redirectUrl: 'https://vipps.test/pay', token: 'status-token' });
        const user = userEvent.setup();
        render(<PayLinkButton token={token} locale="no" />);

        const button = screen.getByRole('button', { name: 'Betal med Vipps' });
        expect(button.querySelector('img')).toHaveAttribute('src', '/vipps/betal-med-vipps.svg');
        await user.click(button);

        expect(service.payWithLink).toHaveBeenCalledWith(token);
        await waitFor(() => expect(assign).toHaveBeenCalledWith('https://vipps.test/pay'));
        expect(button).toBeDisabled();
    });

    it.each([
        [409, 'paymentInProgress', 'Betalingen er allerede startet. Fullfør den i Vipps, eller prøv igjen om noen minutter.'],
        [409, 'wrongStatus', 'Ordren er allerede betalt.'],
        [502, 'paymentProviderUnavailable', 'Vi får ikke kontakt med Vipps akkurat nå. Prøv igjen om litt.'],
    ])('shows the %s %s text and lets the buyer try again', async (status, code, message) => {
        service.payWithLink.mockRejectedValue(await refused(status, { message: 'No', code }));
        const user = userEvent.setup();
        render(<PayLinkButton token={token} locale="no" />);

        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        expect(await screen.findByText(message)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Betal med Vipps' })).toBeEnabled();
        expect(screen.queryByRole('link', { name: 'Kontakt oss' })).not.toBeInTheDocument();
    });

    it('turns the button off with the contact link when the link is no longer valid', async () => {
        service.payWithLink.mockRejectedValue(await refused(404, { message: 'No', code: 'paymentLinkInvalid' }));
        const user = userEvent.setup();
        render(<PayLinkButton token={token} locale="no" />);

        await user.click(screen.getByRole('button', { name: 'Betal med Vipps' }));

        expect(await screen.findByText('Lenken er ikke gyldig lenger. Ta kontakt med oss.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Kontakt oss' })).toHaveAttribute('href', '/no/contact');
        expect(screen.getByRole('button', { name: 'Betal med Vipps' })).toBeDisabled();
    });

    it('falls back to the general text for an unknown failure', async () => {
        service.payWithLink.mockRejectedValue(new Error('Network Error'));
        const user = userEvent.setup();
        render(<PayLinkButton token={token} locale="en" />);

        await user.click(screen.getByRole('button', { name: 'Pay with Vipps' }));

        expect(await screen.findByText('The payment could not be started. Try again, or get in touch.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Pay with Vipps' })).toBeEnabled();
    });
});
