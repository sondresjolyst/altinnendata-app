import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrictMode, Suspense } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import { resetTestMocks, toastSpies } from '@sjolystinnovation/app-kit/testing';
import AdminOrderPage from '@/app/[locale]/(protected)/admin/shop/orders/[id]/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { AdminOrder } from '@/services/shopService';

const service = vi.hoisted(() => ({ getOrder: vi.fn(), capture: vi.fn(), cancel: vi.fn(), refund: vi.fn(), setInvoiceNumber: vi.fn(), markShipped: vi.fn(), releaseBuild: vi.fn(), sendPaymentLink: vi.fn() }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('next/navigation', async () => (await import('@sjolystinnovation/app-kit/testing')).nextNavigationMock());
vi.mock('@/services/shopService', () => ({ default: service }));

const reserved: AdminOrder = {
    id: 7,
    reference: 'AID-000007-1A2B3C4D',
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
    termsVersion: '2026-10-01T09:30:00.123456Z',
    termsAcceptedIp: '203.0.113.0',
    confirmationSentAt: '2026-10-18T10:06:00Z',
    shippedAt: null,
    shippingNote: null,
    authorizedAt: '2026-10-18T10:05:00Z',
    capturedAt: null,
    cancelledAt: null,
    refundedAt: null,
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-18T10:05:00Z',
    refunds: [],
    deliveryDate: null,
    deliveryPlace: 'Storgata 1, 0155 Oslo',
    reservationEndedAt: null,
    holdsBuild: true,
    releaseBuildBlockedReason: 'wrongStatus',
    paymentLinkSentAt: null,
    paymentLinkExpiresAt: null,
    paymentLinkBlockedReason: 'wrongStatus',
    vippsReferences: [],
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
        expect(screen.getByRole('button', { name: 'Kanseller ordre' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Betal tilbake' })).not.toBeInTheDocument();
        first.unmount();

        service.getOrder.mockResolvedValue(paid);
        renderPage();
        expect(await screen.findByRole('button', { name: 'Betal tilbake' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Trekk beløpet' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Kanseller ordre' })).not.toBeInTheDocument();
    });

    it('links to the build page', async () => {
        service.getOrder.mockResolvedValue(reserved);
        renderPage();

        expect(await screen.findByRole('link', { name: 'Se datamaskinen' })).toHaveAttribute('href', '/no/builds/spillmaskin');
    });

    it('tells the owner how to book the Vipps payouts and fees in the invoice details', async () => {
        service.getOrder.mockResolvedValue(paid);
        renderPage();

        const invoice = await screen.findByRole('region', { name: 'Fakturadetaljer' });
        expect(within(invoice).getByText('Bokfør utbetalinger fra Vipps mot en egen Vipps-konto med oppgjørsrapporten fra Vipps-portalen. Bokfør gebyrene som kostnad.')).toBeInTheDocument();
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

        await user.click(await screen.findByRole('button', { name: 'Kanseller ordre' }));
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

        const trigger = await screen.findByRole('button', { name: 'Kanseller ordre' });
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

        await user.click(await screen.findByRole('button', { name: 'Kanseller ordre' }));
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

        await user.click(await screen.findByRole('button', { name: 'Kanseller ordre' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Kanseller ordre' }));

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
            ['abc', 'Skriv beløpet i hele kroner eller med én eller to desimaler.'],
            ['0', 'Beløpet må være større enn 0 kr.'],
            ['9990,01', 'Beløpet kan ikke være større enn 9 990 kr.'],
        ])('refuses %j with the error, a neutral confirm text and a disabled confirm button', async (typed, message) => {
            service.getOrder.mockResolvedValue(partly);
            const { user, dialog } = await openRefund();

            await user.clear(dialog.getByLabelText('Beløp (kr)'));
            if (typed) await user.type(dialog.getByLabelText('Beløp (kr)'), typed);

            expect(dialog.getByText(message, { normalizer: flat })).toBeInTheDocument();
            expect(dialog.getByText('Skriv inn et gyldig beløp.')).toBeInTheDocument();
            expect(dialog.queryByText(/til kunden\?/)).not.toBeInTheDocument();
            expect(dialog.getByRole('button', { name: 'Betal tilbake' })).toBeDisabled();
            await user.click(dialog.getByRole('button', { name: 'Betal tilbake' }));
            expect(service.refund).not.toHaveBeenCalled();
        });

        it('shows the typed amount in the confirm text once it is valid', async () => {
            service.getOrder.mockResolvedValue(partly);
            const { user, dialog } = await openRefund();

            await user.clear(dialog.getByLabelText('Beløp (kr)'));
            await user.type(dialog.getByLabelText('Beløp (kr)'), '100,5');

            expect(dialog.getByText(/^Betal tilbake .*100.* til kunden\?$/)).toBeInTheDocument();
            expect(dialog.getByRole('button', { name: 'Betal tilbake' })).toBeEnabled();
        });

        it('shows the client text when the API refuses the amount', async () => {
            service.getOrder.mockResolvedValue(partly);
            service.refund.mockRejectedValue(await refused(400, { errors: { amountInOre: ['The amount must be between 1 and 999000 øre.'] } }));
            const { user, dialog } = await openRefund();

            await user.click(dialog.getByRole('button', { name: 'Betal tilbake' }));

            expect(await screen.findByText(/Beløpet kan ikke være større enn/)).toBeInTheDocument();
            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(dialog.getByRole('button', { name: 'Betal tilbake' })).toBeDisabled();
            expect(dialog.getByText('Skriv inn et gyldig beløp.')).toBeInTheDocument();
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
        [409, 'refundChanged', 'Ordren er betalt tilbake i mellomtiden. Last ordren på nytt.'],
        [409, 'refundPending', 'Vent til Vipps har bekreftet forrige tilbakebetaling.'],
        [502, 'refundRefused', 'Vipps avviste tilbakebetalingen. Ingenting er betalt tilbake.'],
    ])('shows the %s %s text when the API refuses the refund', async (status, code, message) => {
        service.getOrder.mockResolvedValue(paid);
        service.refund.mockRejectedValue(await refused(status, { message: 'x', code }));
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

    describe('marking the order as sent', () => {
        const shipped: AdminOrder = { ...reserved, shippedAt: '2026-10-19T12:00:00Z', shippingNote: 'Sporingsnummer 123' };

        const open = async (user: ReturnType<typeof userEvent.setup>, name = 'Marker som sendt') => {
            await user.click(await screen.findByRole('button', { name }));
            return within(screen.getByRole('dialog'));
        };

        it('asks before it emails the customer, sends the note and shows the date and the note', async () => {
            service.getOrder.mockResolvedValue(reserved);
            service.markShipped.mockResolvedValue(shipped);
            const user = userEvent.setup();
            renderPage();

            expect(await screen.findByText('Kunden får en e-post.')).toBeInTheDocument();
            const dialog = await open(user);
            expect(dialog.getByText('Send e-post til kunden om at ordren er sendt?')).toBeInTheDocument();
            await user.type(dialog.getByLabelText('Melding til kunden'), '  Sporingsnummer 123 ');
            await user.click(dialog.getByRole('button', { name: 'Marker som sendt' }));

            await waitFor(() => expect(service.markShipped).toHaveBeenCalledWith(7, 'Sporingsnummer 123'));
            expect(toastSpies.success).toHaveBeenCalledWith('Ordren er markert som sendt');
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.getByText('Sendt').nextElementSibling).toHaveTextContent('19.10.2026');
            expect(screen.getByText('Sporingsnummer 123')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Marker som sendt' })).toBeDisabled();
            expect(screen.getByText('Ordren er allerede markert som sendt.')).toBeInTheDocument();
        });

        it('sends no note when the field is left empty', async () => {
            service.getOrder.mockResolvedValue(reserved);
            service.markShipped.mockResolvedValue(shipped);
            const user = userEvent.setup();
            renderPage();

            const dialog = await open(user);
            await user.click(dialog.getByRole('button', { name: 'Marker som sendt' }));

            await waitFor(() => expect(service.markShipped).toHaveBeenCalledWith(7, null));
        });

        it('says klar for henting for a pickup order', async () => {
            service.getOrder.mockResolvedValue({ ...reserved, deliveryMethod: 'Pickup' });
            service.markShipped.mockResolvedValue({ ...shipped, deliveryMethod: 'Pickup' });
            const user = userEvent.setup();
            renderPage();

            const dialog = await open(user, 'Marker som klar for henting');
            expect(dialog.getByText('Send e-post til kunden om at ordren er klar for henting?')).toBeInTheDocument();
            await user.click(dialog.getByRole('button', { name: 'Marker som klar for henting' }));

            await waitFor(() => expect(toastSpies.success).toHaveBeenCalledWith('Ordren er markert som klar for henting'));
            expect(screen.getByText('Klar for henting').nextElementSibling).toHaveTextContent('19.10.2026');
            expect(screen.getByText('Ordren er allerede markert som klar for henting.')).toBeInTheDocument();
        });

        it('allows a paid order', async () => {
            service.getOrder.mockResolvedValue(paid);
            renderPage();

            expect(await screen.findByRole('button', { name: 'Marker som sendt' })).toBeEnabled();
        });

        it.each(['Pending', 'Failed', 'Cancelled', 'Refunded'] as const)('keeps the button in place but off for a %s order, with the reason', async status => {
            service.getOrder.mockResolvedValue({ ...reserved, status });
            renderPage();

            const button = await screen.findByRole('button', { name: 'Marker som sendt' });
            expect(button).toBeDisabled();
            expect(button).toHaveAccessibleDescription('Bare reserverte og betalte ordrer kan markeres.');
        });

        it('turns the confirm button off and says Bruk 500 eller færre tegn. for a note over 500 characters', async () => {
            service.getOrder.mockResolvedValue(reserved);
            const user = userEvent.setup();
            renderPage();

            const dialog = await open(user);
            const note = dialog.getByLabelText('Melding til kunden');
            await user.click(note);
            await user.paste('a'.repeat(501));

            expect(dialog.getByText('Bruk 500 eller færre tegn.')).toBeInTheDocument();
            expect(dialog.getByRole('button', { name: 'Marker som sendt' })).toBeDisabled();
            await user.type(note, '{Backspace}');
            expect(dialog.getByRole('button', { name: 'Marker som sendt' })).toBeEnabled();
        });

        it('keeps the dialog open with the length text when the API refuses the note', async () => {
            service.getOrder.mockResolvedValue(reserved);
            service.markShipped.mockRejectedValue(await refused(400, { errors: { note: ['Use 500 or fewer characters.'] } }));
            const user = userEvent.setup();
            renderPage();

            const dialog = await open(user);
            await user.type(dialog.getByLabelText('Melding til kunden'), 'Hei');
            await user.click(dialog.getByRole('button', { name: 'Marker som sendt' }));

            expect(await dialog.findByText('Bruk 500 eller færre tegn.')).toBeInTheDocument();
            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.queryByText('Use 500 or fewer characters.')).not.toBeInTheDocument();
        });

        it.each([
            [409, { message: 'x', code: 'alreadyShipped' }, 'Ordren er allerede markert. Last siden på nytt.'],
            [409, { message: 'x', code: 'wrongStatus' }, 'Ordren har endret status. Last siden på nytt.'],
            [502, { message: 'Bad gateway' }, 'Kunne ikke markere ordren'],
        ])('shows the Norwegian text when the API answers %i', async (status, body, message) => {
            service.getOrder.mockResolvedValue(reserved);
            service.markShipped.mockRejectedValue(await refused(status, body));
            const user = userEvent.setup();
            renderPage();

            const dialog = await open(user);
            await user.click(dialog.getByRole('button', { name: 'Marker som sendt' }));

            await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith(message));
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    describe('releasing the build after Vipps ended the reservation', () => {
        const ended: AdminOrder = { ...reserved, status: 'Failed', reservationEndedAt: '2026-10-19T21:30:00Z', holdsBuild: true, releaseBuildBlockedReason: null };
        const released: AdminOrder = { ...ended, holdsBuild: false, releaseBuildBlockedReason: 'buildNotHeld' };

        it('says when Vipps ended the reservation', async () => {
            service.getOrder.mockResolvedValue(ended);
            renderPage();
            expect(await screen.findByText('Vipps avsluttet reservasjonen 19.10.2026')).toBeInTheDocument();
            expect(screen.getByText(/Datamaskinen er fortsatt reservert for denne ordren/)).toBeInTheDocument();
        });

        it('says nothing about an ended reservation when Vipps did not end it', async () => {
            service.getOrder.mockResolvedValue(reserved);
            renderPage();
            await screen.findByRole('button', { name: 'Trekk beløpet' });
            expect(screen.queryByText(/Vipps avsluttet reservasjonen/)).not.toBeInTheDocument();
        });

        it('keeps Frigi datamaskinen in place but off with the reason on a reserved order', async () => {
            service.getOrder.mockResolvedValue(reserved);
            renderPage();
            const button = await screen.findByRole('button', { name: 'Frigi datamaskinen' });
            expect(button).toBeDisabled();
            expect(button).toHaveAccessibleDescription('Bare mislykkede og kansellerte ordrer kan frigi datamaskinen.');
        });

        it('keeps the button off with its reason when the order no longer holds the build', async () => {
            service.getOrder.mockResolvedValue(released);
            renderPage();
            const button = await screen.findByRole('button', { name: 'Frigi datamaskinen' });
            expect(button).toBeDisabled();
            expect(button).toHaveAccessibleDescription('Ordren holder ikke lenger datamaskinen.');
        });

        it('asks first, then releases and turns the button off', async () => {
            service.getOrder.mockResolvedValue(ended);
            service.releaseBuild.mockResolvedValue(released);
            const user = userEvent.setup();
            renderPage();

            const button = await screen.findByRole('button', { name: 'Frigi datamaskinen' });
            expect(button).toBeEnabled();
            await user.click(button);
            const dialog = within(screen.getByRole('dialog'));
            expect(dialog.getByText('Datamaskinen blir tilgjengelig for salg igjen.')).toBeInTheDocument();
            await user.click(dialog.getByRole('button', { name: 'Frigi datamaskinen' }));

            await waitFor(() => expect(service.releaseBuild).toHaveBeenCalledWith(7));
            expect(toastSpies.success).toHaveBeenCalledWith('Datamaskinen er frigitt');
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Frigi datamaskinen' })).toBeDisabled();
        });

        it('does not release when the dialog is cancelled', async () => {
            service.getOrder.mockResolvedValue(ended);
            const user = userEvent.setup();
            renderPage();
            await user.click(await screen.findByRole('button', { name: 'Frigi datamaskinen' }));
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avbryt' }));
            expect(service.releaseBuild).not.toHaveBeenCalled();
        });

        it.each([
            ['buildNotHeld', 'Ordren holder ikke lenger datamaskinen.'],
            ['wrongStatus', 'Ordren har endret status. Last siden på nytt.'],
        ])('shows the %s text on a 409 and loads the order again', async (code, message) => {
            service.getOrder.mockResolvedValueOnce(ended).mockResolvedValue(released);
            service.releaseBuild.mockRejectedValue(await refused(409, { message: 'No', code }));
            const user = userEvent.setup();
            renderPage();

            await user.click(await screen.findByRole('button', { name: 'Frigi datamaskinen' }));
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Frigi datamaskinen' }));

            await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith(message));
            await waitFor(() => expect(screen.getByRole('button', { name: 'Frigi datamaskinen' })).toBeDisabled());
            expect(service.getOrder).toHaveBeenCalledTimes(2);
        });
    });

    describe('sending a new payment link after Vipps ended the reservation', () => {
        const ended: AdminOrder = { ...reserved, status: 'Failed', reservationEndedAt: '2026-10-19T21:30:00Z', holdsBuild: true, releaseBuildBlockedReason: null, paymentLinkBlockedReason: null };
        const sent: AdminOrder = { ...ended, paymentLinkSentAt: '2026-10-20T08:00:00Z', paymentLinkExpiresAt: '2026-10-23T08:00:00Z' };

        it('keeps Send ny betalingslenke in place but off with the reason on a reserved order', async () => {
            service.getOrder.mockResolvedValue(reserved);
            renderPage();
            const button = await screen.findByRole('button', { name: 'Send ny betalingslenke' });
            expect(button).toBeDisabled();
            expect(button).toHaveAccessibleDescription('Bare ordrer der Vipps opphevet reservasjonen kan få ny betalingslenke.');
        });

        it('keeps the button off with its reason when the order no longer holds the build', async () => {
            service.getOrder.mockResolvedValue({ ...ended, holdsBuild: false, paymentLinkBlockedReason: 'buildNotHeld' });
            renderPage();
            const button = await screen.findByRole('button', { name: 'Send ny betalingslenke' });
            expect(button).toBeDisabled();
            expect(button).toHaveAccessibleDescription('Ordren holder ikke lenger datamaskinen.');
        });

        it('asks first, then sends the link and says when it was sent and how long it works', async () => {
            service.getOrder.mockResolvedValue(ended);
            service.sendPaymentLink.mockResolvedValue(sent);
            const user = userEvent.setup();
            renderPage();

            const button = await screen.findByRole('button', { name: 'Send ny betalingslenke' });
            expect(button).toBeEnabled();
            expect(button).toHaveAccessibleDescription('Kunden får en lenke på e-post og kan betale ordren på nytt.');
            expect(screen.queryByText(/Betalingslenke sendt/)).not.toBeInTheDocument();
            await user.click(button);
            const dialog = within(screen.getByRole('dialog'));
            expect(dialog.getByText('Send kunden en ny betalingslenke på e-post?')).toBeInTheDocument();
            await user.click(dialog.getByRole('button', { name: 'Send ny betalingslenke' }));

            await waitFor(() => expect(service.sendPaymentLink).toHaveBeenCalledWith(7));
            expect(toastSpies.success).toHaveBeenCalledWith('Betalingslenken er sendt');
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.getByText('Betalingslenke sendt 20.10.2026, gyldig til 23.10.2026 kl. 10:00')).toBeInTheDocument();
            expect(service.releaseBuild).not.toHaveBeenCalled();
        });

        it('does not send when the dialog is cancelled', async () => {
            service.getOrder.mockResolvedValue(ended);
            const user = userEvent.setup();
            renderPage();
            await user.click(await screen.findByRole('button', { name: 'Send ny betalingslenke' }));
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avbryt' }));
            expect(service.sendPaymentLink).not.toHaveBeenCalled();
        });

        it.each([
            [409, 'buildNotHeld', 'Ordren holder ikke lenger datamaskinen.'],
            [409, 'wrongStatus', 'Ordren har endret status. Last siden på nytt.'],
            [502, 'paymentProviderUnavailable', 'Vipps bekreftet ikke endringen. Sjekk betalingen i Vipps-portalen før du prøver igjen.'],
        ])('shows the %s %s text and loads the order again', async (status, code, message) => {
            const blocked: AdminOrder = { ...ended, holdsBuild: false, paymentLinkBlockedReason: 'buildNotHeld' };
            service.getOrder.mockResolvedValueOnce(ended).mockResolvedValue(blocked);
            service.sendPaymentLink.mockRejectedValue(await refused(status, { message: 'No', code }));
            const user = userEvent.setup();
            renderPage();

            await user.click(await screen.findByRole('button', { name: 'Send ny betalingslenke' }));
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Send ny betalingslenke' }));

            await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith(message));
            await waitFor(() => expect(screen.getByRole('button', { name: 'Send ny betalingslenke' })).toBeDisabled());
            expect(service.getOrder).toHaveBeenCalledTimes(2);
        });
    });

    it('lists each Vipps payment of the order with its state', async () => {
        service.getOrder.mockResolvedValue({
            ...reserved,
            vippsReferences: [
                { reference: 'AID-000007-1A2B3C4D', state: 'EXPIRED', createdAt: '2026-10-18T10:00:00Z' },
                { reference: 'AID-000007-1A2B3C4D-2', state: 'AUTHORIZED', createdAt: '2026-10-20T10:00:00Z' },
                { reference: 'AID-000007-1A2B3C4D-3', state: 'SOMETHING_NEW', createdAt: '2026-10-20T11:00:00Z' },
            ],
        });
        renderPage();

        const list = within((await screen.findByText('Vipps-betalinger')).nextElementSibling as HTMLElement);
        const items = list.getAllByRole('listitem').map(item => item.textContent);
        expect(items).toEqual(['AID-000007-1A2B3C4D (utløpt)', 'AID-000007-1A2B3C4D-2 (reservert)', 'AID-000007-1A2B3C4D-3 (SOMETHING_NEW)']);
    });

    it('has no Vipps payments row before the first payment', async () => {
        service.getOrder.mockResolvedValue(reserved);
        renderPage();
        await screen.findByRole('button', { name: 'Trekk beløpet' });
        expect(screen.queryByText('Vipps-betalinger')).not.toBeInTheDocument();
    });

    it('lists each refund with its date and amount and asks for a credit note for each', async () => {
        service.getOrder.mockResolvedValue({
            ...paid,
            status: 'Refunded',
            refundedInOre: 1299000,
            refunds: [
                { amountInOre: 300000, refundedAt: '2026-10-21T08:00:00Z', source: 'Admin' },
                { amountInOre: 999000, refundedAt: '2026-10-22T09:00:00Z', source: 'Webhook' },
            ],
        });
        renderPage();
        expect(await screen.findByRole('heading', { name: 'Tilbakebetalinger' })).toBeInTheDocument();
        expect(screen.getByText('Lag en kreditnota i regnskapssystemet for hver tilbakebetaling.')).toBeInTheDocument();
        expect(screen.getByText('Tilbakebetaling 1, 21.10.2026').nextElementSibling).toHaveTextContent('3000,00');
        expect(screen.getByText('Tilbakebetaling 2, 22.10.2026').nextElementSibling).toHaveTextContent('9990,00');
        const copy = screen.getByRole('button', { name: 'Kopier Tilbakebetaling 2, 22.10.2026' });
        expect(copy).toHaveTextContent(/^Kopier$/);
    });

    it('has no refund list before any refund', async () => {
        service.getOrder.mockResolvedValue(paid);
        renderPage();
        await screen.findByRole('button', { name: 'Betal tilbake' });
        expect(screen.queryByRole('heading', { name: 'Tilbakebetalinger' })).not.toBeInTheDocument();
    });

    it('shows Leveringsdato and Leveringssted with copy buttons', async () => {
        service.getOrder.mockResolvedValue({ ...paid, deliveryDate: '2026-10-21T10:00:00Z' });
        renderPage();
        expect(await screen.findByRole('button', { name: 'Kopier Leveringsdato' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kopier Leveringssted' })).toBeInTheDocument();
        expect(screen.getByText('Leveringssted').nextElementSibling).toHaveTextContent('Storgata 1, 0155 Oslo');
    });

    it('shows when the order confirmation went out, the accepted terms version and the shortened IP address', async () => {
        service.getOrder.mockResolvedValue(reserved);
        renderPage();

        expect((await screen.findByText('Ordrebekreftelse')).nextElementSibling).toHaveTextContent('Sendt 18.10.2026');
        expect(screen.getByText('Vilkår godtatt').nextElementSibling).toHaveTextContent('18.10.2026, versjon fra 01.10.2026 11:30:00');
        expect(screen.getByText('IP-adresse ved godkjenning (forkortet)').nextElementSibling).toHaveTextContent('203.0.113.0');
    });

    it('says the order confirmation is not sent yet and that no terms were published', async () => {
        service.getOrder.mockResolvedValue({ ...reserved, confirmationSentAt: null, termsVersion: 'none', termsAcceptedIp: null });
        renderPage();

        expect((await screen.findByText('Ordrebekreftelse')).nextElementSibling).toHaveTextContent('Ikke sendt ennå');
        expect(screen.getByText('Vilkår godtatt').nextElementSibling).toHaveTextContent('18.10.2026, ingen vilkår publisert');
        expect(screen.queryByText('IP-adresse ved godkjenning (forkortet)')).not.toBeInTheDocument();
    });

    it('shows the phone as a plain eight digit number', async () => {
        service.getOrder.mockResolvedValue(reserved);
        renderPage();

        expect(await screen.findAllByText('91234567')).toHaveLength(2);
        expect(screen.queryByText('4791234567')).not.toBeInTheDocument();
    });
});
