import { publicGet } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { BuildSummary } from '@/services/buildService';
import { CategoryTree } from '@/services/componentService';
import { StatsSection } from '@/types/content';
import type { Locale } from '@/i18n/config';

export default async function StatsBand({ section, locale }: { section: StatsSection; locale: Locale }) {
    const needsBuilds = section.items.some(i => i.source === 'builds');
    const needsParts = section.items.some(i => i.source === 'parts');

    const builds = needsBuilds
        ? await publicGet<BuildSummary[]>(`/builds?locale=${locale}`, { tags: [REVALIDATE_TARGETS.builds] })
        : null;
    const tree = needsParts
        ? await publicGet<CategoryTree[]>(`/components/tree?locale=${locale}`)
        : null;

    const partCount = tree?.reduce((total, category) => total + category.parts.length, 0) ?? null;

    const display = (item: StatsSection['items'][number]): string => {
        if (item.source === 'builds') return builds != null ? `${builds.length}` : '—';
        if (item.source === 'parts') return partCount != null ? `${partCount}` : '—';
        return item.value;
    };

    return (
        <section className="bg-gray-50 border-y border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                {section.heading && <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">{section.heading}</h2>}
                <dl className="flex flex-wrap justify-center gap-4 sm:gap-6">
                    {section.items.map((item, i) => (
                        <div key={i} className="rounded-2xl border border-gray-200 bg-white shadow-sm px-8 py-6 text-center min-w-[10rem]">
                            <dt className="text-4xl sm:text-5xl font-black text-gray-900 tabular-nums">{display(item)}</dt>
                            <dd className="mt-1 text-sm text-gray-600">{item.label}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}
