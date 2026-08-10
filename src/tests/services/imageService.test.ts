import { describe, it, expect } from 'vitest';
import { imageUrl, imageSrcSet } from '@/services/imageService';

describe('imageUrl', () => {
    it('builds a content-image URL from an id', () => {
        expect(imageUrl('abc123')).toContain('/content-images/abc123');
    });
});

describe('imageSrcSet', () => {
    it('lists each width as a ?w= candidate with its descriptor', () => {
        const entries = imageSrcSet('abc').split(', ');

        expect(entries[0]).toBe(`${imageUrl('abc')}?w=384 384w`);
        expect(entries).toContain(`${imageUrl('abc')}?w=1600 1600w`);
        expect(entries.every(e => /\?w=\d+ \d+w$/.test(e))).toBe(true);
    });
});
