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
    setConsent({ marketing: false, ...CONSENT_OPTIONS });
    window.localStorage.clear();
}

/** The events fbq got, without the consent and init calls. */
export const events = (fbq: ReturnType<typeof vi.fn>) => fbq.mock.calls.filter(call => call[0] === 'track' || call[0] === 'trackCustom');
