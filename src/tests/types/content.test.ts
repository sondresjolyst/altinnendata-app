import { describe, it, expect } from 'vitest';
import { createSection, cloneSection, SECTION_LABELS } from '@/types/content';

describe('createSection', () => {
    it('creates a hero with default CTAs and a unique id', () => {
        const a = createSection('hero');
        const b = createSection('hero');
        expect(a.type).toBe('hero');
        expect(a.visible).toBe(true);
        expect(a.id).not.toBe(b.id);
        if (a.type === 'hero') {
            expect(a.primaryLabel).toBeTruthy();
        }
    });

    it('creates a feature with one empty bullet', () => {
        const section = createSection('feature');
        if (section.type === 'feature') {
            expect(section.bullets).toEqual(['']);
        }
    });

    it('clones a section with a new id and deep-copied arrays', () => {
        const original = createSection('feature');
        const clone = cloneSection(original);
        expect(clone.id).not.toBe(original.id);
        expect(clone.type).toBe(original.type);
        if (original.type === 'feature' && clone.type === 'feature') {
            expect(clone.bullets).toEqual(original.bullets);
            expect(clone.bullets).not.toBe(original.bullets);
        }
    });

    it('has a label for every section type', () => {
        for (const type of ['hero', 'feature', 'text', 'feed', 'contact', 'cta', 'stats', 'image'] as const) {
            expect(SECTION_LABELS[type]).toBeTruthy();
        }
    });
});
