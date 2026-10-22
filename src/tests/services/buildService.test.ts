import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError } from 'axios';
import BuildService from '@/services/buildService';

const get = vi.hoisted(() => vi.fn());
vi.mock('axios', async importOriginal => {
    const actual = await importOriginal<typeof import('axios')>();
    return { ...actual, default: { ...actual.default, create: () => ({ get }) } };
});
vi.mock('@/services/axiosInstance', () => ({ default: {} }));

describe('BuildService.findBySlug', () => {
    beforeEach(() => get.mockReset());

    it('returns the build on 200', async () => {
        get.mockResolvedValueOnce({ status: 200, data: { slug: 'spillmaskin' } });

        expect(await BuildService.findBySlug('spillmaskin', 'no')).toEqual({ slug: 'spillmaskin' });
    });

    it('encodes the slug in the path', async () => {
        get.mockResolvedValueOnce({ status: 200, data: {} });
        await BuildService.findBySlug('a/b?c', 'no');

        expect(get).toHaveBeenCalledWith('/builds/a%2Fb%3Fc', expect.anything());
    });

    it('returns null on 404', async () => {
        get.mockResolvedValueOnce({ status: 404, data: null });

        expect(await BuildService.findBySlug('borte', 'no')).toBeNull();
    });

    it('throws on 500', async () => {
        get.mockRejectedValueOnce(new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, { status: 500, data: {} } as never));

        await expect(BuildService.findBySlug('x', 'no')).rejects.toThrow();
    });
});
