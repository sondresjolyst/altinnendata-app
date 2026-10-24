// The shop's Meta Pixel events. trackPixel sends nothing without marketing consent or before the pixel
// has loaded, and says whether it sent, so every function here is safe to call. Values are in kroner, as Meta expects.
import { trackPixel } from '@sjolystinnovation/app-kit/consent';
import type { OrderStatusInfo } from '@/services/shopService';

const CURRENCY = 'NOK';

/** The localStorage key with the order references a Purchase went out for. */
export const PURCHASE_STORAGE_KEY = 'pixel-purchases';

/** How many references the key keeps, newest last. */
const KEEP_PURCHASES = 20;

/**
 * References sent from this page load. When localStorage is blocked, this is the only record, so a reload or a
 * second tab can send the same Purchase again. Meta then drops the repeat by its event ID, the order reference.
 */
const sentHere = new Set<string>();

const priced = (valueNok: number | null | undefined) => (valueNok == null ? {} : { value: valueNok, currency: CURRENCY });

/** ViewContent for a build page. Returns whether it was sent. */
export function trackViewContent(slug: string, valueNok: number | null | undefined): boolean {
    return trackPixel('ViewContent', { content_ids: [slug], content_type: 'product', ...priced(valueNok) });
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
 * The reference is also the event ID, so Meta drops a duplicate that still gets through. A reference is recorded
 * only once the event was really sent, so a send that consent or a missing pixel blocked is tried again later.
 */
export function trackPurchaseOnce(order: OrderStatusInfo): boolean {
    if (typeof window === 'undefined') return false;
    const sent = readSent();
    if (sentHere.has(order.reference) || sent.includes(order.reference)) return false;
    const params = {
        ...(order.buildSlug ? { content_ids: [order.buildSlug] } : {}),
        content_type: 'product',
        num_items: 1,
        value: order.totalInOre / 100,
        currency: CURRENCY,
    };
    if (!trackPixel('Purchase', params, { eventID: order.reference })) return false;
    sentHere.add(order.reference);
    try {
        window.localStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify([...sent, order.reference].slice(-KEEP_PURCHASES)));
    } catch {
        // Storage is full or blocked. Only this page load remembers the purchase, and Meta's event ID dedupe is the backstop.
    }
    return true;
}
