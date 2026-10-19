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

/** An amount in øre as a price, grouped the way the rest of the site writes prices. */
export function formatOre(ore: number, locale: Locale): string {
    if (ore % 100 === 0) return formatPrice(ore / 100, locale);
    return new Intl.NumberFormat(INTL_LOCALES[locale], { style: 'currency', currency: 'NOK' }).format(ore / 100);
}

/** Fills each `{name}` in `text` from `values`. A function replacer keeps `$` patterns in a value as typed. */
export function fillTemplate(text: string, values: Record<string, string>): string {
    return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => (Object.hasOwn(values, name) ? values[name]! : placeholder));
}
