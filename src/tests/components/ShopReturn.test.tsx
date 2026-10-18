import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ShopReturn from '@/components/shop/ShopReturn';
import ShopService, { type OrderStatusInfo } from '@/services/shopService';

const search = vi.hoisted(() => ({ token: 'abc123' as string | null }));

vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(search.token ? { token: search.token } : {}),
}));
vi.mock('@/services/shopService', () => ({ default: { orderStatus: vi.fn() } }));

const orderStatus = vi.mocked(ShopService.orderStatus);

const info = (overrides: Partial<OrderStatusInfo> = {}): OrderStatusInfo => ({
    status: 'Reserved',
    reference: 'AD-1001',
    buildTitle: 'Gaming PC',
    totalInOre: 1299000,
    deliveryMethod: 'Shipping',
    ...overrides,
});

const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

describe('ShopReturn', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        search.token = 'abc123';
        orderStatus.mockReset();
    });
    afterEach(() => vi.useRealTimers());

    it('shows Betalingen er reservert with the total and reference for a reserved order', async () => {
        orderStatus.mockResolvedValue(info());
        render(<ShopReturn locale="no" />);
        await settle();

        expect(screen.getByRole('heading', { name: 'Betalingen er reservert' })).toBeInTheDocument();
        expect(screen.getByText(/Vi har reservert NOK 12990,00 i Vipps for Gaming PC\./)).toBeInTheDocument();
        expect(screen.getByText('Ordrenummer AD-1001. Du får en ordrebekreftelse på e-post.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Til datamaskinene' })).toHaveAttribute('href', '/no/builds');
        expect(orderStatus).toHaveBeenCalledWith('abc123');
    });

    it('keeps polling while Pending and offers Sjekk igjen', async () => {
        orderStatus.mockResolvedValueOnce(info({ status: 'Pending' })).mockResolvedValue(info({ status: 'Paid' }));
        render(<ShopReturn locale="no" />);
        await settle();

        expect(screen.getByRole('heading', { name: 'Venter på Vipps' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sjekk igjen' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Kontakt oss' })).toHaveAttribute('href', '/no/contact');

        await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
        expect(screen.getByRole('heading', { name: 'Betalingen er reservert' })).toBeInTheDocument();
    });

    it('stops polling after the retries and checks again on Sjekk igjen', async () => {
        orderStatus.mockResolvedValue(info({ status: 'Pending' }));
        render(<ShopReturn locale="no" />);
        await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
        const calls = orderStatus.mock.calls.length;

        expect(calls).toBe(9);
        await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
        expect(orderStatus).toHaveBeenCalledTimes(calls);

        orderStatus.mockResolvedValue(info({ status: 'Paid' }));
        fireEvent.click(screen.getByRole('button', { name: 'Sjekk igjen' }));
        await settle();
        expect(screen.getByRole('heading', { name: 'Betalingen er reservert' })).toBeInTheDocument();
    });

    it('stays pending with Sjekk igjen when the status cannot be loaded', async () => {
        orderStatus.mockRejectedValue(new Error('Bad gateway'));
        render(<ShopReturn locale="no" />);
        await settle();

        expect(screen.getByRole('heading', { name: 'Venter på Vipps' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sjekk igjen' })).toBeInTheDocument();
    });

    it.each(['Failed', 'Cancelled'] as const)('shows the failed state for %s', async status => {
        orderStatus.mockResolvedValue(info({ status }));
        render(<ShopReturn locale="no" />);
        await settle();

        expect(screen.getByRole('heading', { name: 'Betalingen ble ikke fullført' })).toBeInTheDocument();
        expect(screen.getByText('Ingen penger er trukket. Datamaskinen er ledig igjen hvis ingen andre har kjøpt den.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Til datamaskinene' })).toHaveAttribute('href', '/no/builds');
    });

    it('shows the failed state when the token is unknown', async () => {
        orderStatus.mockResolvedValue(null);
        render(<ShopReturn locale="no" />);
        await settle();

        expect(screen.getByRole('heading', { name: 'Betalingen ble ikke fullført' })).toBeInTheDocument();
    });

    it('shows the failed state without asking the API when there is no token', async () => {
        search.token = null;
        render(<ShopReturn locale="no" />);
        await settle();

        expect(screen.getByRole('heading', { name: 'Betalingen ble ikke fullført' })).toBeInTheDocument();
        expect(orderStatus).not.toHaveBeenCalled();
    });

    it('shows the English texts on /en', async () => {
        orderStatus.mockResolvedValue(info());
        render(<ShopReturn locale="en" />);
        await settle();

        expect(screen.getByRole('heading', { name: 'The payment is reserved' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'To the computers' })).toHaveAttribute('href', '/en/builds');
    });
});
