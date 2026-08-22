import { describe, it, expect } from 'vitest';
import { imagePath, imageSrcSet } from '@/services/imageService';

describe('imagePath', () => {
    it('addresses an image on this origin, not the API host', () => {
        expect(imagePath('abc123')).toBe('/content-images/abc123');
    });

    /**
     * The point of the path being relative: the browser never contacts the API host for a photo,
     * which is what lets that host be closed to crawlers and dropped from the CSP.
     */
    it('names no host at all', () => {
        expect(imagePath('abc123')).not.toMatch(/^https?:/);
        expect(imagePath('abc123')).not.toContain('tumogroup');
    });
});

describe('imageSrcSet', () => {
    it('lists each width as a ?w= candidate with its descriptor', () => {
        const entries = imageSrcSet('abc').split(', ');

        expect(entries[0]).toBe('/content-images/abc?w=384 384w');
        expect(entries).toContain('/content-images/abc?w=1600 1600w');
        expect(entries.every(e => /^\/content-images\/abc\?w=\d+ \d+w$/.test(e))).toBe(true);
    });
});
