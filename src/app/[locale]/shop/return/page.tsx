import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ShopReturn from '@/components/shop/ShopReturn';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo/site';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};

    return {
        ...pageMetadata({ locale, path: '/shop/return', title: getDictionary(locale).shop.return.title }),
        robots: { index: false },
    };
}

export default async function ShopReturnPage({ params }: { params: Params }) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();

    // useSearchParams needs a Suspense boundary so the rest of the page can still render statically.
    return (
        <Suspense fallback={null}>
            <ShopReturn locale={locale} />
        </Suspense>
    );
}
