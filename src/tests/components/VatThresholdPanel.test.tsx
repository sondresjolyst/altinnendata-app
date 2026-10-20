import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import { resetTestMocks, toastSpies } from '@sjolystinnovation/app-kit/testing';
import VatThresholdPanel from '@/components/shop/VatThresholdPanel';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { Locale } from '@/i18n/config';
import type { VatThreshold } from '@/services/shopService';

const service = vi.hoisted(() => ({ getVatThreshold: vi.fn(), setOutsideSales: vi.fn() }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('@/services/shopService', () => ({ default: service }));

// The current period touches 13 months, the oldest only partly.
const months = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

const status = (overrides: Partial<VatThreshold> = {}): VatThreshold => ({
    turnoverInOre: 1_500_000,
    thresholdInOre: 5_000_000,
    warnFromInOre: 4_000_000,
    warning: false,
    crossedOn: null,
    crossedMonth: null,
    crossingOrderReference: null,
    crossedAt: null,
    months: months.map(month => ({ month, shopInOre: month === '2026-10' ? 1_299_000 : 0, outsideInOre: month === '2026-09' ? 201_000 : 0 })),
    ...overrides,
});

const refused = (code: number, data: object) =>
    request(
        () => Promise.reject(Object.assign(new Error(`Request failed with status code ${code}`), { isAxiosError: true, response: { status: code, data } })),
        'Failed',
    ).catch((e: unknown) => e);

const renderPanel = (locale: Locale = 'no') =>
    render(
        <DictionaryProvider locale={locale}>
            <VatThresholdPanel />
        </DictionaryProvider>,
    );

beforeEach(() => {
    resetTestMocks();
    service.getVatThreshold.mockReset();
    service.setOutsideSales.mockReset();
    vi.useFakeTimers({ now: new Date('2026-10-20T10:00:00Z'), toFake: ['Date'] });
});

describe('VatThresholdPanel', () => {
    it('shows the turnover of the 12 months up to today against 50 000 kr, with no warning under 40 000 kr', async () => {
        service.getVatThreshold.mockResolvedValue(status());
        renderPanel();

        expect(await screen.findByText(/15\s000 kr av 50\s000 kr/)).toBeInTheDocument();
        expect(screen.getByRole('meter', { name: 'Omsetning de siste 12 månedene fram til i dag' })).toHaveAttribute('aria-valuenow', '15000');
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('warns from 40 000 kr', async () => {
        service.getVatThreshold.mockResolvedValue(status({ turnoverInOre: 4_100_000, warning: true }));
        renderPanel();

        expect(await screen.findByRole('status')).toHaveTextContent(/Omsetningen har passert 40\s000 kr\. Når den passerer 50\s000 kr i løpet av 12 måneder, må virksomheten registreres i Merverdiavgiftsregisteret\./);
    });

    it('says which day and which order passed the threshold', async () => {
        service.getVatThreshold.mockResolvedValue(status({ turnoverInOre: 5_200_000, warning: true, crossedOn: '2026-10-07', crossedMonth: '2026-10', crossingOrderReference: 'AID-000042-1A2B3C4D' }));
        renderPanel();

        const alert = await screen.findByRole('status');
        expect(alert).toHaveTextContent(/^Grensen ble passert 07\.10\.2026\. Omsetningen var da over 50\s000 kr, og virksomheten må registreres i Merverdiavgiftsregisteret\./);
        expect(alert).toHaveTextContent('Salget som passerte grensen er ordre AID-000042-1A2B3C4D.');
        expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '50000');
    });

    it('lists the shop and outside sales per month', async () => {
        service.getVatThreshold.mockResolvedValue(status());
        renderPanel();

        const row = (await screen.findByRole('rowheader', { name: 'september 2026' })).closest('tr')!;
        expect(within(row).getAllByRole('cell')[1]).toHaveTextContent(/2\s010 kr/);
        expect(screen.getAllByRole('rowheader')).toHaveLength(13);
        expect(screen.getAllByRole('rowheader')[0]).toHaveTextContent('oktober 2025');
    });

    it('prefills the current month and the amount stored for a chosen month', async () => {
        service.getVatThreshold.mockResolvedValue(status());
        const user = userEvent.setup();
        renderPanel();

        const month = await screen.findByLabelText('Måned');
        expect(month).toHaveValue('2026-10');
        expect(screen.getByLabelText('Beløp (kr)')).toHaveValue('');

        await user.clear(month);
        await user.type(month, '2026-09');
        expect(screen.getByLabelText('Beløp (kr)')).toHaveValue('2010,00');
    });

    it('saves the sales outside the shop in øre and shows the new figure', async () => {
        service.getVatThreshold.mockResolvedValue(status());
        service.setOutsideSales.mockResolvedValue(status({ turnoverInOre: 2_000_000 }));
        const user = userEvent.setup();
        renderPanel();

        await user.type(await screen.findByLabelText('Beløp (kr)'), '5000,50');
        await user.click(screen.getByRole('button', { name: 'Lagre' }));

        await waitFor(() => expect(service.setOutsideSales).toHaveBeenCalledWith('2026-10', 500_050));
        expect(toastSpies.success).toHaveBeenCalledWith('Salget er lagret');
        expect(await screen.findByText(/20\s000 kr av 50\s000 kr/)).toBeInTheDocument();
    });

    it('sends 0 for an empty amount, which removes the month', async () => {
        service.getVatThreshold.mockResolvedValue(status());
        service.setOutsideSales.mockResolvedValue(status());
        const user = userEvent.setup();
        renderPanel();

        await user.click(await screen.findByRole('button', { name: 'Lagre' }));

        await waitFor(() => expect(service.setOutsideSales).toHaveBeenCalledWith('2026-10', 0));
    });

    it.each([
        ['abc', 'Skriv beløpet i hele kroner eller med én eller to desimaler.'],
        ['10000001', /Beløpet kan ikke være større enn 10\s000\s000\skr\./],
    ])('refuses %s without calling the API', async (typed, message) => {
        service.getVatThreshold.mockResolvedValue(status());
        const user = userEvent.setup();
        renderPanel();

        await user.type(await screen.findByLabelText('Beløp (kr)'), typed);
        await user.click(screen.getByRole('button', { name: 'Lagre' }));

        expect(screen.getByLabelText('Beløp (kr)')).toHaveAccessibleDescription(message);
        expect(service.setOutsideSales).not.toHaveBeenCalled();
    });

    it('asks for the month when it is empty', async () => {
        service.getVatThreshold.mockResolvedValue(status());
        const user = userEvent.setup();
        renderPanel();

        await user.clear(await screen.findByLabelText('Måned'));
        await user.click(screen.getByRole('button', { name: 'Lagre' }));

        expect(screen.getByLabelText('Måned')).toHaveAccessibleDescription('Du må fylle ut måned.');
    });

    it('shows the Norwegian text under the field the API refuses', async () => {
        service.getVatThreshold.mockResolvedValue(status());
        service.setOutsideSales.mockRejectedValue(await refused(400, { errors: { amountInOre: ["'amount In Ore' must be between 0 and 1000000000."] } }));
        const user = userEvent.setup();
        renderPanel();

        await user.type(await screen.findByLabelText('Beløp (kr)'), '10');
        await user.click(screen.getByRole('button', { name: 'Lagre' }));

        await waitFor(() => expect(screen.getByLabelText('Beløp (kr)')).toHaveAccessibleDescription('Skriv beløpet i hele kroner eller med én eller to desimaler.'));
    });

    it('says the save failed on another error', async () => {
        service.getVatThreshold.mockResolvedValue(status());
        service.setOutsideSales.mockRejectedValue(await refused(500, { message: 'x' }));
        const user = userEvent.setup();
        renderPanel();

        await user.click(await screen.findByRole('button', { name: 'Lagre' }));

        await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith('Kunne ikke lagre salget'));
    });

    it('says the turnover could not be loaded', async () => {
        service.getVatThreshold.mockRejectedValue(new Error('down'));
        renderPanel();

        expect(await screen.findByText('Kunne ikke hente omsetningen')).toBeInTheDocument();
    });

    it('uses English on the English site', async () => {
        service.getVatThreshold.mockResolvedValue(status({ warning: true }));
        renderPanel('en');

        expect(await screen.findByRole('heading', { name: 'VAT registration threshold' })).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent(/registered in the VAT Register/);
        expect(screen.getByRole('rowheader', { name: 'October 2026' })).toBeInTheDocument();
    });
});
