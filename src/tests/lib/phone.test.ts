import { describe, it, expect } from 'vitest';
import { toE164 } from '@/lib/phone';

describe('toE164', () => {
    it.each([
        ['91234567', '+4791234567'],
        ['912 34 567', '+4791234567'],
        [' 912-34-567 ', '+4791234567'],
        ['912.34.567', '+4791234567'],
        ['+47 912 34 567', '+4791234567'],
        ['(+47) 91234567', '+4791234567'],
        ['0047 912 34 567', '+4791234567'],
        ['4791234567', '+4791234567'],
        ['+46 70 123 45 67', '+46701234567'],
        ['0046701234567', '+46701234567'],
    ])('turns %j into %j', (raw, expected) => {
        expect(toE164(raw)).toBe(expected);
    });

    it.each([
        [''],
        ['   '],
        ['1234567'],
        ['912345678'],
        ['+0123456789'],
        ['+123456'],
        ['+1234567890123456'],
        ['00 123'],
        ['+47 912 34 567 ext 2'],
        ['912/34/567'],
        ['47912345678'],
    ])('gives undefined for %j, since it is not sure', raw => {
        expect(toE164(raw)).toBeUndefined();
    });

    it('gives undefined for no number', () => {
        expect(toE164(undefined)).toBeUndefined();
        expect(toE164(null)).toBeUndefined();
    });
});
