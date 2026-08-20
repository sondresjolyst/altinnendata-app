import { MetadataRoute } from 'next';
import { publicGet, publicGetWithMeta } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { BuildSummary } from '@/services/buildService';
import { Section } from '@/types/content';
import { LegalPage } from '@/services/legalService';
import { LOCALES, type Locale } from '@/i18n/config';
import { latest, localeEntries, parseTimestamp } from '@/lib/seo/sitemap';

export const revalidate = 3600;

const LEGAL_KEYS = ['terms', 'privacy', 'cookies'] as const;

type ByLocale<T> = Partial<Record<Locale, T>>;

async function forEachLocale<T>(load: (locale: Locale) => Promise<T>): Promise<ByLocale<T>> {
    const loaded = await Promise.all(LOCALES.map(async locale => [locale, await load(locale)] as const));
    return Object.fromEntries(loaded) as ByLocale<T>;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const builds = await forEachLocale(locale =>
        publicGet<BuildSummary[]>(`/builds?locale=${locale}`, { tags: [REVALIDATE_TARGETS.builds] })
            .then(list => list ?? []));

    const legal = await forEachLocale(async locale =>
        Object.fromEntries(await Promise.all(LEGAL_KEYS.map(async key => [
            key,
            parseTimestamp((await publicGet<LegalPage>(`/content/legal/${key}?locale=${locale}`, { tags: [REVALIDATE_TARGETS.legal] }))?.updatedAt),
        ] as const))) as Partial<Record<typeof LEGAL_KEYS[number], Date>>);

    // The sections carry no timestamp of their own; the API reports it in the response header.
    const home = await forEachLocale(locale =>
        publicGetWithMeta<Section[]>(`/content/home?locale=${locale}`, { tags: [REVALIDATE_TARGETS.home] })
            .then(response => response?.lastModified ?? undefined));

    const buildsUpdatedAt = (locale: Locale) =>
        latest((builds[locale] ?? []).map(build => parseTimestamp(build.updatedAt)));

    /** Locales a slug is published in, so the sitemap only claims translations that exist. */
    const localesWithSlug = (slug: string) =>
        LOCALES.filter(locale => (builds[locale] ?? []).some(build => build.slug === slug));

    const slugs = [...new Set(LOCALES.flatMap(locale => (builds[locale] ?? []).map(build => build.slug)))];

    return [
        ...localeEntries('', { lastModified: locale => home[locale] }),
        ...localeEntries('/builds', { lastModified: buildsUpdatedAt }),
        ...localeEntries('/contact'),
        ...LEGAL_KEYS.flatMap(key => localeEntries(`/${key}`, {
            lastModified: locale => legal[locale]?.[key],
        })),
        ...slugs.flatMap(slug => localeEntries(`/builds/${slug}`, {
            locales: localesWithSlug(slug),
            lastModified: locale =>
                parseTimestamp((builds[locale] ?? []).find(build => build.slug === slug)?.updatedAt),
        })),
    ];
}
