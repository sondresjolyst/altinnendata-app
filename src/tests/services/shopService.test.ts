import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError } from 'axios';
import ShopService, { type OrderStatusInfo } from '@/services/shopService';

const get = vi.hoisted(() => vi.fn());
const post = vi.hoisted(() => vi.fn());
const revalidate = vi.hoisted(() => vi.fn());
vi.mock('@/services/publicClient', () => ({ default: { get } }));
vi.mock('@/services/axiosInstance', () => ({ default: { post } }));
vi.mock('@/lib/cacheTags', async importActual => ({ ...(await importActual<typeof import('@/lib/cacheTags')>()), revalidateTarget: revalidate }));

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

    it('encodes the token in the path', async () => {
        get.mockResolvedValueOnce({ status: 404, data: null });

        await ShopService.orderStatus('../public/x?y=1');

        expect(get.mock.calls[0][0]).toBe('/shop/orders/..%2Fpublic%2Fx%3Fy%3D1/status');
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

describe('the order actions', () => {
    beforeEach(() => {
        post.mockReset();
        revalidate.mockReset();
    });

    it.each(['capture', 'cancel', 'refund'] as const)('purges the build pages after %s', async action => {
        post.mockResolvedValueOnce({ data: { id: 7 } });

        await ShopService[action](7);

        expect(post).toHaveBeenCalledWith(`/admin/shop/orders/7/${action}`);
        expect(revalidate).toHaveBeenCalledWith('builds');
    });

    it.each(['capture', 'cancel', 'refund'] as const)('leaves the build pages alone when %s fails', async action => {
        post.mockRejectedValueOnce(new Error('Boom'));

        await expect(ShopService[action](7)).rejects.toThrow();

        expect(revalidate).not.toHaveBeenCalled();
    });
});
