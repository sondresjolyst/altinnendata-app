import type { Availability, BuildDetail } from '@/services/buildService';
import { imageUrl } from '@/services/imageService';
import { LOCALE_TAGS, type Locale } from '@/i18n/config';
import { ref, SCHEMA_IDS, type SchemaNode } from './graph';

/**
 * schema.org has no "held for a buyer" state; LimitedAvailability is the honest reading of a
 * reserved machine — it exists and is listed, but cannot currently be bought.
 */
const AVAILABILITY: Record<Availability, string> = {
    Available: 'https://schema.org/InStock',
    Reserved: 'https://schema.org/LimitedAvailability',
    Sold: 'https://schema.org/SoldOut',
};

/**
 * Components as machine-readable specs, in the order the build lists them. Every category the
 * API defines is a real specification, so there is no allowlist here to fall behind when one
 * is added; a component with no category is skipped, as it would yield a nameless property.
 */
function specs(build: BuildDetail) {
    return build.components
        .filter(component => component.categoryName != null || component.categoryKey != null)
        .map(component => ({
            '@type': 'PropertyValue',
            name: component.categoryName ?? component.categoryKey,
            value: component.details ? `${component.name} — ${component.details}` : component.name,
        }));
}

/**
 * One machine as a sellable product. Price and availability are what make a listing eligible
 * for a rich result, so a build without a price gets no `offers` block rather than a
 * placeholder one.
 */
export function productNode(build: BuildDetail, locale: Locale, pageUrl: string): SchemaNode {
    const images = [
        ...(build.coverImageId ? [imageUrl(build.coverImageId)] : []),
        ...build.imageIds.filter(id => id !== build.coverImageId).map(imageUrl),
    ];
    const properties = specs(build);

    return {
        '@type': 'Product',
        '@id': `${pageUrl}#product`,
        name: build.title,
        url: pageUrl,
        sku: build.slug,
        inLanguage: LOCALE_TAGS[locale],
        ...(build.summary ? { description: build.summary } : {}),
        ...(build.category ? { category: build.category } : {}),
        ...(images.length > 0 ? { image: images } : {}),
        ...(properties.length > 0 ? { additionalProperty: properties } : {}),
        ...(build.priceNok != null
            ? {
                offers: {
                    '@type': 'Offer',
                    '@id': `${pageUrl}#offer`,
                    url: pageUrl,
                    price: build.priceNok,
                    priceCurrency: 'NOK',
                    availability: AVAILABILITY[build.availability],
                    seller: ref(SCHEMA_IDS.organization),
                },
            }
            : {}),
    };
}
