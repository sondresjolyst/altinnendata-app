import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PayLinkButton from '@/components/shop/PayLinkButton';
import { isLocale, localeHref } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { formatOre } from '@/lib/format';
import { fillTemplate } from '@sjolystinnovation/app-kit/ui';
import { publicGet } from '@/lib/publicApi';
import { osloDate, osloTime } from '@/lib/shop';
import type { PayLinkInfo } from '@/services/shopService';

// The link can be used up or replaced at any time, so the page reads it live on every request.
export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string; token: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};

    // The path holds the secret, so it is never given as the canonical address.
    return { title: getDictionary(locale).shop.payLink.pageTitle, robots: { index: false, follow: false } };
}

/** The page a payment link opens, after Vipps ended the reservation of the order. */
export default async function PayLinkPage({ params }: { params: Params }) {
    const { locale, token } = await params;
    if (!isLocale(locale)) notFound();

    const text = getDictionary(locale).shop;
    const link = await publicGet<PayLinkInfo>(`/shop/pay/${encodeURIComponent(token)}`, { revalidate: 0 });

    if (!link) {
        return (
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
                <h1 className="text-lg font-semibold text-gray-900">{text.payLink.invalid}</h1>
                <div className="mt-6">
                    <Link href={localeHref(locale, '/contact')} className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:brightness-95 transition">
                        {text.payLink.contact}
                    </Link>
                </div>
            </div>
        );
    }

    const rows: [string, string][] = [
        [text.payLink.build, link.buildTitle],
        [text.payLink.reference, link.reference],
        [text.total, formatOre(link.totalInOre, locale)],
    ];

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
            <h1 className="text-3xl font-black text-gray-900 break-words">{text.payLink.title}</h1>
            <p className="mt-2 text-gray-700">{text.payLink.intro}</p>
            <dl className="mt-6 space-y-2 rounded-2xl border border-gray-200 p-4 text-sm">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex flex-wrap gap-x-2">
                        <dt className="text-gray-600">{label}:</dt>
                        <dd className="min-w-0 break-words font-semibold text-gray-900">{value}</dd>
                    </div>
                ))}
            </dl>
            <p className="mt-4 text-sm text-gray-700">
                {fillTemplate(text.payLink.validUntil, { date: osloDate(link.expiresAt), time: osloTime(link.expiresAt) })}
            </p>
            <div className="mt-6">
                <PayLinkButton token={token} locale={locale} />
            </div>
        </div>
    );
}
