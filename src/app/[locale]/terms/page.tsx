import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPageView } from '@sjolystinnovation/app-kit/legal';
import { LegalPage } from '@/services/legalService';
import { publicGet } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { isLocale, localeHref } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo/site';
import { intlLocale } from '@/lib/format';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};

    return pageMetadata({
        locale,
        path: '/terms',
        title: getDictionary(locale).footer.terms,
    });
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();

    const page = await publicGet<LegalPage>(`/content/legal/terms?locale=${locale}`, { tags: [REVALIDATE_TARGETS.legal] });
    const dict = getDictionary(locale);
    return (
        <LegalPageView
            page={page}
            title={dict.footer.terms}
            homeHref={localeHref(locale, '/')}
            dateLocale={intlLocale(locale)}
            strings={{ updated: dict.legal.updated, missing: dict.legal.missing, toFrontPage: dict.common.toFrontPage }}
        />
    );
}
