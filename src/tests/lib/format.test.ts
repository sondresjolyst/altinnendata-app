import { describe, it, expect } from 'vitest';
import { formatOre } from '@/lib/format';

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
