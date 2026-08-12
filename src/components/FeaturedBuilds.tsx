import Link from 'next/link';
import { publicGet } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { BuildSummary } from '@/services/buildService';
import { getDictionary } from '@/i18n/dictionaries';
import { localeHref, type Locale } from '@/i18n/config';
import type { FeedAvailability } from '@/types/content';
import BuildCard from './BuildCard';

export default async function FeaturedBuilds({
    locale,
    heading,
    limit = 6,
    availability = 'all',
}: {
    locale: Locale;
    heading?: string;
    limit?: number;
    availability?: FeedAvailability;
}) {
    const filter = availability === 'all' ? '' : `&availability=${availability}`;
    const builds = await publicGet<BuildSummary[]>(`/builds?locale=${locale}${filter}`, { tags: [REVALIDATE_TARGETS.builds] });
    const dict = getDictionary(locale);

    if (!builds || builds.length === 0) return null;

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-end justify-between mb-6">
                {heading && <h2 className="text-2xl font-bold text-gray-900">{heading}</h2>}
                <Link href={localeHref(locale, '/builds')} className="text-sm font-semibold text-gray-700 hover:text-gray-900">
                    {dict.common.viewAll} →
                </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {builds.slice(0, limit).map(build => <BuildCard key={build.id} build={build} locale={locale} />)}
            </div>
        </section>
    );
}
