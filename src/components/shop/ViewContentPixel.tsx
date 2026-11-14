"use client";

import { useEffect, useRef } from 'react';
import { useConsent } from '@sjolystinnovation/app-kit/consent';
import { PIXELS, trackViewContent, type Pixel } from '@/lib/pixelEvents';
import { CONSENT_OPTIONS } from '@/lib/consent';

/** Sends a ViewContent to each marketing pixel for the build page once the visitor has accepted marketing. It renders nothing. */
export default function ViewContentPixel({ slug, priceNok }: { slug: string; priceNok: number | null }) {
    const { marketing } = useConsent(CONSENT_OPTIONS);
    // The pixels this page already sent for its build, so a rerender or a new consent on the same page does not count
    // it again. Each pixel is tracked on its own, so one that sent is not sent to again when the other is retried.
    const sent = useRef<{ slug: string; pixels: Set<Pixel> } | null>(null);

    useEffect(() => {
        if (!marketing) return;
        if (sent.current?.slug !== slug) sent.current = { slug, pixels: new Set() };
        const done = sent.current.pixels;
        const pending = PIXELS.filter(pixel => !done.has(pixel));
        if (pending.length === 0) return;
        // The layout's pixels load in effects of the same commit, which run after this one.
        const timer = setTimeout(() => {
            for (const pixel of trackViewContent(slug, priceNok, pending)) done.add(pixel);
        }, 0);
        return () => clearTimeout(timer);
    }, [marketing, slug, priceNok]);

    return null;
}
