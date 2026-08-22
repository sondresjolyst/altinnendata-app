import { serializeGraph, type SchemaNode } from '@/lib/seo/schema/graph';

/** One JSON-LD block. Search engines merge every block on a page into a single graph. */
export default function JsonLd({ nodes }: { nodes: SchemaNode[] }) {
    if (nodes.length === 0) return null;

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeGraph(nodes) }}
        />
    );
}
