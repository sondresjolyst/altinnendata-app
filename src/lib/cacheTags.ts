import { defineRevalidateTargets } from '@sjolystinnovation/app-kit/api';
import { LOCALES } from '@/i18n/config';

// Sent to POST /api/revalidate, which maps each to the ISR paths it affects.
const revalidateTargets = defineRevalidateTargets({
    locales: LOCALES,
    targets: {
        home: { pages: [''] },
        // Builds appear on the front page too, through featured builds and the stats band.
        builds: { pages: ['', '/builds', '/builds/[slug]'], root: ['/sitemap.xml'] },
        // The buy button and the checkout page read the shop settings.
        shop: { pages: ['/builds/[slug]', '/builds/[slug]/buy'] },
        legal: { pages: ['/terms', '/privacy', '/cookies'], root: ['/sitemap.xml'] },
        // Every page renders branding through the layout, and so does /icon: the tag reaches them all.
        branding: {},
    },
});

export const REVALIDATE_TARGETS = revalidateTargets.targets;

export type RevalidateTarget = keyof typeof REVALIDATE_TARGETS;

export const TARGET_PATHS = revalidateTargets.paths;

/** Purges the pages behind `target` after an admin edit. Best effort, it never throws. */
export const revalidateTarget = revalidateTargets.revalidate;
