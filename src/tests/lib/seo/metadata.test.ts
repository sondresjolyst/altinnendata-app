import { describe, it, expect } from 'vitest';
import type { Metadata } from 'next';
import { pageMetadata, siteMetadata } from '@/lib/seo/metadata';
import { DEFAULT_LOCALE, LOCALES, LOCALE_TAGS } from '@/i18n/config';

/** Next types the alternates map by locale tag; tests look entries up by string key. */
const languagesOf = (meta: Metadata): Record<string, unknown> =>
    (meta.alternates?.languages ?? {}) as Record<string, unknown>;

describe('pageMetadata', () => {
    it('canonicalises to the requested locale', () => {
        expect(pageMetadata({ locale: 'en', path: '/builds' }).alternates?.canonical).toBe('/en/builds');
    });

    it('lists every locale as a language alternate', () => {
        const languages = languagesOf(pageMetadata({ locale: 'no', path: '/contact' }));
        for (const locale of LOCALES) {
            expect(languages[LOCALE_TAGS[locale]]).toBe(`/${locale}/contact`);
        }
    });

    it('points x-default at the default locale', () => {
        const languages = languagesOf(pageMetadata({ locale: 'en', path: '/builds' }));
        expect(languages['x-default']).toBe(`/${DEFAULT_LOCALE}/builds`);
    });

    it('mirrors the canonical url into Open Graph', () => {
        const meta = pageMetadata({ locale: 'no', path: '/builds/gaming-pc', title: 'Gaming PC' });
        expect(meta.openGraph).toMatchObject({ url: '/no/builds/gaming-pc', title: 'Gaming PC' });
    });

    it('omits optional fields rather than emitting empty ones', () => {
        const meta = pageMetadata({ locale: 'no' });
        expect(meta.title).toBeUndefined();
        expect(meta.description).toBeUndefined();
        expect(meta.openGraph).not.toHaveProperty('images');
    });
});

describe('siteMetadata', () => {
    it('carries the title template and index directive for every page below it', () => {
        const meta = siteMetadata('no');
        expect(meta.title).toHaveProperty('template');
        expect(meta.robots).toEqual({ index: true, follow: true });
        expect(meta.alternates?.canonical).toBe('/no');
    });
});
