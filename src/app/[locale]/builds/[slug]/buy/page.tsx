import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentImage } from '@sjolystinnovation/app-kit/ui';
import CheckoutForm from '@/components/shop/CheckoutForm';
import VippsButtonArt, { VIPPS_BUTTON, VIPPS_DISABLED } from '@/components/shop/VippsButtonArt';
import { BuildDetail } from '@/services/buildService';
import type { ShopConfig } from '@/services/shopService';
import { publicGetLive, publicGetLiveOptional } from '@/lib/publicApi';
import { slugSegment } from '@/lib/slug';
import { fillTemplate, formatPrice } from '@/lib/format';
import { isBuyable } from '@/lib/shop';
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
                <BuildSummary build={build} locale={locale} price={text.price} />
                <div className="mt-8 space-y-3">
                    <button type="button" disabled className={`${VIPPS_BUTTON} ${VIPPS_DISABLED}`}>
                        <VippsButtonArt verb="buyNow" locale={locale} alt={text.buy} />
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

            <BuildSummary build={build} locale={locale} price={text.price} />

            <div className="mt-8">
                <CheckoutForm build={build} delivery={shop.delivery} mode={shop.buyButton} locale={locale} />
            </div>
        </div>
    );
}

function BuildSummary({ build, locale, price }: { build: BuildDetail; locale: Locale; price: string }) {
    return (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-gray-200 p-4">
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
                <p className="text-sm text-gray-600">{price}: {formatPrice(build.priceNok!, locale)}</p>
            </div>
        </div>
    );
}
