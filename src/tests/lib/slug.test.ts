import { describe, it, expect } from 'vitest';
import { slugSegment } from '@/lib/slug';

describe('slugSegment', () => {
    it('leaves a plain slug as it is', () => {
        expect(slugSegment('ford-focus-st')).toBe('ford-focus-st');
    });

    it('gives the same segment for the decoded and the still encoded form', () => {
        expect(slugSegment('a?x=1')).toBe('a%3Fx%3D1');
        expect(slugSegment('a%3Fx%3D1')).toBe('a%3Fx%3D1');
    });

    it('keeps a slash inside the segment', () => {
        expect(slugSegment('../admin')).toBe('..%2Fadmin');
    });

    it('takes text that is not valid percent-encoding as it is', () => {
        expect(slugSegment('100%')).toBe('100%25');
    });
});
