import { describe, it, expect } from 'vitest';
import { organizationNode, webSiteNode } from '@/lib/seo/schema/organization';
import { breadcrumbNode, itemListNode } from '@/lib/seo/schema/navigation';
import { productNode } from '@/lib/seo/schema/product';
import { SCHEMA_IDS, serializeGraph } from '@/lib/seo/schema/graph';
import type { CompanyInfo } from '@/lib/companyInfo';
import type { BuildDetail } from '@/services/buildService';

const company: CompanyInfo = {
    name: 'Altinnendata',
    legalName: 'Altinnendata',
    orgNumber: '',
    vatRegistered: false,
    address: 'Mårvegen 21a, 4347 Lye',
    streetAddress: 'Mårvegen 21a',
    postalCode: '4347',
    addressLocality: 'Lye',
    addressRegion: 'Rogaland',
    email: 'post@example.com',
    phone: '+47 473 88 759',
};

const build: BuildDetail = {
    id: 1,
    slug: 'gaming-pc',
    category: 'gaming',
    availability: 'Available',
    priceNok: 6999,
    builtOn: null,
    coverImageId: 'cover',
    published: true,
    sortOrder: 0,
    locale: 'no',
    title: 'Gaming PC',
    summary: 'Rask maskin',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    finnUrl: null,
    description: null,
    imageIds: ['cover', 'second'],
    components: [
        { id: 1, componentPartId: null, componentCategoryId: 1, categoryKey: 'cpu', categoryName: 'Prosessor', manufacturerName: null, name: 'Ryzen 7', details: null, sortOrder: 0 },
        { id: 2, componentPartId: null, componentCategoryId: 9, categoryKey: 'other', categoryName: 'Annet', manufacturerName: null, name: 'Kabel', details: null, sortOrder: 1 },
    ],
    availableLocales: ['no'],
};

const PAGE = 'https://www.altinnendata.no/no/builds/gaming-pc';

describe('organization node', () => {
    it('omits the legal name when it only repeats the trading name', () => {
        expect(organizationNode(company)).not.toHaveProperty('legalName');
        expect(organizationNode({ ...company, legalName: 'Altinnendata AS' })).toHaveProperty('legalName', 'Altinnendata AS');
    });

    it('omits VAT and org identifiers until the business is registered', () => {
        const node = organizationNode(company);
        expect(node).not.toHaveProperty('vatID');
        expect(node).not.toHaveProperty('taxID');
    });

    it('emits a VAT id only once registered', () => {
        const node = organizationNode({ ...company, orgNumber: '123 456 789', vatRegistered: true });
        expect(node.vatID).toBe('NO123456789MVA');
    });

    it('emits the address as separate fields, which is what a listing is matched on', () => {
        expect(organizationNode(company).address).toEqual({
            '@type': 'PostalAddress',
            streetAddress: 'Mårvegen 21a',
            postalCode: '4347',
            addressLocality: 'Lye',
            addressRegion: 'Rogaland',
            addressCountry: 'NO',
        });
    });

    it('omits address parts an admin has not filled in, rather than guessing them', () => {
        const partial = { ...company, postalCode: '', addressLocality: '', addressRegion: '' };
        expect(organizationNode(partial).address).toEqual({
            '@type': 'PostalAddress',
            streetAddress: 'Mårvegen 21a',
            addressCountry: 'NO',
        });
    });

    it('falls back to the one-line address when the API has no parts to give', () => {
        // An API that sends the one-line address only.
        const oneLine = { ...company, streetAddress: '', postalCode: '', addressLocality: '', addressRegion: '' };
        expect(organizationNode(oneLine).address).toEqual({
            '@type': 'PostalAddress',
            streetAddress: 'Mårvegen 21a, 4347 Lye',
            addressCountry: 'NO',
        });
    });

    it('is referenced by the site node rather than repeated inside it', () => {
        expect(webSiteNode('no').publisher).toEqual({ '@id': SCHEMA_IDS.organization });
    });
});

describe('product node', () => {
    it('prices the offer in NOK and marks an available build in stock', () => {
        const offer = productNode(build, 'no', PAGE).offers as Record<string, unknown>;
        expect(offer).toMatchObject({
            price: 6999,
            priceCurrency: 'NOK',
            availability: 'https://schema.org/InStock',
            seller: { '@id': SCHEMA_IDS.organization },
        });
    });

    it('maps a sold build to SoldOut and a reserved one to LimitedAvailability', () => {
        const sold = productNode({ ...build, availability: 'Sold' }, 'no', PAGE).offers as Record<string, unknown>;
        const reserved = productNode({ ...build, availability: 'Reserved' }, 'no', PAGE).offers as Record<string, unknown>;
        expect(sold.availability).toBe('https://schema.org/SoldOut');
        expect(reserved.availability).toBe('https://schema.org/LimitedAvailability');
    });

    it('drops the offer entirely when there is no price, rather than inventing one', () => {
        expect(productNode({ ...build, priceNok: null }, 'no', PAGE)).not.toHaveProperty('offers');
    });

    it('lists the cover image first and never twice', () => {
        const images = productNode(build, 'no', PAGE).image as string[];
        expect(images).toHaveLength(2);
        expect(images[0]).toContain('cover');
    });

    it('exposes every categorised component as a spec, in listed order', () => {
        const properties = productNode(build, 'no', PAGE).additionalProperty as Array<{ name: string }>;
        expect(properties.map(p => p.name)).toEqual(['Prosessor', 'Annet']);
    });

    it('skips a component with no category rather than emitting a nameless property', () => {
        const uncategorised = { ...build.components[0], categoryKey: null, categoryName: null };
        const node = productNode({ ...build, components: [uncategorised] }, 'no', PAGE);
        expect(node).not.toHaveProperty('additionalProperty');
    });
});

describe('navigation nodes', () => {
    it('leaves the current page without a link', () => {
        const crumbs = breadcrumbNode(
            [{ name: 'Hjem', path: '/no' }, { name: 'Gaming PC' }],
            PAGE,
        ).itemListElement as Array<Record<string, unknown>>;
        expect(crumbs[0]).toHaveProperty('item', 'https://www.altinnendata.no/no');
        expect(crumbs[1]).not.toHaveProperty('item');
        expect(crumbs[1].position).toBe(2);
    });

    it('counts the items it lists', () => {
        const node = itemListNode(['/no/builds/a', '/no/builds/b'], PAGE);
        expect(node.numberOfItems).toBe(2);
    });
});

describe('graph serialisation', () => {
    it('escapes angle brackets so the payload cannot close the script tag', () => {
        const json = serializeGraph([{ '@type': 'Thing', name: '</script><script>alert(1)</script>' }]);
        expect(json).not.toContain('</script>');
        expect(JSON.parse(json)['@graph'][0].name).toBe('</script><script>alert(1)</script>');
    });
});
