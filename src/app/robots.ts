import { MetadataRoute } from 'next';
import { COMPANY } from '@/lib/company';
import { LOCALES } from '@/i18n/config';
import { PRIVATE_PATHS, PRIVATE_ROOT_PATHS } from '@/lib/seo/routes';
import { absoluteUrl, localePath } from '@/lib/seo/urls';
import { isIndexableEnvironment } from '@/lib/seo/environment';

// Read per request, so a deployment can be pointed at either environment.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
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
