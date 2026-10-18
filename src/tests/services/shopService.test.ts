import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError } from 'axios';
import ShopService, { type OrderStatusInfo } from '@/services/shopService';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/services/publicClient', () => ({ default: { get } }));
vi.mock('@/services/axiosInstance', () => ({ default: {} }));

const status: OrderStatusInfo = { status: 'Reserved', reference: 'AD-1001', buildTitle: 'Gaming PC', totalInOre: 1299000, deliveryMethod: 'Shipping' };

describe('ShopService.orderStatus', () => {
    beforeEach(() => get.mockReset());

    it('reads the status of the order by its token through the public client', async () => {
        get.mockResolvedValueOnce({ status: 200, data: status });

        await expect(ShopService.orderStatus('abc123')).resolves.toEqual(status);
        expect(get).toHaveBeenCalledWith('/shop/orders/abc123/status', expect.objectContaining({ validateStatus: expect.any(Function) }));
    });

    it('lets the client accept 404 but no other error status', async () => {
        get.mockResolvedValueOnce({ status: 200, data: status });
        await ShopService.orderStatus('abc123');
        const { validateStatus } = get.mock.calls[0][1] as { validateStatus: (code: number) => boolean };

        expect([200, 404].map(validateStatus)).toEqual([true, true]);
        expect([400, 500].map(validateStatus)).toEqual([false, false]);
    });

    it('gives null when no order has the token', async () => {
        get.mockResolvedValueOnce({ status: 404, data: null });

        await expect(ShopService.orderStatus('missing')).resolves.toBeNull();
    });

    it('throws the fallback message when the API cannot be reached', async () => {
        get.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));

        await expect(ShopService.orderStatus('abc123')).rejects.toThrow(new Error('Failed to load the order status'));
    });
});
