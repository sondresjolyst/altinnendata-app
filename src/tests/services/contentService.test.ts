import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContentService from '@/services/contentService';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/services/publicClient', () => ({ default: { get } }));
vi.mock('@/services/axiosInstance', () => ({ default: { put: vi.fn() } }));

describe('ContentService.getHome', () => {
    beforeEach(() => get.mockReset());

    it('reads the home page sections through the shared public client', async () => {
        const sections = [{ id: 's1', type: 'text', visible: true, heading: '', body: 'Hei' }];
        get.mockResolvedValueOnce({ data: sections });

        expect(await ContentService.getHome('no')).toEqual(sections);
        expect(get).toHaveBeenCalledWith('/content/home', { params: { locale: 'no' } });
    });

    it('gives no sections when the answer is not a list', async () => {
        get.mockResolvedValueOnce({ data: { title: 'not a list' } });

        expect(await ContentService.getHome('en')).toEqual([]);
    });

    it('gives no sections when the API cannot be reached', async () => {
        get.mockRejectedValueOnce(new Error('Network Error'));

        expect(await ContentService.getHome('no')).toEqual([]);
    });
});
