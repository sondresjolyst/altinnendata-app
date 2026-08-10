import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BuildCard from '@/components/BuildCard';
import { BuildSummary } from '@/services/buildService';
import { publicGet } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { isLocale, LOCALES, LOCALE_TAGS } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    const dict = getDictionary(locale);

    return {
        title: dict.builds.title,
        description: dict.builds.intro,
        alternates: {
            canonical: `/${locale}/builds`,
            languages: Object.fromEntries(LOCALES.map(l => [LOCALE_TAGS[l], `/${l}/builds`])),
        },
    };
}

export default async function BuildsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();

    const dict = getDictionary(locale);
    const builds = await publicGet<BuildSummary[]>(`/builds?locale=${locale}`, { tags: [REVALIDATE_TARGETS.builds] });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <h1 className="text-3xl font-black tracking-tight text-gray-900">{dict.builds.title}</h1>
            <p className="mt-2 text-gray-600 max-w-2xl">{dict.builds.intro}</p>

            {!builds || builds.length === 0 ? (
                <p className="mt-10 text-gray-500">{dict.builds.empty}</p>
            ) : (
                <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {builds.map(build => <BuildCard key={build.id} build={build} locale={locale} />)}
                </div>
            )}
        </div>
    );
}
