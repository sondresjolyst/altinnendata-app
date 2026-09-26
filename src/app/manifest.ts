import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { MetadataRoute } from 'next';
import { publicGetOptional } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import type { Branding } from '@/services/brandingService';
import { COMPANY } from '@/lib/company';
import { DEFAULT_LOCALE, localeHref } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

// Read per request: the icon comes from admin settings, and a prerendered copy would pin the build-time one.
export const dynamic = 'force-dynamic';

/** Short digest of the icon bytes, so the icon URL changes when the icon does. */
const version = (data: string | Buffer) => createHash('sha256').update(data).digest('hex').slice(0, 12);

/**
 * The installed-app manifest. The icon entry points at the `/icon` route, versioned by content:
 * Android only refreshes a home screen icon when the manifest changes, not when the same URL
 * starts serving new bytes.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const branding = await publicGetOptional<Branding>('/branding', { tags: [REVALIDATE_TARGETS.branding] });
    const icon = branding?.iconData && branding.iconContentType
        ? { v: version(branding.iconData), type: branding.iconContentType }
        : { v: version(await readFile(join(process.cwd(), 'public', 'icon.png'))), type: 'image/png' };

    const dict = getDictionary(DEFAULT_LOCALE);
    const start = localeHref(DEFAULT_LOCALE, '/');

    return {
        id: start,
        name: COMPANY.name,
        short_name: COMPANY.name,
        description: dict.meta.description,
        start_url: start,
        scope: '/',
        display: 'standalone',
        theme_color: '#00887a',
        background_color: '#ffffff',
        icons: [{ src: `/icon?v=${icon.v}`, sizes: 'any', type: icon.type, purpose: 'any' }],
    };
}
