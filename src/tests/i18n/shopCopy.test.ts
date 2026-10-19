import { describe, it, expect } from 'vitest';
import no from '@/i18n/locales/no.json';
import en from '@/i18n/locales/en.json';

const strings = (value: unknown): string[] =>
    typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

describe('the shop copy', () => {
    it.each([['no', no], ['en', en]])('says nothing about when the money is taken in %s', (_locale, dictionary) => {
        const claims = strings(dictionary).filter(text => /trekkes|ved levering|ved henting|handover|taken when|taken at|charged when|when you receive|når du får/i.test(text));

        expect(claims).toEqual([]);
    });
});
