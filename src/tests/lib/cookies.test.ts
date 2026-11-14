import { describe, it, expect, afterEach } from 'vitest';
import { readCookie } from '@/lib/cookies';

describe('readCookie', () => {
    afterEach(() => {
        document.cookie = '_fbp=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });

    it('finds a cookie among others, with or without spaces', () => {
        expect(readCookie('_fbp', '_ga=GA1.1.1; _fbp=fb.1.1700000000000.123456789;_ttp=abc')).toBe('fb.1.1700000000000.123456789');
        expect(readCookie('_ttp', '_ga=GA1.1.1; _fbp=fb.1.1700000000000.123456789;_ttp=abc')).toBe('abc');
    });

    it('matches the whole name, not a prefix or a suffix', () => {
        expect(readCookie('_fbp', 'x_fbp=wrong; _fbpx=wrong')).toBeUndefined();
        expect(readCookie('ttclid', 'my_ttclid=wrong; ttclid=right')).toBe('right');
    });

    it('gives the first of two cookies with the same name', () => {
        expect(readCookie('_fbp', '_fbp=fb.1.1.first; _ga=1; _fbp=fb.1.1.second')).toBe('fb.1.1.first');
    });

    it('keeps an equals sign inside the value', () => {
        expect(readCookie('ttclid', 'ttclid=a=b==')).toBe('a=b==');
    });

    it('decodes an encoded value', () => {
        expect(readCookie('_fbc', '_fbc=fb.1.1%2C2')).toBe('fb.1.1,2');
    });

    it('gives undefined for a value that cannot be decoded', () => {
        expect(readCookie('_fbc', '_fbc=%E0%A4%A')).toBeUndefined();
    });

    it('gives undefined for a missing or empty cookie and an empty string', () => {
        expect(readCookie('_fbp', '_ga=1')).toBeUndefined();
        expect(readCookie('_fbp', '_fbp=')).toBeUndefined();
        expect(readCookie('_fbp', '')).toBeUndefined();
        expect(readCookie('_fbp', 'garbage;;=;_fbp')).toBeUndefined();
    });

    it('reads document.cookie by default', () => {
        document.cookie = '_fbp=fb.1.1.2; path=/';
        expect(readCookie('_fbp')).toBe('fb.1.1.2');
    });
});
