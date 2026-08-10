import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LegalPageView from '@/components/LegalPageView';
import { LegalPage } from '@/services/legalService';
import { publicGet } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { isLocale, LOCALES, LOCALE_TAGS } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};

    return {
        title: getDictionary(locale).footer.privacy,
        alternates: {
            canonical: `/${locale}/privacy`,
            languages: Object.fromEntries(LOCALES.map(l => [LOCALE_TAGS[l], `/${l}/privacy`])),
        },
    };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();

    const page = await publicGet<LegalPage>(`/content/legal/privacy?locale=${locale}`, { tags: [REVALIDATE_TARGETS.legal] });
    return <LegalPageView page={page} locale={locale} title={getDictionary(locale).footer.privacy} />;
}
