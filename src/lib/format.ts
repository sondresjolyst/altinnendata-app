import { type Locale } from '@/i18n/config';

const INTL_LOCALES: Record<Locale, string> = {
    no: 'nb-NO',
    en: 'en-GB',
};

/** The BCP 47 tag numbers and dates are written in for `locale`. */
export const intlLocale = (locale: Locale): string => INTL_LOCALES[locale];

export function formatPrice(amountNok: number, locale: Locale): string {
    return new Intl.NumberFormat(INTL_LOCALES[locale], {
        style: 'currency',
        currency: 'NOK',
        maximumFractionDigits: 0,
    }).format(amountNok);
}

export function formatDate(iso: string, locale: Locale): string {
    return new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: 'long' }).format(new Date(iso));
}
