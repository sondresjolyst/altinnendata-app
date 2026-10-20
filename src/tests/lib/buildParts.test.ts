import { describe, it, expect } from 'vitest';
import { mainParts } from '@/lib/buildParts';
import type { BuildComponent } from '@/services/buildService';

const part = (id: number, categoryKey: string | null, overrides: Partial<BuildComponent> = {}): BuildComponent => ({
    id,
    componentPartId: null,
    componentCategoryId: null,
    categoryKey,
    categoryName: categoryKey,
    manufacturerName: null,
    name: `part ${id}`,
    details: null,
    condition: null,
    sortOrder: id,
    ...overrides,
});

describe('mainParts', () => {
    it('lists processor, graphics card, memory and storage in that order and leaves the rest out', () => {
        const parts = [part(1, 'storage'), part(2, 'cooling'), part(3, 'memory'), part(4, 'gpu'), part(5, null), part(6, 'cpu'), part(7, 'psu')];

        expect(mainParts(parts).map(p => p.categoryKey)).toEqual(['cpu', 'gpu', 'memory', 'storage']);
    });

    it('keeps every part of a kind, in the build order', () => {
        const parts = [part(1, 'storage', { sortOrder: 5 }), part(2, 'storage', { sortOrder: 1 }), part(3, 'cpu')];

        expect(mainParts(parts).map(p => p.id)).toEqual([3, 2, 1]);
    });

    it('does not reorder the list it is given', () => {
        const parts = [part(1, 'storage'), part(2, 'cpu')];
        mainParts(parts);

        expect(parts.map(p => p.id)).toEqual([1, 2]);
    });
});
