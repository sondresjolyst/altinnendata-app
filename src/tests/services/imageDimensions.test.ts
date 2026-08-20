import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchImageDimensions } from '@/services/imageService';

const mockFetch = (payload: unknown) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } }),
    );

afterEach(() => vi.restoreAllMocks());

describe('fetchImageDimensions', () => {
    it('asks for every distinct id once, in one request', async () => {
        const fetchSpy = mockFetch([]);
        await fetchImageDimensions(['a', 'b', 'a', null]);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(String(fetchSpy.mock.calls[0][0])).toContain('ids=a,b');
    });

    it('keys the dimensions by image id', async () => {
        mockFetch([{ id: 'a', width: 1600, height: 900 }]);
        expect(await fetchImageDimensions(['a'])).toEqual({ a: { width: 1600, height: 900 } });
    });

    it('makes no request when there is nothing to measure', async () => {
        const fetchSpy = mockFetch([]);
        expect(await fetchImageDimensions([null, null])).toEqual({});
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('yields no dimensions when the request fails', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
        expect(await fetchImageDimensions(['a'])).toEqual({});
    });
});
