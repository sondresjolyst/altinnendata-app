import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentImage } from '@sjolystinnovation/app-kit/ui';
import CheckoutForm from '@/components/shop/CheckoutForm';
import { BuildDetail } from '@/services/buildService';
import type { ShopConfig } from '@/services/shopService';
import { publicGetLive, publicGetLiveOptional } from '@/lib/publicApi';
import { slugSegment } from '@/lib/slug';
import { fillTemplate, formatPrice } from '@/lib/format';
import { isBuyable } from '@/lib/shop';
import { mainParts, partConditions } from '@/lib/buildParts';
import { isLocale, localeHref, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo/site';

// The page decides from the live build and shop settings, so both are read with no data cache.
// force-dynamic alone would not do it, because Next keeps a fetch that sets its own revalidate time.
export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string; slug: string }>;

const fetchBuild = (slug: string, locale: Locale) =>
    publicGetLive<BuildDetail>(`/builds/${slugSegment(slug)}?locale=${locale}`);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { locale, slug } = await params;
    if (!isLocale(locale)) return {};

    const build = await fetchBuild(slug, locale);
    if (!build) return {};

    return {
        ...pageMetadata({ locale, path: `/builds/${slug}/buy`, title: fillTemplate(getDictionary(locale).shop.checkoutTitle, { title: build.title }) }),
        robots: { index: false },
    };
}

export default async function BuyPage({ params }: { params: Params }) {
    const { locale, slug } = await params;
    if (!isLocale(locale)) notFound();

    const build = await fetchBuild(slug, locale);
    if (!build) notFound();

    const shop = await publicGetLiveOptional<ShopConfig>(`/shop/config?locale=${locale}`);
    const text = getDictionary(locale).shop;
    const buildHref = localeHref(locale, `/builds/${build.slug}`);

    const reserved = build.availability === 'Reserved' && build.published && build.priceNok != null;
    const shopOpen = shop && shop.buyButton !== 'Off' && shop.delivery.length > 0;

    if (reserved && shopOpen) {
        return (
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
                <Link href={buildHref} className="text-sm font-semibold text-gray-500 hover:text-gray-900">
                    ← {text.toBuild}
                </Link>
                <h1 className="mt-4 text-3xl font-black text-gray-900 break-words">{fillTemplate(text.checkoutTitle, { title: build.title })}</h1>
                <BuildSummary build={build} locale={locale} />
                <div className="mt-8 space-y-3">
                    <button type="button" disabled className="rounded-lg border border-gray-900 bg-gray-900 px-6 py-3 font-semibold text-white opacity-50 cursor-not-allowed">
                        {text.buy}
                    </button>
                    <p className="text-sm text-gray-700">{text.reserved}</p>
                </div>
            </div>
        );
    }

    if (!isBuyable(build) || !shop || shop.buyButton === 'Off' || shop.delivery.length === 0) {
        return (
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
                <h1 className="text-lg font-semibold text-gray-900">{text.unavailable}</h1>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={buildHref} className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-900 hover:bg-gray-50 transition">
                        {text.toBuild}
                    </Link>
                    <Link href={localeHref(locale, `/contact?build=${build.slug}`)} className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:brightness-95 transition">
                        {text.contactUs}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
            <Link href={buildHref} className="text-sm font-semibold text-gray-500 hover:text-gray-900">
                ← {text.toBuild}
            </Link>
            <h1 className="mt-4 text-3xl font-black text-gray-900 break-words">{fillTemplate(text.checkoutTitle, { title: build.title })}</h1>

            <BuildSummary build={build} locale={locale} />

            <div className="mt-8">
                <CheckoutForm build={build} delivery={shop.delivery} mode={shop.buyButton} locale={locale} />
            </div>
        </div>
    );
}

function BuildSummary({ build, locale }: { build: BuildDetail; locale: Locale }) {
    const dict = getDictionary(locale);
    const conditions = partConditions(build.components ?? []);
    const parts = mainParts(build.components ?? []);

    return (
        <div className="mt-6 rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-4">
                {build.coverImageId && (
                    <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                        <ContentImage
                            imageId={build.coverImageId}
                            alt={build.title}
                            sizes="128px"
                            className="h-full w-auto max-w-full object-contain"
                        />
                    </div>
                )}
                <div className="min-w-0">
                    <p className="font-bold text-gray-900 break-words">{build.title}</p>
                    <p className="text-sm text-gray-600">{dict.shop.price}: {formatPrice(build.priceNok!, locale)}</p>
                </div>
            </div>
            {/* Angrerettloven § 16 wants the main characteristics right before the order. */}
            {(conditions.length > 0 || parts.length > 0) && (
                <dl className="mt-4 space-y-1 border-t border-gray-200 pt-4 text-sm">
                    {conditions.length > 0 && (
                        <div className="flex gap-2">
                            <dt className="shrink-0 text-gray-600">{dict.builds.condition}:</dt>
                            <dd className="min-w-0 text-gray-900">{conditions.join(', ')}</dd>
                        </div>
                    )}
                    {parts.map(part => (
                        <div key={part.id} className="flex gap-2">
                            <dt className="shrink-0 text-gray-600">{part.categoryName ?? part.categoryKey}:</dt>
                            <dd className="min-w-0 break-words text-gray-900">
                                {part.name}
                                {part.condition && <span className="text-gray-600"> ({part.condition.name})</span>}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}
