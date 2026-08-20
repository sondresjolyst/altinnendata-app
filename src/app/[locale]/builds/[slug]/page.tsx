import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BuildGallery from '@/components/BuildGallery';
import Markdown from '@/components/Markdown';
import { BuildDetail, coverImageSrc } from '@/services/buildService';
import { publicGet } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { formatDate, formatPrice } from '@/lib/format';
import { isLocale, localeHref, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo/metadata';

export const revalidate = 60;

const fetchBuild = (slug: string, locale: Locale) =>
    publicGet<BuildDetail>(`/builds/${slug}?locale=${locale}`, { tags: [REVALIDATE_TARGETS.builds] });

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    if (!isLocale(locale)) return {};

    const build = await fetchBuild(slug, locale);
    if (!build) return {};

    return pageMetadata({
        locale,
        path: `/builds/${slug}`,
        title: build.title,
        description: build.summary ?? undefined,
        images: build.coverImageId ? [coverImageSrc(build)!] : undefined,
    });
}

export default async function BuildPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params;
    if (!isLocale(locale)) notFound();

    const build = await fetchBuild(slug, locale);
    if (!build) notFound();

    const dict = getDictionary(locale);
    const status = build.availability.toLowerCase() as 'available' | 'reserved' | 'sold';
    const statusTone = {
        available: 'bg-emerald-100 text-emerald-800',
        reserved: 'bg-amber-100 text-amber-800',
        sold: 'bg-gray-200 text-gray-700',
    }[status];

    const gallery = build.imageIds;

    return (
        <article className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <Link href={localeHref(locale, '/builds')} className="text-sm font-semibold text-gray-500 hover:text-gray-900">
                ← {dict.builds.title}
            </Link>

            <div className="mt-6 grid gap-10 lg:grid-cols-2">
                <BuildGallery imageIds={gallery} alt={build.title} />

                <div className="min-w-0">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone}`}>
                        {dict.builds.availability[status]}
                    </span>

                    <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-gray-900 break-words">{build.title}</h1>

                    {build.summary && <p className="mt-3 text-gray-600">{build.summary}</p>}

                    {build.priceNok != null && (
                        <p className="mt-6 text-3xl font-extrabold text-gray-900">{formatPrice(build.priceNok, locale)}</p>
                    )}

                    <dl className="mt-6 space-y-1 text-sm text-gray-500">
                        {build.builtOn && (
                            <div className="flex gap-2">
                                <dt>{dict.builds.builtOn}:</dt>
                                <dd className="text-gray-900">{formatDate(build.builtOn, locale)}</dd>
                            </div>
                        )}
                        {build.category && (
                            <div className="flex gap-2">
                                <dt>{dict.builds.category.label}:</dt>
                                <dd className="text-gray-900">
                                    {dict.builds.category[build.category as keyof typeof dict.builds.category] ?? build.category}
                                </dd>
                            </div>
                        )}
                    </dl>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href={localeHref(locale, `/contact?build=${build.slug}`)}
                            className="rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-3 hover:brightness-95 transition"
                        >
                            {status === 'sold' ? dict.builds.askSimilar : dict.builds.askAbout}
                        </Link>
                        {build.finnUrl && (
                            <a
                                href={build.finnUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg border border-gray-300 text-gray-900 font-semibold px-6 py-3 hover:bg-gray-50 transition"
                            >
                                {dict.builds.seeOnFinn}
                            </a>
                        )}
                    </div>

                </div>
            </div>

            {build.components.length > 0 && (
                <details open className="mt-12 max-w-3xl rounded-2xl border border-gray-200 bg-white">
                    <summary className="cursor-pointer list-none px-5 py-4 text-lg font-bold text-gray-900 marker:content-none">
                        {dict.builds.specs}
                    </summary>
                    <div className="overflow-x-auto">
                        <table className="w-full border-t border-gray-200 text-sm">
                            <tbody className="divide-y divide-gray-200">
                                {build.components.map(component => (
                                    <tr key={component.id}>
                                        <th scope="row" className="w-32 px-4 py-2.5 text-left align-top font-medium text-gray-500 sm:w-48 sm:px-5">
                                            {component.categoryName ?? component.categoryKey ?? ''}
                                        </th>
                                        <td className="px-4 py-2.5 text-gray-900 sm:px-5">
                                            {component.name}
                                            {component.details && <span className="text-gray-500"> — {component.details}</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}

            {build.description && build.description !== build.summary && (
                <section className="mt-12 max-w-3xl">
                    <h2 className="text-lg font-bold text-gray-900">{dict.builds.description}</h2>
                    <div className="mt-3 space-y-4 text-sm text-gray-700">
                        <Markdown>{build.description}</Markdown>
                    </div>
                </section>
            )}
        </article>
    );
}
