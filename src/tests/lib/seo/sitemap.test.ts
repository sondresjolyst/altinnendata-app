import { describe, it, expect } from 'vitest';
import { latest, localeEntries, parseTimestamp } from '@/lib/seo/sitemap';
import { COMPANY } from '@/lib/company';

describe('localeEntries', () => {
    it('emits one entry per locale, cross-linked as alternates', () => {
        const entries = localeEntries('/builds');
        expect(entries.map(entry => entry.url)).toEqual([
            `${COMPANY.url}/no/builds`,
            `${COMPANY.url}/en/builds`,
        ]);
        expect(entries[0].alternates?.languages).toEqual({
            no: `${COMPANY.url}/no/builds`,
            en: `${COMPANY.url}/en/builds`,
            'x-default': `${COMPANY.url}/no/builds`,
        });
    });

    it('claims only the locales a page is published in', () => {
        const entries = localeEntries('/builds/en-only', { locales: ['en'] });
        expect(entries).toHaveLength(1);
        expect(entries[0].alternates?.languages).toEqual({ en: `${COMPANY.url}/en/builds/en-only` });
    });

    it('omits lastModified when the source has no timestamp', () => {
        expect(localeEntries('/contact')[0]).not.toHaveProperty('lastModified');
    });

    it('uses the timestamp of the locale it belongs to', () => {
        const stamps: Record<string, Date> = {
            no: new Date('2026-01-01T00:00:00Z'),
            en: new Date('2026-02-02T00:00:00Z'),
        };
        const entries = localeEntries('/terms', { lastModified: locale => stamps[locale] });
        expect(entries[0].lastModified).toEqual(stamps.no);
        expect(entries[1].lastModified).toEqual(stamps.en);
    });
});

describe('timestamp helpers', () => {
    it('takes the newest of several dates', () => {
        const older = new Date('2026-01-01T00:00:00Z');
        const newer = new Date('2026-06-01T00:00:00Z');
        expect(latest([older, newer, undefined])).toEqual(newer);
        expect(latest([undefined])).toBeUndefined();
    });

    it('rejects missing and malformed timestamps', () => {
        expect(parseTimestamp('2026-08-12T10:18:39.409492Z')?.toISOString()).toBe('2026-08-12T10:18:39.409Z');
        expect(parseTimestamp(null)).toBeUndefined();
        expect(parseTimestamp('not a date')).toBeUndefined();
    });
});
