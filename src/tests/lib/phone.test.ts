import { describe, it, expect } from 'vitest';
import { normalizeNoPhone } from '@sjolystinnovation/app-kit/validation';
import { toE164 } from '@/lib/phone';

describe('toE164', () => {
    it.each([
        ['91234567', '+4791234567'],
        ['912 34 567', '+4791234567'],
        [' 912-34-567 ', '+4791234567'],
        ['912.34.567', '+4791234567'],
        ['+47 912 34 567', '+4791234567'],
        ['(+47) 91234567', '+4791234567'],
        ['4791234567', '+4791234567'],
        // The checkout reads a plus and eight digits as a Norwegian number, so TikTok must too.
        ['+91234567', '+4791234567'],
    ])('turns %j into %j', (raw, expected) => {
        expect(toE164(raw)).toBe(expected);
    });

    it.each([
        [''],
        ['   '],
        ['1234567'],
        ['912345678'],
        ['+46 70 123 45 67'],
        ['0047 912 34 567'],
        ['47912345678'],
        ['5791234567'],
    ])('gives undefined for %j, which the checkout refuses', raw => {
        expect(toE164(raw)).toBeUndefined();
    });

    it('gives undefined for no number', () => {
        expect(toE164(undefined)).toBeUndefined();
        expect(toE164(null)).toBeUndefined();
    });

    it.each([
        '91234567', '912 34 567', '+47 912 34 567', '+91234567', '0047 912 34 567', '4791234567', '(47) 912-34-567',
        '+46 70 123 45 67', '+1 555 123 4567', '1234567', '912345678', '', 'abc', '+47', '47 47 47 47 47',
    ])('agrees with the checkout check for %j', raw => {
        const accepted = normalizeNoPhone(raw);
        expect(toE164(raw)).toBe(accepted === null ? undefined : `+${accepted}`);
    });
});
