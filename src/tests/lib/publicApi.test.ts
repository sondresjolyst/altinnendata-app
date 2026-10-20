import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
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

describe('during next build', () => {
    beforeEach(() => vi.stubEnv('NEXT_PHASE', PHASE_PRODUCTION_BUILD));
    afterEach(() => vi.unstubAllEnvs());

    it('builds the page empty with a warning when the API is unreachable', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        expect(await publicGet('/content/legal/terms')).toBeNull();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('/content/legal/terms'));
    });

    it('builds the page empty when the API answers with a server error', async () => {
        respond({}, { status: 503 });
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        expect(await publicGetWithMeta('/content/home')).toBeNull();
    });

    it('still throws once the build is over', async () => {
        vi.unstubAllEnvs();
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(publicGet('/content/legal/terms')).rejects.toThrow(PublicApiError);
    });
});

describe('a live read', () => {
    it('asks Next for no cache with revalidate 0, where the normal reads cache for a minute', async () => {
        const fetched = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ ok: true }));

        await publicGet('/shop/config');
        await publicGet('/shop/config', { revalidate: 0 });
        await publicGetOptional('/shop/config', { revalidate: 0 });

        expect(fetched.mock.calls[0]![1]).toEqual({ next: { revalidate: 60 } });
        expect(fetched.mock.calls[1]![1]).toEqual({ next: { revalidate: 0 } });
        expect(fetched.mock.calls[2]![1]).toEqual({ next: { revalidate: 0 } });
    });

    it('gives null for a failing API when optional', async () => {
        respond({}, { status: 500 });

        expect(await publicGetOptional('/shop/config', { revalidate: 0 })).toBeNull();
    });
});
