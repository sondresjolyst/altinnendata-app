import type { Metadata } from 'next';
import { COMPANY } from '@/lib/company';
import { DEFAULT_LOCALE, LOCALES, LOCALE_TAGS, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { localePath } from './urls';

/** Dimensions of the generated share image, shared with the route that renders it. */
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** Robots directive for pages that exist for signed-in users only. */
export const NOINDEX: Metadata['robots'] = { index: false, follow: false };

export interface PageMetadataInput {
    locale: Locale;
    /** Path below the locale segment, e.g. `/builds` or `/builds/my-pc`. Omit for the front page. */
    path?: string;
    /** Page title, without the site-name suffix — the root layout's template appends that. */
    title?: string;
    description?: string;
    /** Image URLs for the share preview. Falls back to the generated default for the locale. */
    images?: string[];
}

/**
 * Language alternates for one page, keyed by BCP 47 tag.
 *
 * `x-default` points at the default locale because `/` redirects there; without it Google
 * has no instruction for visitors whose language matches neither alternate.
 */
function languageAlternates(path: string): Record<string, string> {
    return {
        ...Object.fromEntries(LOCALES.map(l => [LOCALE_TAGS[l], localePath(l, path)])),
        'x-default': localePath(DEFAULT_LOCALE, path),
    };
}

/** Canonical, hreflang set and Open Graph for one public page, from its locale and path. */
/**
 * The default share preview for a locale. Explicit rather than Next's `opengraph-image` file
 * convention, which a page's own `openGraph` block replaces — leaving that page with no image.
 */
function defaultShareImage(locale: Locale) {
    const dict = getDictionary(locale);
    return {
        url: localePath(locale, '/og'),
        ...SHARE_IMAGE_SIZE,
        type: 'image/png',
        alt: `${COMPANY.name} — ${dict.meta.tagline}`,
    };
}

export function pageMetadata({ locale, path = '', title, description, images }: PageMetadataInput): Metadata {
    const canonical = localePath(locale, path);

    return {
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        alternates: {
            canonical,
            languages: languageAlternates(path),
        },
        openGraph: {
            type: 'website',
            siteName: COMPANY.name,
            locale: LOCALE_TAGS[locale],
            url: canonical,
            ...(title ? { title } : {}),
            ...(description ? { description } : {}),
            images: images ?? [defaultShareImage(locale)],
        },
    };
}

/**
 * Metadata for the locale root layout: the front page's own, plus what every page below it
 * inherits — the title template, `metadataBase`, the manifest and the default index directive.
 */
export function siteMetadata(locale: Locale): Metadata {
    const dict = getDictionary(locale);
    const title = `${COMPANY.name} — ${dict.meta.tagline}`;

    return {
        ...pageMetadata({ locale, title, description: dict.meta.description }),
        metadataBase: new URL(COMPANY.url),
        title: {
            default: title,
            template: `%s — ${COMPANY.name}`,
        },
        manifest: '/manifest.json',
        robots: { index: true, follow: true },
    };
}
