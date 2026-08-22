import { absoluteUrl } from '../urls';
import type { SchemaNode } from './graph';

export interface Crumb {
    name: string;
    /** Site-root-relative path, e.g. `/no/builds`. Omit on the final crumb — it is the current page. */
    path?: string;
}

/** The trail shown in place of the raw URL in search results. The last crumb carries no `item`. */
export function breadcrumbNode(crumbs: Crumb[], pageUrl: string): SchemaNode {
    return {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: crumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            ...(crumb.path ? { item: absoluteUrl(crumb.path) } : {}),
        })),
    };
}

/** Marks a listing page as an ordered set of pages rather than prose. */
export function itemListNode(paths: string[], pageUrl: string): SchemaNode {
    return {
        '@type': 'ItemList',
        '@id': `${pageUrl}#itemlist`,
        numberOfItems: paths.length,
        itemListElement: paths.map((path, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: absoluteUrl(path),
        })),
    };
}
