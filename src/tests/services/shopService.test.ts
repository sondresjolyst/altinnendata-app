import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError } from 'axios';
import ShopService, { type OrderStatusInfo } from '@/services/shopService';

const get = vi.hoisted(() => vi.fn());
const post = vi.hoisted(() => vi.fn());
const revalidate = vi.hoisted(() => vi.fn());
vi.mock('@/services/publicClient', () => ({ default: { get } }));
vi.mock('@/services/axiosInstance', () => ({ default: { post } }));
vi.mock('@/lib/cacheTags', async importActual => ({ ...(await importActual<typeof import('@/lib/cacheTags')>()), revalidateTarget: revalidate }));

const status: OrderStatusInfo = { status: 'Reserved', reference: 'AID-001001-9C0D1E2F', buildTitle: 'Gaming PC', totalInOre: 1299000, deliveryMethod: 'Shipping' };

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

describe('ShopService.config', () => {
    beforeEach(() => get.mockReset());

    it('reads the public shop config for the locale, for the current terms version', async () => {
        const config = { buyButton: 'Everyone', delivery: [], termsVersion: '2026-10-20T08:00:00.000000Z' };
        get.mockResolvedValueOnce({ status: 200, data: config });

        await expect(ShopService.config('en')).resolves.toEqual(config);
        expect(get).toHaveBeenCalledWith('/shop/config?locale=en');
    });
});

describe('the order actions', () => {
    beforeEach(() => {
        post.mockReset();
        revalidate.mockReset();
    });

    it.each(['capture', 'cancel'] as const)('purges the build pages after %s', async action => {
        post.mockResolvedValueOnce({ data: { id: 7 } });

        await ShopService[action](7);

        expect(post).toHaveBeenCalledWith(`/admin/shop/orders/7/${action}`);
        expect(revalidate).toHaveBeenCalledWith('builds');
    });

    it.each(['capture', 'cancel'] as const)('leaves the build pages alone when %s fails', async action => {
        post.mockRejectedValueOnce(new Error('Boom'));

        await expect(ShopService[action](7)).rejects.toThrow();

        expect(revalidate).not.toHaveBeenCalled();
    });

    it('releases the build with an empty POST and purges the build pages', async () => {
        post.mockResolvedValueOnce({ data: { id: 7 } });

        await ShopService.releaseBuild(7);

        expect(post).toHaveBeenCalledWith('/admin/shop/orders/7/release-build');
        expect(revalidate).toHaveBeenCalledWith('builds');
    });
});

describe('ShopService.refund', () => {
    beforeEach(() => {
        post.mockReset();
        revalidate.mockReset();
    });

    it('posts the amount and the refunded total the page saw, then purges the build pages', async () => {
        post.mockResolvedValueOnce({ data: { id: 7 } });

        await ShopService.refund(7, 100000, 300000);

        expect(post).toHaveBeenCalledWith('/admin/shop/orders/7/refund', { amountInOre: 100000, expectedRefundedInOre: 300000 });
        expect(revalidate).toHaveBeenCalledWith('builds');
    });

    it('leaves the build pages alone when the refund fails', async () => {
        post.mockRejectedValueOnce(new Error('Boom'));

        await expect(ShopService.refund(7, 100000, 0)).rejects.toThrow();

        expect(revalidate).not.toHaveBeenCalled();
    });
});

describe('ShopService.checkout', () => {
    const request = { buildSlug: 'gaming-pc' } as never;
    const fetchSpy = vi.fn();

    beforeEach(() => {
        post.mockReset();
        revalidate.mockReset();
        fetchSpy.mockReset().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchSpy);
    });

    afterEach(() => vi.unstubAllGlobals());

    it('tells the app the build is held through the open route, not the admin purge', async () => {
        post.mockResolvedValueOnce({ data: { redirectUrl: 'https://vipps.test/x', token: 't' } });

        await expect(ShopService.checkout(request)).resolves.toEqual({ redirectUrl: 'https://vipps.test/x', token: 't' });

        expect(fetchSpy).toHaveBeenCalledWith('/api/shop/held', expect.objectContaining({ method: 'POST', keepalive: true, body: JSON.stringify({ slug: 'gaming-pc' }) }));
        expect(revalidate).not.toHaveBeenCalled();
    });

    it('does not wait for the route, so the redirect to Vipps is never delayed', async () => {
        post.mockResolvedValueOnce({ data: { redirectUrl: 'https://vipps.test/x', token: 't' } });
        fetchSpy.mockReturnValue(new Promise(() => {}));

        await expect(ShopService.checkout(request)).resolves.toMatchObject({ token: 't' });
    });

    it('still redirects when the route cannot be reached', async () => {
        post.mockResolvedValueOnce({ data: { redirectUrl: 'https://vipps.test/x', token: 't' } });
        fetchSpy.mockRejectedValue(new Error('offline'));

        await expect(ShopService.checkout(request)).resolves.toMatchObject({ token: 't' });
    });

    it('does not call the route when the checkout is refused', async () => {
        post.mockRejectedValueOnce(new Error('Boom'));

        await expect(ShopService.checkout(request)).rejects.toThrow();

        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
