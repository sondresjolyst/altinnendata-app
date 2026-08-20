import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import JsonLd from '@/components/JsonLd';
import { SCHEMA_IDS } from '@/lib/seo/schema/graph';

const parse = (container: HTMLElement) =>
    JSON.parse(container.querySelector('script[type="application/ld+json"]')!.innerHTML);

describe('JsonLd', () => {
    it('emits the nodes as one context-bearing graph', () => {
        const { container } = render(<JsonLd nodes={[{ '@type': 'Thing', name: 'A' }]} />);
        const graph = parse(container);

        expect(graph['@context']).toBe('https://schema.org');
        expect(graph['@graph']).toEqual([{ '@type': 'Thing', name: 'A' }]);
    });

    it('keeps references between nodes as ids rather than copies', () => {
        const { container } = render(<JsonLd nodes={[
            { '@type': 'Organization', '@id': SCHEMA_IDS.organization, name: 'A' },
            { '@type': 'WebSite', publisher: { '@id': SCHEMA_IDS.organization } },
        ]} />);

        expect(parse(container)['@graph'][1].publisher).toEqual({ '@id': SCHEMA_IDS.organization });
    });

    it('cannot be used to close the script tag', () => {
        const hostile = '</script><script>alert(1)</script>';
        const { container } = render(<JsonLd nodes={[{ '@type': 'Thing', name: hostile }]} />);
        const script = container.querySelector('script[type="application/ld+json"]')!;

        expect(container.querySelectorAll('script')).toHaveLength(1);
        expect(script.innerHTML).not.toContain('</script>');
        expect(JSON.parse(script.innerHTML)['@graph'][0].name).toBe(hostile);
    });

    it('renders nothing when a page has no nodes to contribute', () => {
        const { container } = render(<JsonLd nodes={[]} />);
        expect(container).toBeEmptyDOMElement();
    });
});
