import { LOCALES } from '@/i18n/config';

// Sent to POST /api/revalidate, which maps each to the ISR paths it affects.
export const REVALIDATE_TARGETS = {
    home: 'home',
    builds: 'builds',
    legal: 'legal',
} as const;

export type RevalidateTarget = (typeof REVALIDATE_TARGETS)[keyof typeof REVALIDATE_TARGETS];

const perLocale = (paths: string[]): string[] =>
    LOCALES.flatMap(locale => paths.map(path => `/${locale}${path}`));

// Builds appear on the front page too, through featured builds and the stats band.
export const TARGET_PATHS: Record<RevalidateTarget, string[]> = {
    home: perLocale(['']),
    builds: [...perLocale(['', '/builds', '/builds/[slug]']), '/sitemap.xml'],
    legal: perLocale(['/terms', '/privacy', '/cookies']),
};
