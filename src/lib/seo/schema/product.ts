import type { Availability, BuildDetail } from '@/services/buildService';
import { imagePath } from '@/services/imageService';
import { absoluteUrl } from '../urls';
import { LOCALE_TAGS, type Locale } from '@/i18n/config';
import { ref, SCHEMA_IDS, type SchemaNode } from './graph';

/** schema.org has no "held for a buyer" state; a reserved machine maps to LimitedAvailability. */
const AVAILABILITY: Record<Availability, string> = {
    Available: 'https://schema.org/InStock',
    Reserved: 'https://schema.org/LimitedAvailability',
    Sold: 'https://schema.org/SoldOut',
};

/**
 * Components as machine-readable specs, in the order the build lists them. A component with no
 * category is skipped, as it would yield a nameless property.
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

/** One machine as a sellable product. A build without a price gets no `offers` block. */
export function productNode(build: BuildDetail, locale: Locale, pageUrl: string): SchemaNode {
    // Absolute: a consumer of the graph has no page to resolve against.
    const image = (id: string) => absoluteUrl(imagePath(id));
    const images = [
        ...(build.coverImageId ? [image(build.coverImageId)] : []),
        ...build.imageIds.filter(id => id !== build.coverImageId).map(image),
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
