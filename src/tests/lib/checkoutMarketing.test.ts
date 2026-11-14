import { describe, it, expect } from 'vitest';
import { adToken, checkoutPageUrl } from '@/lib/checkoutMarketing';

describe('adToken', () => {
    it('keeps printable ASCII up to the limit', () => {
        expect(adToken('fb.1.1700000000000.123456789', 256)).toBe('fb.1.1700000000000.123456789');
        expect(adToken('a'.repeat(256), 256)).toBe('a'.repeat(256));
    });

    it.each([
        ['over the limit', 'a'.repeat(257)],
        ['with a space', 'fb.1 2'],
        ['with a tab', 'fb.1\t2'],
        ['not ASCII', 'fb.1.æ'],
        ['empty', ''],
    ])('leaves out a value %s', (_, value) => {
        expect(adToken(value, 256)).toBeUndefined();
    });

    it('leaves out a missing value', () => {
        expect(adToken(undefined, 256)).toBeUndefined();
    });
});

describe('checkoutPageUrl', () => {
    it('drops the query and the hash', () => {
        expect(checkoutPageUrl('https://www.altinnendata.no/no/builds/gaming-pc/buy?ttclid=abc&email=kari%40example.no#top'))
            .toBe('https://www.altinnendata.no/no/builds/gaming-pc/buy');
    });

    it.each([
        ['http', 'http://www.altinnendata.no/no/'],
        ['another host', 'https://evil.example/no/'],
        ['the host without www', 'https://altinnendata.no/no/'],
        ['localhost', 'http://localhost:3000/no/'],
        ['a port', 'https://www.altinnendata.no:8443/no/'],
        ['user info', 'https://user:pass@www.altinnendata.no/no/'],
        ['no URL', 'not a url'],
    ])('leaves out a page on %s', (_, href) => {
        expect(checkoutPageUrl(href)).toBeUndefined();
    });

    it('leaves out a page longer than 2048 characters', () => {
        const base = 'https://www.altinnendata.no/';
        expect(checkoutPageUrl(base + 'a'.repeat(2048 - base.length))).toHaveLength(2048);
        expect(checkoutPageUrl(base + 'a'.repeat(2049 - base.length))).toBeUndefined();
    });
});
