import { publicGet } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { BuildSummary } from '@/services/buildService';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import BuildCard from './BuildCard';

export default async function FeaturedBuilds({ locale, limit = 3 }: { locale: Locale; limit?: number }) {
    const builds = await publicGet<BuildSummary[]>(`/builds?locale=${locale}`, { tags: [REVALIDATE_TARGETS.builds] });
    const dict = getDictionary(locale);

    if (!builds || builds.length === 0) {
        return <p className="text-gray-500">{dict.builds.empty}</p>;
    }

    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {builds.slice(0, limit).map(build => <BuildCard key={build.id} build={build} locale={locale} />)}
        </div>
    );
}
