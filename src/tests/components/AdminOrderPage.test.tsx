import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrictMode, Suspense } from 'react';
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
    buyerPhone: '4791234567',
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

const renderPage = (strict = false) => {
    const page = (
        <DictionaryProvider locale="no">
            <Suspense fallback={null}>
                <AdminOrderPage params={settled({ id: '7' })} />
            </Suspense>
        </DictionaryProvider>
    );
    return render(strict ? <StrictMode>{page}</StrictMode> : page);
};

describe('the admin order page', () => {
    beforeEach(() => {
        resetTestMocks();
        for (const fn of Object.values(service)) fn.mockReset();
    });

    it('shows Trekk beløpet and Kanseller only for a reserved order, Betal tilbake only for a paid one', async () => {
        service.getOrder.mockResolvedValue(reserved);
        const first = renderPage();
        expect(await screen.findByRole('button', { name: 'Trekk beløpet' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kanseller' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Betal tilbake' })).not.toBeInTheDocument();
        first.unmount();

        service.getOrder.mockResolvedValue(paid);
        renderPage();
        expect(await screen.findByRole('button', { name: 'Betal tilbake' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Trekk beløpet' })).not.toBeInTheDocument();
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

        await user.click(await screen.findByRole('button', { name: 'Trekk beløpet' }));
        expect(service.capture).not.toHaveBeenCalled();

        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Trekk beløpet' }));

        await waitFor(() => expect(service.capture).toHaveBeenCalledWith(7));
        expect(await screen.findByRole('button', { name: 'Betal tilbake' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getAllByText('Betalt').length).toBeGreaterThan(0);
    });

    it('asks Trekk beløpet fra kundens Vipps in the capture dialog', async () => {
        service.getOrder.mockResolvedValue(reserved);
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Trekk beløpet' }));

        expect(within(screen.getByRole('dialog')).getByRole('heading', { name: /^Trekk .*12\s990.* fra kundens Vipps\?$/ })).toBeInTheDocument();
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

    it('moves focus into the confirm dialog, closes it on Escape and gives focus back', async () => {
        service.getOrder.mockResolvedValue(reserved);
        const user = userEvent.setup();
        renderPage();

        const trigger = await screen.findByRole('button', { name: 'Kanseller' });
        await user.click(trigger);
        expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);

        await user.keyboard('{Escape}');

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.activeElement).toBe(trigger);
        expect(service.cancel).not.toHaveBeenCalled();
    });

    it('keeps the confirm dialog open through a StrictMode remount', async () => {
        service.getOrder.mockResolvedValue(reserved);
        const user = userEvent.setup();
        renderPage(true);

        await user.click(await screen.findByRole('button', { name: 'Kanseller' }));
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('ignores Escape while the request runs', async () => {
        service.getOrder.mockResolvedValue(reserved);
        service.capture.mockReturnValue(new Promise(() => {}));
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Trekk beløpet' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Trekk beløpet' }));
        await user.keyboard('{Escape}');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('shows the build price and the invoice lines as separate copy fields', async () => {
        service.getOrder.mockResolvedValue(reserved);
        renderPage();

        expect(await screen.findByText('Pris for datamaskinen')).toBeInTheDocument();
        expect(screen.getByText(/^(kr\s)?9\s990(\skr)?$/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kopier Linje 1' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kopier Linje 1, beløp' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kopier Linje 2, beløp' })).toBeInTheDocument();
    });

    it('shows an error instead of Laster when the order cannot be loaded', async () => {
        service.getOrder.mockRejectedValue(new Error('Boom'));
        renderPage();

        expect(await screen.findByText('Kunne ikke hente ordren')).toBeInTheDocument();
        expect(screen.queryByText('Laster…')).not.toBeInTheDocument();
    });

    it('shows the wrongStatus text when the API answers 409', async () => {
        service.getOrder.mockResolvedValue(reserved);
        service.capture.mockRejectedValue(await refused(409, { message: 'Wrong status', code: 'wrongStatus' }));
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Trekk beløpet' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Trekk beløpet' }));

        await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith('Ordren har endret status. Last siden på nytt.'));
        expect(screen.getByRole('button', { name: 'Trekk beløpet' })).toBeInTheDocument();
    });

    it('limits the invoice number to 50 characters', async () => {
        service.getOrder.mockResolvedValue(paid);
        renderPage();

        expect(await screen.findByLabelText('Fakturanummer')).toHaveAttribute('maxlength', '50');
    });

    it('moves focus to the order heading after an action, since the button is gone', async () => {
        service.getOrder.mockResolvedValue(reserved);
        service.capture.mockResolvedValue(paid);
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Trekk beløpet' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Trekk beløpet' }));

        await screen.findByRole('button', { name: 'Betal tilbake' });
        expect(screen.getByRole('heading', { name: 'Ordre' })).toHaveFocus();
    });

    it('cancels after confirming and shows the cancelled status', async () => {
        service.getOrder.mockResolvedValue(reserved);
        service.cancel.mockResolvedValue({ ...reserved, status: 'Cancelled', cancelledAt: '2026-10-19T08:00:00Z' });
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Kanseller' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Kanseller' }));

        await waitFor(() => expect(service.cancel).toHaveBeenCalledWith(7));
        await waitFor(() => expect(toastSpies.success).toHaveBeenCalledWith('Ordren er kansellert'));
        expect(screen.queryByRole('button', { name: 'Trekk beløpet' })).not.toBeInTheDocument();
        expect(screen.getAllByText('Kansellert').length).toBeGreaterThan(0);
    });

    it('refunds after confirming and shows the refunded status', async () => {
        service.getOrder.mockResolvedValue(paid);
        service.refund.mockResolvedValue({ ...paid, status: 'Refunded', refundedInOre: 1299000, refundedAt: '2026-10-21T08:00:00Z' });
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Betal tilbake' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Betal tilbake' }));

        await waitFor(() => expect(service.refund).toHaveBeenCalledWith(7, 1299000, 0));
        await waitFor(() => expect(toastSpies.success).toHaveBeenCalledWith('Beløpet er betalt tilbake'));
        expect(screen.queryByRole('button', { name: 'Betal tilbake' })).not.toBeInTheDocument();
    });

    describe('refunding an amount', () => {
        const partly: AdminOrder = { ...paid, refundedInOre: 300000 };
        const flat = (t: string) => t.replace(/[\s\u00a0\u202f]/g, ' ');
        const openRefund = async () => {
            const user = userEvent.setup();
            renderPage();
            await user.click(await screen.findByRole('button', { name: 'Betal tilbake' }));
            return { user, dialog: within(screen.getByRole('dialog')) };
        };

        it('prefills the rest in kroner and asks about it', async () => {
            service.getOrder.mockResolvedValue(partly);
            const { dialog } = await openRefund();

            expect(dialog.getByLabelText('Beløp (kr)')).toHaveValue('9990,00');
            expect(dialog.getByText(/^Betal tilbake .*9\s990.* til kunden\?$/)).toBeInTheDocument();
        });

        it('sends the typed amount in øre with the refunded total the page loaded', async () => {
            service.getOrder.mockResolvedValue(partly);
            service.refund.mockResolvedValue({ ...partly, refundedInOre: 400000 });
            const { user, dialog } = await openRefund();

            await user.clear(dialog.getByLabelText('Beløp (kr)'));
            await user.type(dialog.getByLabelText('Beløp (kr)'), '1000');
            await user.click(dialog.getByRole('button', { name: 'Betal tilbake' }));

            await waitFor(() => expect(service.refund).toHaveBeenCalledWith(7, 100000, 300000));
            expect(await screen.findByRole('button', { name: 'Betal tilbake' })).toBeInTheDocument();
        });

        it.each([
            ['', 'Du må fylle ut beløp.'],
            ['abc', 'Skriv beløpet i hele kroner eller med to desimaler.'],
            ['0', 'Beløpet må være større enn 0 kr.'],
            ['9990,01', 'Beløpet kan ikke være større enn 9 990 kr.'],
        ])('refuses %j without calling the API', async (typed, message) => {
            service.getOrder.mockResolvedValue(partly);
            const { user, dialog } = await openRefund();

            await user.clear(dialog.getByLabelText('Beløp (kr)'));
            if (typed) await user.type(dialog.getByLabelText('Beløp (kr)'), typed);
            await user.click(dialog.getByRole('button', { name: 'Betal tilbake' }));

            expect(dialog.getByText(message, { normalizer: flat })).toBeInTheDocument();
            expect(service.refund).not.toHaveBeenCalled();
        });

        it('shows the client text when the API refuses the amount', async () => {
            service.getOrder.mockResolvedValue(partly);
            service.refund.mockRejectedValue(await refused(400, { errors: { amountInOre: ['The amount must be between 1 and 999000 øre.'] } }));
            const { user, dialog } = await openRefund();

            await user.click(dialog.getByRole('button', { name: 'Betal tilbake' }));

            expect(await screen.findByText(/Beløpet kan ikke være større enn/)).toBeInTheDocument();
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('shows how much has been refunded of the captured amount', async () => {
            service.getOrder.mockResolvedValue(partly);
            renderPage();

            expect(await screen.findByText(/^Betalt tilbake: .*3\s000.* av .*12\s990.*$/)).toBeInTheDocument();
        });

        it('has no Betal tilbake once everything is paid back', async () => {
            service.getOrder.mockResolvedValue({ ...paid, refundedInOre: 1299000 });
            renderPage();

            await screen.findByText('Ordre');
            expect(screen.queryByRole('button', { name: 'Betal tilbake' })).not.toBeInTheDocument();
        });
    });

    it('shows the captureIncomplete text when Vipps did not confirm the full amount', async () => {
        service.getOrder.mockResolvedValue(reserved);
        service.capture.mockRejectedValue(await refused(502, { message: 'Partial', code: 'captureIncomplete' }));
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Trekk beløpet' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Trekk beløpet' }));

        await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith('Vipps bekreftet ikke hele beløpet.'));
    });

    it.each([
        ['refundChanged', 'Ordren er betalt tilbake i mellomtiden. Last ordren på nytt.'],
        ['refundPending', 'Vent til Vipps har bekreftet forrige tilbakebetaling.'],
        ['refundRefused', 'Vipps avviste tilbakebetalingen. Ingenting er betalt tilbake.'],
    ])('shows the %s text when the API refuses the refund', async (code, message) => {
        service.getOrder.mockResolvedValue(paid);
        service.refund.mockRejectedValue(await refused(409, { message: 'x', code }));
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Betal tilbake' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Betal tilbake' }));

        await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith(message));
    });

    it('shows the Vipps did not confirm text when Vipps cannot be reached after an action', async () => {
        service.getOrder.mockResolvedValue(reserved);
        service.capture.mockRejectedValue(await refused(502, { message: 'x', code: 'paymentProviderUnavailable' }));
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Trekk beløpet' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Trekk beløpet' }));

        await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith('Vipps bekreftet ikke endringen. Sjekk betalingen i Vipps-portalen før du prøver igjen.'));
    });

    it('shows the phone as a plain eight digit number', async () => {
        service.getOrder.mockResolvedValue(reserved);
        renderPage();

        expect(await screen.findAllByText('91234567')).toHaveLength(2);
        expect(screen.queryByText('4791234567')).not.toBeInTheDocument();
    });
});
