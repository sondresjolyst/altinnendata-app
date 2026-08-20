import { describe, it, expect, vi, afterEach } from 'vitest';
import sitemap from '@/app/sitemap';
import { COMPANY } from '@/lib/company';

const build = (slug: string, updatedAt: string) => ({ slug, updatedAt });

/** Answers by path, so each locale and legal key can return its own payload. */
function mockApi(routes: Record<string, unknown>) {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        const match = Object.keys(routes).find(path => url.includes(path));
        if (match == null) return new Response('null', { status: 404 });
        return new Response(JSON.stringify(routes[match]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    });
}

const urls = (entries: Awaited<ReturnType<typeof sitemap>>) => entries.map(entry => entry.url);

afterEach(() => vi.restoreAllMocks());

describe('sitemap', () => {
    it('lists every static page in both locales', async () => {
        mockApi({ '/builds?locale=': [] });
        const listed = urls(await sitemap());

        for (const path of ['', '/builds', '/contact', '/terms', '/privacy', '/cookies']) {
            expect(listed).toContain(`${COMPANY.url}/no${path}`);
            expect(listed).toContain(`${COMPANY.url}/en${path}`);
        }
    });

    it('dates the builds index from the newest build in that locale', async () => {
        mockApi({
            '/builds?locale=no': [build('a', '2026-01-01T00:00:00Z'), build('b', '2026-06-01T00:00:00Z')],
            '/builds?locale=en': [build('a', '2026-02-01T00:00:00Z')],
        });
        const entries = await sitemap();

        expect(entries.find(e => e.url === `${COMPANY.url}/no/builds`)?.lastModified)
            .toEqual(new Date('2026-06-01T00:00:00Z'));
        expect(entries.find(e => e.url === `${COMPANY.url}/en/builds`)?.lastModified)
            .toEqual(new Date('2026-02-01T00:00:00Z'));
    });

    it('claims a build only in the locales it is published in', async () => {
        mockApi({
            '/builds?locale=no': [build('bare-norsk', '2026-01-01T00:00:00Z')],
            '/builds?locale=en': [],
        });
        const entries = await sitemap();
        const entry = entries.find(e => e.url === `${COMPANY.url}/no/builds/bare-norsk`);

        expect(entry).toBeDefined();
        expect(urls(entries)).not.toContain(`${COMPANY.url}/en/builds/bare-norsk`);
        // x-default still points at it: the default locale is one of the locales it exists in.
        expect(entry?.alternates?.languages).toEqual({
            no: `${COMPANY.url}/no/builds/bare-norsk`,
            'x-default': `${COMPANY.url}/no/builds/bare-norsk`,
        });
    });

    it('lists a build once per locale, not once per locale it was seen in', async () => {
        mockApi({ '/builds?locale=': [build('felles', '2026-01-01T00:00:00Z')] });
        const listed = urls(await sitemap());

        expect(listed.filter(url => url.endsWith('/no/builds/felles'))).toHaveLength(1);
    });

    it('omits lastModified for pages whose content reports none', async () => {
        mockApi({ '/builds?locale=': [] });
        const entries = await sitemap();

        // The front page: the API answers without a Last-Modified header here.
        expect(entries.find(e => e.url === `${COMPANY.url}/no`)?.lastModified).toBeUndefined();
        // Contact is a static page with no content behind it at all.
        expect(entries.find(e => e.url === `${COMPANY.url}/no/contact`)?.lastModified).toBeUndefined();
    });

    /**
     * A sitemap listing only the static pages would tell Google every build had been removed,
     * and Next would cache it for the hour. Failing leaves the previous sitemap in place.
     */
    it('fails rather than publishing a sitemap with no builds in it', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

        await expect(sitemap()).rejects.toThrow();
    });
});
