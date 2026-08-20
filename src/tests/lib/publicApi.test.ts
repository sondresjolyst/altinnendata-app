import { describe, it, expect, vi, afterEach } from 'vitest';
import { publicGet, publicGetOptional, publicGetWithMeta, PublicApiError } from '@/lib/publicApi';

const respond = (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(body), {
            status: init.status ?? 200,
            headers: { 'content-type': 'application/json', ...init.headers },
        }),
    );

afterEach(() => vi.restoreAllMocks());

describe('publicGetWithMeta', () => {
    it('reports the edit time the endpoint sent', async () => {
        respond([], { headers: { 'last-modified': 'Fri, 14 Aug 2026 10:00:00 GMT' } });

        const result = await publicGetWithMeta<unknown[]>('/content/home');
        expect(result?.lastModified).toEqual(new Date('2026-08-14T10:00:00Z'));
    });

    it('reports none when the endpoint sends no header, or an unparseable one', async () => {
        respond([]);
        expect((await publicGetWithMeta('/content/home'))?.lastModified).toBeNull();

        respond([], { headers: { 'last-modified': 'whenever' } });
        expect((await publicGetWithMeta('/content/home'))?.lastModified).toBeNull();
    });
});

describe('publicGet', () => {
    it('returns the body', async () => {
        respond({ name: 'Altinnendata' });
        expect(await publicGet('/company')).toEqual({ name: 'Altinnendata' });
    });

    it('returns null for a resource that does not exist', async () => {
        respond({}, { status: 404 });
        expect(await publicGet('/builds/gone')).toBeNull();
    });

    /**
     * The distinction the whole module exists for: a page that renders its empty state from a
     * failed request looks like a valid render to Next, which caches it. Throwing keeps the
     * last good page in place instead.
     */
    it('throws when the API is unreachable, rather than reading as empty', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(publicGet('/builds?locale=no')).rejects.toThrow(PublicApiError);
    });

    it('throws on a server error', async () => {
        respond({}, { status: 503 });

        await expect(publicGet('/builds?locale=no')).rejects.toMatchObject({ status: 503 });
    });

    it('throws when the response is not the JSON it claims to be', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('<html>gateway</html>', { status: 200, headers: { 'content-type': 'application/json' } }),
        );

        await expect(publicGet('/company')).rejects.toThrow(PublicApiError);
    });

    it('names the path it failed on', async () => {
        respond({}, { status: 500 });

        await expect(publicGet('/builds?locale=no')).rejects.toThrow('/builds?locale=no');
    });
});

describe('publicGetOptional', () => {
    it('yields null instead of throwing, for data a page can do without', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
        expect(await publicGetOptional('/branding')).toBeNull();

        respond({}, { status: 503 });
        expect(await publicGetOptional('/branding')).toBeNull();
    });

    it('still returns the body when the request succeeds', async () => {
        respond({ logoData: 'x' });
        expect(await publicGetOptional('/branding')).toEqual({ logoData: 'x' });
    });
});
