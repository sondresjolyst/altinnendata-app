import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BuildCard from '@/components/BuildCard';
import { Availability, BuildSummary } from '@/services/buildService';
import { publicGet } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo/metadata';
import JsonLd from '@/components/JsonLd';
import { breadcrumbNode, itemListNode } from '@/lib/seo/schema/navigation';
import { absoluteLocaleUrl, localePath } from '@/lib/seo/urls';

export const revalidate = 60;

const GROUPS: { key: Availability; dictKey: 'available' | 'reserved' | 'sold' }[] = [
    { key: 'Available', dictKey: 'available' },
    { key: 'Reserved', dictKey: 'reserved' },
    { key: 'Sold', dictKey: 'sold' },
];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    const dict = getDictionary(locale);

    return pageMetadata({
        locale,
        path: '/builds',
        title: dict.builds.title,
        description: dict.builds.intro,
    });
}

export default async function BuildsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();

    const dict = getDictionary(locale as Locale);
    const builds = await publicGet<BuildSummary[]>(`/builds?locale=${locale}`, { tags: [REVALIDATE_TARGETS.builds] }) ?? [];

    const pageUrl = absoluteLocaleUrl(locale, '/builds');

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <JsonLd nodes={[
                breadcrumbNode([
                    { name: dict.nav.home, path: localePath(locale) },
                    { name: dict.builds.title },
                ], pageUrl),
                itemListNode(builds.map(build => localePath(locale, `/builds/${build.slug}`)), pageUrl),
            ]} />
            <h1 className="text-3xl font-black tracking-tight text-gray-900">{dict.builds.title}</h1>
            <p className="mt-2 text-gray-600 max-w-2xl">{dict.builds.intro}</p>

            {builds.length === 0 ? (
                <p className="mt-10 text-gray-500">{dict.builds.empty}</p>
            ) : (
                GROUPS.map(group => {
                    const inGroup = builds.filter(build => build.availability === group.key);
                    if (inGroup.length === 0) return null;

                    return (
                        <section key={group.key} className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900">{dict.builds.groups[group.dictKey]}</h2>
                            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {inGroup.map(build => <BuildCard key={build.id} build={build} locale={locale} />)}
                            </div>
                        </section>
                    );
                })
            )}
        </div>
    );
}
