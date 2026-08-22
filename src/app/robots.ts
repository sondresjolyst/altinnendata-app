import { MetadataRoute } from 'next';
import { COMPANY } from '@/lib/company';
import { LOCALES } from '@/i18n/config';
import { PRIVATE_PATHS, PRIVATE_ROOT_PATHS } from '@/lib/seo/routes';
import { absoluteUrl, localePath } from '@/lib/seo/urls';
import { isIndexableEnvironment } from '@/lib/seo/environment';

// Read per request rather than baked at build, so the same image can be deployed to either
// environment and answer correctly.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
    // A non-production host serves the same content as the live site. Letting it be crawled
    // invites it into the index as a duplicate.
    if (!isIndexableEnvironment()) {
        return { rules: { userAgent: '*', disallow: '/' } };
    }

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            // Every route is under a locale segment, so a bare `/admin` would match nothing.
            disallow: [
                ...LOCALES.flatMap(locale => PRIVATE_PATHS.map(path => localePath(locale, path))),
                ...PRIVATE_ROOT_PATHS,
            ],
        },
        sitemap: absoluteUrl('/sitemap.xml'),
        host: COMPANY.url,
    };
}
