import { describe, it, expect } from 'vitest';
import { fillTemplate, formatOre } from '@/lib/format';

describe('fillTemplate', () => {
    it('fills every placeholder', () => {
        expect(fillTemplate('{a} og {b}, {a}', { a: 'x', b: 'y' })).toBe('x og y, x');
    });

    it('keeps $ patterns in a value as typed', () => {
        expect(fillTemplate('Kjøp {title}', { title: 'PC $& $1 $$' })).toBe('Kjøp PC $& $1 $$');
    });

    it('leaves an unknown placeholder as it is', () => {
        expect(fillTemplate('{a} {c}', { a: 'x' })).toBe('x {c}');
    });
});

describe('formatOre', () => {
    it('writes øre as grouped kroner, the way a price is shown', () => {
        expect(formatOre(1299000, 'no')).toMatch(/^12\s990\skr$|^kr\s12\s990$/);
        expect(formatOre(1299000, 'en')).toMatch(/12,990/);
    });

    it('keeps the øre when the amount is not whole kroner', () => {
        expect(formatOre(10050, 'no')).toMatch(/100,50/);
        expect(formatOre(10050, 'en')).toMatch(/100\.50/);
    });
});
