import { shareImage } from '@sjolystinnovation/app-kit/seo/og';
import { COMPANY } from '@/lib/company';
import { BRAND } from '@/lib/seo/brand';
import { isLocale, DEFAULT_LOCALE, LOCALES } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

export const revalidate = 86400;

export function generateStaticParams() {
    return LOCALES.map(locale => ({ locale }));
}

/** The default share preview, which `pageMetadata` points at. */
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const dict = getDictionary(isLocale(locale) ? locale : DEFAULT_LOCALE);
    return shareImage({ name: COMPANY.name, tagline: dict.meta.tagline, colors: BRAND });
}
