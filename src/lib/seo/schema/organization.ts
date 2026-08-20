import { COMPANY } from '@/lib/company';
import type { CompanyInfo } from '@/lib/companyInfo';
import { LOCALE_TAGS, type Locale } from '@/i18n/config';
import { absoluteUrl } from '../urls';
import { ref, SCHEMA_IDS, type SchemaNode } from './graph';

/**
 * The address as separate fields. A search engine matches a local listing on a postcode and
 * place name it can read; parts the admin has not filled in are left out, and the street
 * falls back to the one-line form so the address is never empty.
 */
function postalAddress(company: CompanyInfo) {
    return {
        '@type': 'PostalAddress',
        streetAddress: company.streetAddress || company.address,
        ...(company.postalCode ? { postalCode: company.postalCode } : {}),
        ...(company.addressLocality ? { addressLocality: company.addressLocality } : {}),
        ...(company.addressRegion ? { addressRegion: company.addressRegion } : {}),
        addressCountry: 'NO',
    };
}

/**
 * The business itself, under a stable `@id` that page-scoped nodes point at.
 *
 * Fields the admin has not filled in are omitted: in structured data an empty or invented
 * value is worse than an absent one.
 */
export function organizationNode(company: CompanyInfo): SchemaNode {
    return {
        '@type': 'ComputerStore',
        '@id': SCHEMA_IDS.organization,
        name: company.name,
        ...(company.legalName && company.legalName !== company.name ? { legalName: company.legalName } : {}),
        url: absoluteUrl(),
        image: absoluteUrl('/icon.png'),
        logo: absoluteUrl('/logo.png'),
        telephone: company.phone,
        email: company.email,
        address: postalAddress(company),
        areaServed: 'NO',
        ...(company.vatRegistered && company.orgNumber
            ? { vatID: `NO${company.orgNumber.replace(/\s/g, '')}MVA` }
            : {}),
        ...(company.orgNumber ? { taxID: company.orgNumber } : {}),
    };
}

/** The site as an entity, so search engines can attribute pages to it and to the business. */
export function webSiteNode(locale: Locale): SchemaNode {
    return {
        '@type': 'WebSite',
        '@id': SCHEMA_IDS.website,
        url: absoluteUrl(),
        name: COMPANY.name,
        inLanguage: LOCALE_TAGS[locale],
        publisher: ref(SCHEMA_IDS.organization),
    };
}
