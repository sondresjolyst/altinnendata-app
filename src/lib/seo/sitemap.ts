import type { MetadataRoute } from 'next';
import { DEFAULT_LOCALE, LOCALES, LOCALE_TAGS, type Locale } from '@/i18n/config';
import { absoluteLocaleUrl } from './urls';

type SitemapEntry = MetadataRoute.Sitemap[number];

export interface LocaleEntryOptions {
    /** Locales the page exists in. Defaults to all of them. */
    locales?: readonly Locale[];
    /** When the page's content last changed, per locale. Omitted entirely when unknown. */
    lastModified?: (locale: Locale) => Date | undefined;
}

/**
 * One sitemap entry per locale a page exists in, each listing the others as alternates. Only
 * locales the page is served in are listed, so no entry advertises a translation that does not
 * exist, and `lastModified` is omitted when unknown — an invented one teaches crawlers to
 * ignore the field.
 */
export function localeEntries(path: string, options: LocaleEntryOptions = {}): MetadataRoute.Sitemap {
    const locales = options.locales ?? LOCALES;
    if (locales.length === 0) return [];

    const languages: Record<string, string> = {
        ...Object.fromEntries(locales.map(locale => [LOCALE_TAGS[locale], absoluteLocaleUrl(locale, path)])),
    };
    if (locales.includes(DEFAULT_LOCALE)) {
        languages['x-default'] = absoluteLocaleUrl(DEFAULT_LOCALE, path);
    }

    return locales.map((locale): SitemapEntry => {
        const lastModified = options.lastModified?.(locale);
        return {
            url: absoluteLocaleUrl(locale, path),
            ...(lastModified ? { lastModified } : {}),
            alternates: { languages },
        };
    });
}

/** Latest of a set of timestamps, or undefined when there are none. */
export function latest(dates: readonly (Date | undefined)[]): Date | undefined {
    const known = dates.filter((date): date is Date => date != null);
    if (known.length === 0) return undefined;
    return known.reduce((newest, date) => (date > newest ? date : newest));
}

/** Parses an API timestamp, tolerating a missing or malformed value. */
export function parseTimestamp(value: string | null | undefined): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}
