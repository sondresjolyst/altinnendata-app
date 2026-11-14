// The shop's Meta Pixel and TikTok Pixel events. trackPixel and trackTikTok send nothing without marketing consent or
// before their pixel has loaded, and say whether they sent, so every function here is safe to call. Values are in
// kroner, as both expect.
import { trackPixel, trackTikTok } from '@sjolystinnovation/app-kit/consent';
import type { OrderStatusInfo } from '@/services/shopService';

const CURRENCY = 'NOK';

/** The marketing pixels the shop sends events to. */
export type Pixel = 'meta' | 'tiktok';

export const PIXELS: readonly Pixel[] = ['meta', 'tiktok'];

/** The localStorage key with the order references a Meta Pixel Purchase went out for. */
export const PURCHASE_STORAGE_KEY = 'pixel-purchases';

/** The localStorage key with the order references a TikTok Pixel Purchase went out for. */
export const TIKTOK_PURCHASE_STORAGE_KEY = 'tiktok-purchases';

const STORAGE_KEYS: Record<Pixel, string> = { meta: PURCHASE_STORAGE_KEY, tiktok: TIKTOK_PURCHASE_STORAGE_KEY };

/** How many references each key keeps, newest last. */
const KEEP_PURCHASES = 20;

/**
 * References sent from this page load, for each pixel. When localStorage is blocked, this is the only record, so a
 * reload or a second tab can send the same Purchase again. Each pixel then drops the repeat by its event ID, the order
 * reference.
 */
const sentHere: Record<Pixel, Set<string>> = { meta: new Set(), tiktok: new Set() };

const priced = (valueNok: number | null | undefined) => (valueNok == null ? {} : { value: valueNok, currency: CURRENCY });

/** TikTok's product list: one item, with the price of one where it is known. */
const tikTokContents = (slug: string, priceNok: number | null | undefined) => [
    { content_id: slug, quantity: 1, ...(priceNok == null ? {} : { price: priceNok }) },
];

/** ViewContent for a build page, to the pixels in `only`. Returns the pixels it was sent to. */
export function trackViewContent(slug: string, valueNok: number | null | undefined, only: readonly Pixel[] = PIXELS): Pixel[] {
    const sent: Pixel[] = [];
    if (only.includes('meta') && trackPixel('ViewContent', { content_ids: [slug], content_type: 'product', ...priced(valueNok) })) {
        sent.push('meta');
    }
    if (only.includes('tiktok') && trackTikTok('ViewContent', { contents: tikTokContents(slug, valueNok), content_type: 'product', ...priced(valueNok) })) {
        sent.push('tiktok');
    }
    return sent;
}

/** InitiateCheckout once the checkout is started, with the total including delivery and the price of the build. */
export function trackInitiateCheckout(slug: string, totalNok: number, priceNok?: number | null): void {
    trackPixel('InitiateCheckout', { content_ids: [slug], content_type: 'product', num_items: 1, value: totalNok, currency: CURRENCY });
    trackTikTok('InitiateCheckout', { contents: tikTokContents(slug, priceNok), content_type: 'product', value: totalNok, currency: CURRENCY });
}

/**
 * A sent contact form: Contact to the Meta Pixel and Lead to the TikTok Pixel, as each defines a question sent through a
 * form. It carries no parameters, so nothing from the message reaches either pixel.
 */
export function trackContact(): void {
    trackPixel('Contact');
    trackTikTok('Lead');
}

function readSent(pixel: Pixel): string[] {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEYS[pixel]) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((ref): ref is string => typeof ref === 'string') : [];
    } catch {
        return [];
    }
}

/** Sends the Purchase to one pixel unless it already went out there, and records it once it was really sent. */
function purchaseOnce(pixel: Pixel, order: OrderStatusInfo, send: () => boolean): boolean {
    const sent = readSent(pixel);
    if (sentHere[pixel].has(order.reference) || sent.includes(order.reference)) return false;
    if (!send()) return false;
    sentHere[pixel].add(order.reference);
    try {
        window.localStorage.setItem(STORAGE_KEYS[pixel], JSON.stringify([...sent, order.reference].slice(-KEEP_PURCHASES)));
    } catch {
        // Storage is full or blocked. Only this page load remembers the purchase, and the event ID dedupe is the backstop.
    }
    return true;
}

/**
 * Purchase for a reserved or paid order, once per order reference and pixel in this browser. Each pixel keeps its
 * references in its own localStorage key, so a reload, a page restored from the back-forward cache or a second tab
 * sends nothing more to it. The reference is also the event ID, so each pixel drops a duplicate that still gets
 * through. A reference is recorded only once the event was really sent to that pixel, so a send that consent or a
 * missing pixel blocked is tried again later, and one pixel sending does not count for the other. Returns whether
 * any pixel sent.
 */
export function trackPurchaseOnce(order: OrderStatusInfo): boolean {
    const value = order.totalInOre / 100;
    const itemPrice = typeof order.buildPriceInOre === 'number' && Number.isFinite(order.buildPriceInOre) ? order.buildPriceInOre / 100 : null;
    const meta = purchaseOnce('meta', order, () =>
        trackPixel(
            'Purchase',
            {
                ...(order.buildSlug ? { content_ids: [order.buildSlug] } : {}),
                content_type: 'product',
                num_items: 1,
                value,
                currency: CURRENCY,
            },
            { eventID: order.reference },
        ),
    );
    const tiktok = purchaseOnce('tiktok', order, () =>
        trackTikTok(
            'Purchase',
            {
                // The item price is the build alone. The value is the total, which includes delivery.
                ...(order.buildSlug ? { contents: tikTokContents(order.buildSlug, itemPrice) } : {}),
                content_type: 'product',
                value,
                currency: CURRENCY,
            },
            { eventId: order.reference },
        ),
    );
    return meta || tiktok;
}
