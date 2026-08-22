import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import robots from '@/app/robots';
import { LOCALES } from '@/i18n/config';
import { PRIVATE_PATHS } from '@/lib/seo/routes';
import { absoluteUrl } from '@/lib/seo/urls';

describe('robots.txt', () => {
    const disallow = [robots().rules].flat()[0].disallow as string[];

    it('disallows every private path under every locale', () => {
        for (const locale of LOCALES) {
            for (const path of PRIVATE_PATHS) {
                expect(disallow).toContain(`/${locale}${path}`);
            }
        }
    });

    it('does not rely on unprefixed paths, which match no served route', () => {
        expect(disallow).not.toContain('/admin');
    });

    it('advertises the sitemap absolutely', () => {
        expect(robots().sitemap).toBe(absoluteUrl('/sitemap.xml'));
    });
});

describe('robots.txt outside production', () => {
    const original = { ...process.env };
    // The environment is inferred from these when SITE_ENV says nothing, so pin them.
    beforeEach(() => {
        delete process.env.NEXTAUTH_URL;
        delete process.env.NEXT_PUBLIC_API_URL;
    });
    afterEach(() => { process.env = { ...original }; });

    const rules = () => [robots().rules].flat()[0];

    it('shuts a non-production host out entirely', () => {
        process.env.SITE_ENV = 'dev';
        expect(rules().disallow).toBe('/');
        expect(rules().allow).toBeUndefined();
    });

    /** A missing variable must never be what deindexes the live site. */
    it('indexes by default, so an unset variable is safe', () => {
        delete process.env.SITE_ENV;
        expect(rules().allow).toBe('/');

        process.env.SITE_ENV = '';
        expect(rules().allow).toBe('/');

        process.env.SITE_ENV = 'production';
        expect(rules().allow).toBe('/');
    });

    it('ignores casing and stray whitespace around the value', () => {
        process.env.SITE_ENV = '  Production  ';
        expect(rules().allow).toBe('/');

        process.env.SITE_ENV = 'DEV';
        expect(rules().disallow).toBe('/');
    });

    it('offers no sitemap from a host that should not be crawled', () => {
        process.env.SITE_ENV = 'dev';
        expect(robots().sitemap).toBeUndefined();
    });
});
