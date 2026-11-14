import { vi } from 'vitest';
import { setConsent } from '@sjolystinnovation/app-kit/consent';
import { CONSENT_OPTIONS } from '@/lib/consent';

type PixelWindow = Window & { fbq?: unknown; _fbq?: unknown };

/** Stands in for the loaded pixel: a recording fbq on window, as MetaPixel leaves it after consent. */
export function loadPixel() {
    const fbq = vi.fn();
    (window as PixelWindow).fbq = fbq;
    return fbq;
}

/** The visitor accepts marketing and the pixel is loaded. Returns the recording fbq. */
export function acceptPixel() {
    setConsent({ marketing: true, ...CONSENT_OPTIONS });
    return loadPixel();
}

/** No pixel, a rejected choice, and no stored purchases. */
export function resetPixel() {
    delete (window as PixelWindow).fbq;
    delete (window as PixelWindow)._fbq;
    unloadTikTok();
    setConsent({ marketing: false, ...CONSENT_OPTIONS });
    window.localStorage.clear();
}

/** The events fbq got, without the consent and init calls. */
export const events = (fbq: ReturnType<typeof vi.fn>) => fbq.mock.calls.filter(call => call[0] === 'track' || call[0] === 'trackCustom');

type TikTokWindow = Window & { ttq?: unknown; TiktokAnalyticsObject?: unknown };

/**
 * Stands in for the loaded TikTok Pixel: a ttq array on window, as the base code leaves it, whose methods all record on
 * one mock as `[method, ...args]`, so the order of identify and track shows.
 */
export function loadTikTok() {
    const calls = vi.fn();
    const ttq = [] as unknown as Record<string, (...args: unknown[]) => void>;
    for (const method of ['page', 'track', 'identify', 'grantConsent', 'revokeConsent', 'holdConsent']) {
        ttq[method] = (...args: unknown[]) => calls(method, ...args);
    }
    (window as TikTokWindow).ttq = ttq;
    return calls;
}

/** The visitor accepts marketing and the TikTok Pixel is loaded. Returns the recording ttq mock. */
export function acceptTikTok() {
    setConsent({ marketing: true, ...CONSENT_OPTIONS });
    return loadTikTok();
}

/** Removes the TikTok Pixel from the page. resetPixel does it too. */
export function unloadTikTok() {
    delete (window as TikTokWindow).ttq;
    delete (window as TikTokWindow).TiktokAnalyticsObject;
}

/** The events and identities ttq got, without the consent and page calls. */
export const tikTokEvents = (ttq: ReturnType<typeof vi.fn>) => ttq.mock.calls.filter(call => call[0] === 'track' || call[0] === 'identify');
