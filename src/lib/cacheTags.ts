import { LOCALES } from '@/i18n/config';

// Identifiers the client sends to POST /api/revalidate, mapped server-side to
// the ISR paths each one affects.
export const REVALIDATE_TARGETS = {
    home: 'home',
    builds: 'builds',
    legal: 'legal',
} as const;

export type RevalidateTarget = (typeof REVALIDATE_TARGETS)[keyof typeof REVALIDATE_TARGETS];

const perLocale = (paths: string[]): string[] =>
    LOCALES.flatMap(locale => paths.map(path => `/${locale}${path}`));

// Builds also appear on the front page (featured builds + stats), so they purge
// the front page too, and the sitemap.
export const TARGET_PATHS: Record<RevalidateTarget, string[]> = {
    home: perLocale(['']),
    builds: [...perLocale(['', '/builds', '/builds/[slug]']), '/sitemap.xml'],
    legal: perLocale(['/terms', '/privacy', '/cookies']),
};
