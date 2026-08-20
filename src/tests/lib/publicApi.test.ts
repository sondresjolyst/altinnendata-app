import { describe, it, expect, vi, afterEach } from 'vitest';
import { publicGet, publicGetWithMeta } from '@/lib/publicApi';

const respond = (body: unknown, headers: Record<string, string> = {}, status = 200) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } }),
    );

afterEach(() => vi.restoreAllMocks());

describe('publicGetWithMeta', () => {
    it('reports the edit time the endpoint sent', async () => {
        respond([], { 'last-modified': 'Fri, 14 Aug 2026 10:00:00 GMT' });

        const result = await publicGetWithMeta<unknown[]>('/content/home');
        expect(result?.lastModified).toEqual(new Date('2026-08-14T10:00:00Z'));
    });

    it('reports none when the endpoint sends no header', async () => {
        respond([]);
        expect((await publicGetWithMeta('/content/home'))?.lastModified).toBeNull();
    });

    it('ignores a header that is not a date', async () => {
        respond([], { 'last-modified': 'whenever' });
        expect((await publicGetWithMeta('/content/home'))?.lastModified).toBeNull();
    });

    it('yields nothing on an error status or a failed request', async () => {
        respond({}, {}, 500);
        expect(await publicGetWithMeta('/content/home')).toBeNull();

        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
        expect(await publicGetWithMeta('/content/home')).toBeNull();
    });
});

describe('publicGet', () => {
    it('returns just the body, for callers with no use for the metadata', async () => {
        respond({ name: 'Altinnendata' }, { 'last-modified': 'Fri, 14 Aug 2026 10:00:00 GMT' });
        expect(await publicGet('/company')).toEqual({ name: 'Altinnendata' });
    });

    it('returns null rather than throwing when the API is unreachable', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
        expect(await publicGet('/company')).toBeNull();
    });
});
