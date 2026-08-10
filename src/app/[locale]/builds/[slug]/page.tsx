import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SectionRenderer from '@/components/SectionRenderer';
import { BuildDetail, coverImageSrc, coverImageSrcSet } from '@/services/buildService';
import { publicGet } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { formatDate, formatPrice } from '@/lib/format';
import { isLocale, localeHref, LOCALES, LOCALE_TAGS, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

export const revalidate = 60;

const fetchBuild = (slug: string, locale: Locale) =>
    publicGet<BuildDetail>(`/builds/${slug}?locale=${locale}`, { tags: [REVALIDATE_TARGETS.builds] });

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    if (!isLocale(locale)) return {};

    const build = await fetchBuild(slug, locale);
    if (!build) return {};

    return {
        title: build.title,
        description: build.summary ?? undefined,
        alternates: {
            canonical: `/${locale}/builds/${slug}`,
            languages: Object.fromEntries(LOCALES.map(l => [LOCALE_TAGS[l], `/${l}/builds/${slug}`])),
        },
        openGraph: {
            title: build.title,
            description: build.summary ?? undefined,
            images: build.coverImageId ? [coverImageSrc(build)!] : undefined,
        },
    };
}

export default async function BuildPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params;
    if (!isLocale(locale)) notFound();

    const build = await fetchBuild(slug, locale);
    if (!build) notFound();

    const dict = getDictionary(locale);
    const cover = coverImageSrc(build);
    const availability = dict.builds.availability[build.availability.toLowerCase() as 'available' | 'reserved' | 'sold'];

    return (
        <article>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">
                <Link href={localeHref(locale, '/builds')} className="text-sm font-semibold text-gray-500 hover:text-gray-900">
                    ← {dict.builds.title}
                </Link>

                <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">{build.title}</h1>
                        {build.summary && <p className="mt-2 text-gray-600 max-w-2xl">{build.summary}</p>}
                    </div>
                    <div className="text-right">
                        {build.priceNok != null && (
                            <p className="text-2xl font-extrabold text-gray-900">{formatPrice(build.priceNok, locale)}</p>
                        )}
                        <p className="mt-1 text-sm text-gray-500">{dict.builds.availability.label}: {availability}</p>
                        {build.builtOn && (
                            <p className="text-sm text-gray-500">{dict.builds.builtOn}: {formatDate(build.builtOn, locale)}</p>
                        )}
                    </div>
                </header>

                {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={cover}
                        srcSet={coverImageSrcSet(build)}
                        sizes="(max-width: 1024px) 100vw, 960px"
                        alt={build.title}
                        className="mt-8 w-full rounded-2xl object-cover"
                    />
                )}

                {build.components.length > 0 && (
                    <section className="mt-10">
                        <h2 className="text-xl font-bold text-gray-900">{dict.builds.specs}</h2>
                        <dl className="mt-4 divide-y divide-gray-200 rounded-2xl border border-gray-200">
                            {build.components.map(component => (
                                <div key={component.id} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
                                    <dt className="w-40 shrink-0 text-sm font-semibold text-gray-500">
                                        {component.categoryName ?? component.categoryKey ?? ''}
                                    </dt>
                                    <dd className="text-sm text-gray-900">
                                        {component.name}
                                        {component.details && <span className="text-gray-500"> — {component.details}</span>}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}
            </div>

            {build.sections.map(section => <SectionRenderer key={section.id} section={section} locale={locale} />)}

            <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
                <Link
                    href={localeHref(locale, `/contact?build=${build.slug}`)}
                    className="inline-block rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-3 hover:brightness-95 transition"
                >
                    {dict.builds.askAbout}
                </Link>
            </div>
        </article>
    );
}
