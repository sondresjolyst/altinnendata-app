import { describe, it, expect, vi, beforeEach } from 'vitest';
import MarketingService from '@/services/marketingService';

const get = vi.hoisted(() => vi.fn());
const put = vi.hoisted(() => vi.fn());
const revalidate = vi.hoisted(() => vi.fn());
vi.mock('@/services/axiosInstance', () => ({ default: { get, put } }));
vi.mock('@/lib/cacheTags', async importActual => ({ ...(await importActual<typeof import('@/lib/cacheTags')>()), revalidateTarget: revalidate }));

describe('MarketingService', () => {
    beforeEach(() => {
        get.mockReset();
        put.mockReset();
        revalidate.mockReset();
    });

    it('reads the admin settings', async () => {
        get.mockResolvedValueOnce({ data: { metaPixelId: '123456789012345' } });

        await expect(MarketingService.getSettings()).resolves.toEqual({ metaPixelId: '123456789012345' });
        expect(get).toHaveBeenCalledWith('/admin/marketing/settings');
    });

    it('saves the ID and purges the marketing tag after the save', async () => {
        put.mockResolvedValueOnce({ data: { metaPixelId: '123456789012345' } });

        await expect(MarketingService.updateSettings({ metaPixelId: '123456789012345' })).resolves.toEqual({ metaPixelId: '123456789012345' });

        expect(put).toHaveBeenCalledWith('/admin/marketing/settings', { metaPixelId: '123456789012345' });
        expect(revalidate).toHaveBeenCalledWith('marketing');
        expect(put.mock.invocationCallOrder[0]).toBeLessThan(revalidate.mock.invocationCallOrder[0]);
    });

    it('purges nothing when the API refuses the save', async () => {
        put.mockRejectedValueOnce(Object.assign(new Error('Request failed with status code 400'), { isAxiosError: true, response: { status: 400, data: { errors: { metaPixelId: ['x'] } } } }));

        await expect(MarketingService.updateSettings({ metaPixelId: '12' })).rejects.toThrow();
        expect(revalidate).not.toHaveBeenCalled();
    });
});
