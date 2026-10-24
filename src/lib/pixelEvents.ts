// The shop's Meta Pixel events. trackPixel sends nothing without marketing consent or before the pixel
// has loaded, so every function here is safe to call. Values are in kroner, as Meta expects.
import { getConsent, trackPixel } from '@sjolystinnovation/app-kit/consent';
import type { OrderStatusInfo } from '@/services/shopService';
import { CONSENT_OPTIONS } from '@/lib/consent';

const CURRENCY = 'NOK';

/** The localStorage key with the order references a Purchase went out for. */
export const PURCHASE_STORAGE_KEY = 'pixel-purchases';

/** How many references the key keeps, newest last. */
const KEEP_PURCHASES = 20;

/** References sent from this page, for when storage cannot be read or written. */
const sentHere = new Set<string>();

/** Whether trackPixel would send now: consent is given and MetaPixel has loaded the pixel. */
function pixelReady(): boolean {
    return typeof window !== 'undefined' && typeof (window as Window & { fbq?: unknown }).fbq === 'function' && getConsent(CONSENT_OPTIONS).marketing;
}

const priced = (valueNok: number | null | undefined) => (valueNok == null ? {} : { value: valueNok, currency: CURRENCY });

/** ViewContent for a build page. Returns whether it was sent. */
export function trackViewContent(slug: string, valueNok: number | null | undefined): boolean {
    if (!pixelReady()) return false;
    trackPixel('ViewContent', { content_ids: [slug], content_type: 'product', ...priced(valueNok) });
    return true;
}

/** InitiateCheckout once the checkout is started, with the total including delivery. */
export function trackInitiateCheckout(slug: string, totalNok: number): void {
    trackPixel('InitiateCheckout', { content_ids: [slug], content_type: 'product', num_items: 1, value: totalNok, currency: CURRENCY });
}

function readSent(): string[] {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(PURCHASE_STORAGE_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((ref): ref is string => typeof ref === 'string') : [];
    } catch {
        return [];
    }
}

/**
 * Purchase for a reserved or paid order, once per order reference in this browser. The reference is kept in
 * localStorage, so a reload, a page restored from the back-forward cache or a second tab sends nothing more.
 * The reference is also the event ID, so Meta drops a duplicate that still gets through. Nothing is recorded
 * while the pixel cannot send, so the event goes out once the visitor accepts.
 */
export function trackPurchaseOnce(order: OrderStatusInfo): boolean {
    if (!pixelReady()) return false;
    const sent = readSent();
    if (sentHere.has(order.reference) || sent.includes(order.reference)) return false;
    sentHere.add(order.reference);
    try {
        window.localStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify([...sent, order.reference].slice(-KEEP_PURCHASES)));
    } catch {
        // Storage is full or blocked. The event ID still lets Meta drop a repeat.
    }
    trackPixel(
        'Purchase',
        {
            ...(order.buildSlug ? { content_ids: [order.buildSlug] } : {}),
            content_type: 'product',
            num_items: 1,
            value: order.totalInOre / 100,
            currency: CURRENCY,
        },
        { eventID: order.reference },
    );
    return true;
}
