"use client";

import { useEffect, useRef } from 'react';
import { useConsent } from '@sjolystinnovation/app-kit/consent';
import { trackViewContent } from '@/lib/pixelEvents';
import { CONSENT_OPTIONS } from '@/lib/consent';

/** Sends a Meta Pixel ViewContent for the build page once the visitor has accepted marketing. It renders nothing. */
export default function ViewContentPixel({ slug, priceNok }: { slug: string; priceNok: number | null }) {
    const { marketing } = useConsent(CONSENT_OPTIONS);
    // The build this page already sent for, so a rerender or a new consent on the same page does not count it again.
    const sent = useRef<string | null>(null);

    useEffect(() => {
        if (!marketing || sent.current === slug) return;
        // The layout's MetaPixel loads the pixel in an effect of the same commit, which runs after this one.
        const timer = setTimeout(() => {
            if (trackViewContent(slug, priceNok)) sent.current = slug;
        }, 0);
        return () => clearTimeout(timer);
    }, [marketing, slug, priceNok]);

    return null;
}
