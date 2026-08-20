import { describe, it, expect } from 'vitest';
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
