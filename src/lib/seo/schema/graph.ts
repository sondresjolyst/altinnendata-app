import { COMPANY } from '@/lib/company';

/** One schema.org node. Nodes share a `@graph` and refer to each other by `@id`. */
export interface SchemaNode {
    '@type': string | string[];
    '@id'?: string;
    [key: string]: unknown;
}

/** A reference to another node in the same graph. */
export interface SchemaRef {
    '@id': string;
}

export const ref = (id: string): SchemaRef => ({ '@id': id });

/** `@id` for an entity that is the same on every page. Page-scoped nodes use the page URL. */
export const siteId = (fragment: string): string => `${COMPANY.url}/#${fragment}`;

export const SCHEMA_IDS = {
    organization: siteId('organization'),
    website: siteId('website'),
} as const;

/** JSON-LD document for one page. `<` is escaped so the payload cannot close the script tag. */
export function serializeGraph(nodes: SchemaNode[]): string {
    return JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': nodes,
    }).replace(/</g, '\\u003c');
}
