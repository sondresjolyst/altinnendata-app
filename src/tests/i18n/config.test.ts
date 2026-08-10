import { describe, it, expect } from 'vitest';
import { isLocale, localeHref, switchLocalePath, toLocale, LOCALES } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

describe('locale helpers', () => {
    it('recognises supported locales only', () => {
        expect(isLocale('no')).toBe(true);
        expect(isLocale('en')).toBe(true);
        expect(isLocale('nb')).toBe(false);
        expect(isLocale(undefined)).toBe(false);
    });

    it('falls back to the default locale', () => {
        expect(toLocale('de')).toBe('no');
        expect(toLocale('en')).toBe('en');
    });

    it('prefixes routes with the locale segment', () => {
        expect(localeHref('no', '/builds')).toBe('/no/builds');
        expect(localeHref('en', '/')).toBe('/en');
        expect(localeHref('no', '#contact')).toBe('#contact');
        expect(localeHref('no', 'https://example.com')).toBe('https://example.com');
    });

    it('swaps the locale segment and keeps the rest of the path', () => {
        expect(switchLocalePath('/no/builds/gaming-pc', 'en')).toBe('/en/builds/gaming-pc');
        expect(switchLocalePath('/builds', 'en')).toBe('/en/builds');
        expect(switchLocalePath('/', 'no')).toBe('/no');
    });
});

describe('dictionaries', () => {
    it('has the same key structure in every language', () => {
        const keyPaths = (value: unknown, prefix = ''): string[] =>
            typeof value === 'object' && value !== null
                ? Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key))
                : [prefix];

        const [reference, ...rest] = LOCALES.map(locale => keyPaths(getDictionary(locale)).sort());
        for (const other of rest) {
            expect(other).toEqual(reference);
        }
    });
});
