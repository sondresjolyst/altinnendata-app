import { defineSite } from '@sjolystinnovation/app-kit/seo';
import { COMPANY } from '@/lib/company';
import { DEFAULT_LOCALE, LOCALES, LOCALE_TAGS, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import type { CompanyInfo } from '@/lib/companyInfo';

/** The URL, metadata, sitemap, robots and structured data helpers for this site. */
export const site = defineSite<Locale>({
    name: COMPANY.name,
    url: COMPANY.url,
    titleSeparator: ' — ',
    locales: LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    localeTags: LOCALE_TAGS,
    tagline: locale => getDictionary(locale).meta.tagline,
});

export const {
    pageMetadata,
    localePath,
    absoluteUrl,
    absoluteLocaleUrl,
    localeEntries,
    webSiteNode,
    breadcrumbNode,
    itemListNode,
    ids: SCHEMA_IDS,
} = site;

/** The metadata for the locale root layout, which every page below it inherits. */
export const siteMetadata = (locale: Locale) =>
    site.siteMetadata({ locale, description: getDictionary(locale).meta.description, manifest: '/manifest.webmanifest' });

/** The business as a computer store. */
export const organizationNode = (company: CompanyInfo) => site.organizationNode(company, { type: 'ComputerStore' });
