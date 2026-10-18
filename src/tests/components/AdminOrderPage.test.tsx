import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Suspense } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import { resetTestMocks, toastSpies } from '@sjolystinnovation/app-kit/testing';
import AdminOrderPage from '@/app/[locale]/(protected)/admin/shop/orders/[id]/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { AdminOrder } from '@/services/shopService';

const service = vi.hoisted(() => ({ getOrder: vi.fn(), capture: vi.fn(), cancel: vi.fn(), refund: vi.fn(), setInvoiceNumber: vi.fn() }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('next/navigation', async () => (await import('@sjolystinnovation/app-kit/testing')).nextNavigationMock());
vi.mock('@/services/shopService', () => ({ default: service }));

const reserved: AdminOrder = {
    id: 7,
    reference: 'ref-7',
    status: 'Reserved',
    locale: 'no',
    buyerName: 'Kari Nordmann',
    buyerEmail: 'kari@example.no',
    buyerPhone: '+4791234567',
    streetAddress: 'Storgata 1',
    postalCode: '0155',
    city: 'Oslo',
    deliveryMethod: 'Shipping',
    deliveryLabel: 'Sending',
    deliveryPriceInOre: 30000,
    withinDistanceConfirmed: false,
    pickupNote: null,
    pcBuildId: 3,
    buildTitle: 'Spillmaskin',
    buildSlug: 'spillmaskin',
    buildPriceInOre: 999000,
    totalInOre: 1299000,
    capturedInOre: 0,
    refundedInOre: 0,
    isTest: false,
    captureGuaranteedUntil: '2099-01-01T00:00:00Z',
    invoiceNumber: null,
    termsAcceptedAt: '2026-10-18T10:00:00Z',
    authorizedAt: '2026-10-18T10:05:00Z',
    capturedAt: null,
    cancelledAt: null,
    refundedAt: null,
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-18T10:05:00Z',
};

const paid: AdminOrder = { ...reserved, status: 'Paid', capturedInOre: 1299000, capturedAt: '2026-10-20T08:00:00Z' };

// The Error that the shop service throws for an API refusal.
const refused = (status: number, data: object) =>
    request(
        () => Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, data } })),
        'Failed',
    ).catch((e: unknown) => e);

// A promise that React's use() reads without suspending.
const settled = <T,>(value: T) => Object.assign(Promise.resolve(value), { status: 'fulfilled' as const, value });

const renderPage = () =>
    render(
        <DictionaryProvider locale="no">
            <Suspense fallback={null}>
                <AdminOrderPage params={settled({ id: '7' })} />
            </Suspense>
        </DictionaryProvider>,
    );

describe('the admin order page', () => {
    beforeEach(() => {
        resetTestMocks();
        for (const fn of Object.values(service)) fn.mockReset();
    });

    it('shows Ta betalt and Kanseller only for a reserved order, Betal tilbake only for a paid one', async () => {
        service.getOrder.mockResolvedValue(reserved);
        const first = renderPage();
        expect(await screen.findByRole('button', { name: 'Ta betalt' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kanseller' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Betal tilbake' })).not.toBeInTheDocument();
        first.unmount();

        service.getOrder.mockResolvedValue(paid);
        renderPage();
        expect(await screen.findByRole('button', { name: 'Betal tilbake' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Ta betalt' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Kanseller' })).not.toBeInTheDocument();
    });

    it('links to the build page', async () => {
        service.getOrder.mockResolvedValue(reserved);
        renderPage();

        expect(await screen.findByRole('link', { name: 'Se datamaskinen' })).toHaveAttribute('href', '/no/builds/spillmaskin');
    });

    it('copies the total as 12990,00', async () => {
        service.getOrder.mockResolvedValue(reserved);
        const user = userEvent.setup();
        const writeText = vi.spyOn(navigator.clipboard, 'writeText');
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Kopier Sum' }));

        expect(writeText).toHaveBeenCalledWith('12990,00');
        expect(toastSpies.success).toHaveBeenCalledWith('Kopiert');
    });

    it('captures after confirming and shows the paid status', async () => {
        service.getOrder.mockResolvedValue(reserved);
        service.capture.mockResolvedValue(paid);
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Ta betalt' }));
        expect(service.capture).not.toHaveBeenCalled();

        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ta betalt' }));

        await waitFor(() => expect(service.capture).toHaveBeenCalledWith(7));
        expect(await screen.findByRole('button', { name: 'Betal tilbake' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getAllByText('Betalt').length).toBeGreaterThan(0);
    });

    it('does nothing when the confirm dialog is cancelled', async () => {
        service.getOrder.mockResolvedValue(reserved);
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Kanseller' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avbryt' }));

        expect(service.cancel).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('saves the invoice number', async () => {
        service.getOrder.mockResolvedValue(paid);
        service.setInvoiceNumber.mockResolvedValue({ ...paid, invoiceNumber: 'F-1001' });
        const user = userEvent.setup();
        renderPage();

        await user.type(await screen.findByLabelText('Fakturanummer'), ' F-1001 ');
        await user.click(screen.getByRole('button', { name: 'Lagre' }));

        await waitFor(() => expect(service.setInvoiceNumber).toHaveBeenCalledWith(7, 'F-1001'));
        expect(toastSpies.success).toHaveBeenCalledWith('Fakturanummeret er lagret');
    });

    it('shows the wrongStatus text when the API answers 409', async () => {
        service.getOrder.mockResolvedValue(reserved);
        service.capture.mockRejectedValue(await refused(409, { message: 'Wrong status', code: 'wrongStatus' }));
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Ta betalt' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ta betalt' }));

        await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith('Ordren har endret status. Last siden på nytt.'));
        expect(screen.getByRole('button', { name: 'Ta betalt' })).toBeInTheDocument();
    });
});
