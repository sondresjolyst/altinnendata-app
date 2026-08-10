import { MetadataRoute } from 'next';
import { COMPANY } from '@/lib/company';
import { publicGet } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { BuildSummary } from '@/services/buildService';
import { LOCALES } from '@/i18n/config';

const BASE = COMPANY.url;

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    const staticPages: MetadataRoute.Sitemap = LOCALES.flatMap(locale => [
        { url: `${BASE}/${locale}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 1 },
        { url: `${BASE}/${locale}/builds`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
        { url: `${BASE}/${locale}/contact`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.5 },
        { url: `${BASE}/${locale}/terms`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
        { url: `${BASE}/${locale}/privacy`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
        { url: `${BASE}/${locale}/cookies`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
    ]);

    const buildPages: MetadataRoute.Sitemap = [];
    for (const locale of LOCALES) {
        const builds = await publicGet<BuildSummary[]>(`/builds?locale=${locale}`, { tags: [REVALIDATE_TARGETS.builds] }) ?? [];
        for (const build of builds) {
            buildPages.push({
                url: `${BASE}/${locale}/builds/${build.slug}`,
                lastModified: new Date(build.updatedAt),
                changeFrequency: 'monthly',
                priority: 0.6,
            });
        }
    }

    return [...staticPages, ...buildPages];
}
