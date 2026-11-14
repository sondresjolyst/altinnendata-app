import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MetaPixel, TikTokPixel, setConsent } from '@sjolystinnovation/app-kit/consent';
import ViewContentPixel from '@/components/shop/ViewContentPixel';
import ShopReturn from '@/components/shop/ShopReturn';
import ShopService, { type OrderStatusInfo } from '@/services/shopService';
import { PURCHASE_STORAGE_KEY, TIKTOK_PURCHASE_STORAGE_KEY, trackInitiateCheckout, trackPurchaseOnce, trackViewContent } from '@/lib/pixelEvents';
import { CONSENT_OPTIONS } from '@/lib/consent';
import { acceptPixel, acceptTikTok, events, loadPixel, loadTikTok, resetPixel, tikTokEvents } from '../pixel';

vi.mock('next/navigation', () => ({
    usePathname: () => '/no/builds/gaming-pc',
    useSearchParams: () => new URLSearchParams({ token: 'abc123' }),
}));
vi.mock('@/services/shopService', () => ({ default: { orderStatus: vi.fn() } }));

const orderStatus = vi.mocked(ShopService.orderStatus);

// The helpers remember the references sent from the page, so each test buys a new order.
let count = 0;
let reference = '';

const order = (overrides: Partial<OrderStatusInfo> = {}): OrderStatusInfo => ({
    status: 'Reserved',
    reference,
    buildTitle: 'Gaming PC',
    totalInOre: 1299050,
    deliveryMethod: 'Shipping',
    buildSlug: 'gaming-pc',
    ...overrides,
});

const purchase = (ref = reference, slug: string | null = 'gaming-pc') => [
    'track',
    'Purchase',
    { ...(slug ? { content_ids: [slug] } : {}), content_type: 'product', num_items: 1, value: 12990.5, currency: 'NOK' },
    { eventID: ref },
];

/** Lets the timers and the promises of one render run. */
const tick = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });

const stored = (key = PURCHASE_STORAGE_KEY) => JSON.parse(window.localStorage.getItem(key) ?? 'null') as string[] | null;
const storedTikTok = () => stored(TIKTOK_PURCHASE_STORAGE_KEY);

const tikTokPurchase = (ref = reference, slug: string | null = 'gaming-pc') => [
    'track',
    'Purchase',
    { ...(slug ? { contents: [{ content_id: slug, quantity: 1 }] } : {}), content_type: 'product', value: 12990.5, currency: 'NOK' },
    { event_id: ref },
];

type TtqWindow = Window & { ttq?: unknown };

beforeEach(() => {
    reference = `AID-00100${++count}-9C0D1E2F`;
    resetPixel();
    orderStatus.mockReset();
});

describe('the pixel event helpers', () => {
    it('send ViewContent, InitiateCheckout and Purchase in NOK with the build as the product', () => {
        const fbq = acceptPixel();

        expect(trackViewContent('gaming-pc', 12990)).toEqual(['meta']);
        trackInitiateCheckout('gaming-pc', 13290);
        expect(trackPurchaseOnce(order())).toBe(true);

        expect(events(fbq)).toEqual([
            ['track', 'ViewContent', { content_ids: ['gaming-pc'], content_type: 'product', value: 12990, currency: 'NOK' }],
            ['track', 'InitiateCheckout', { content_ids: ['gaming-pc'], content_type: 'product', num_items: 1, value: 13290, currency: 'NOK' }],
            purchase(),
        ]);
    });

    it('leave out the value of a build without a price', () => {
        const fbq = acceptPixel();

        trackViewContent('gaming-pc', null);

        expect(events(fbq)).toEqual([['track', 'ViewContent', { content_ids: ['gaming-pc'], content_type: 'product' }]]);
    });

    it('leave out content_ids when the order status has no build slug', () => {
        const fbq = acceptPixel();

        trackPurchaseOnce(order({ buildSlug: undefined }));

        expect(events(fbq)).toEqual([purchase(reference, null)]);
    });

    it('send nothing without consent, even with the pixel loaded', () => {
        const fbq = loadPixel();

        expect(trackViewContent('gaming-pc', 12990)).toEqual([]);
        trackInitiateCheckout('gaming-pc', 13290);
        expect(trackPurchaseOnce(order())).toBe(false);

        expect(fbq).not.toHaveBeenCalled();
        expect(stored()).toBeNull();
    });

    it('send nothing with consent before the pixel has loaded', () => {
        acceptPixel();
        delete (window as Window & { fbq?: unknown }).fbq;

        expect(trackViewContent('gaming-pc', 12990)).toEqual([]);
        expect(trackPurchaseOnce(order())).toBe(false);
        expect(stored()).toBeNull();
    });

    it('send nothing for a consent given under an older notice', async () => {
        setConsent({ marketing: true, noticeVersion: '2025-01-01' });

        render(<MetaPixel {...CONSENT_OPTIONS} pixelId="123456789012345" />);
        await tick();

        expect((window as Window & { fbq?: unknown }).fbq).toBeUndefined();
        expect(trackViewContent('gaming-pc', 12990)).toEqual([]);
        expect(trackPurchaseOnce(order())).toBe(false);
        expect(stored()).toBeNull();
    });

    it('record a purchase only once it was really sent, so a blocked send is tried again', () => {
        const fbq = loadPixel();

        expect(trackPurchaseOnce(order())).toBe(false);
        expect(stored()).toBeNull();
        expect(fbq).not.toHaveBeenCalled();

        acceptPixel();
        (window as Window & { fbq?: unknown }).fbq = fbq;
        expect(trackPurchaseOnce(order())).toBe(true);
        expect(trackPurchaseOnce(order())).toBe(false);

        expect(events(fbq)).toEqual([purchase()]);
        expect(stored()).toEqual([reference]);
    });

    it('drop stored entries that are not references', () => {
        acceptPixel();
        window.localStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(['REF-OLD', 5, null, { a: 1 }]));

        trackPurchaseOnce(order({ reference: 'REF-AFTER-JUNK' }));

        expect(stored()).toEqual(['REF-OLD', 'REF-AFTER-JUNK']);
    });

    it('keep the last 20 purchase references', () => {
        const fbq = acceptPixel();
        window.localStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(Array.from({ length: 20 }, (_, i) => `REF-${i}`)));

        trackPurchaseOnce(order({ reference: 'REF-NEW' }));
        trackPurchaseOnce(order({ reference: 'REF-5' }));

        expect(stored()).toEqual([...Array.from({ length: 19 }, (_, i) => `REF-${i + 1}`), 'REF-NEW']);
        expect(events(fbq).map(call => (call[3] as { eventID: string }).eventID)).toEqual(['REF-NEW']);
    });

    it('still send a purchase once on the page when storage is broken', () => {
        const fbq = acceptPixel();
        window.localStorage.setItem(PURCHASE_STORAGE_KEY, '{not json');
        const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });

        expect(trackPurchaseOnce(order({ reference: 'REF-BROKEN' }))).toBe(true);
        expect(trackPurchaseOnce(order({ reference: 'REF-BROKEN' }))).toBe(false);

        setItem.mockRestore();
        expect(events(fbq)).toHaveLength(1);
    });
});

describe('the TikTok Pixel events', () => {
    it('send ViewContent, InitiateCheckout and Purchase in the shape TikTok asks for', () => {
        acceptPixel();
        const ttq = loadTikTok();

        expect(trackViewContent('gaming-pc', 12990)).toEqual(['meta', 'tiktok']);
        trackInitiateCheckout('gaming-pc', 13290, 12990);
        expect(trackPurchaseOnce(order())).toBe(true);

        expect(tikTokEvents(ttq)).toEqual([
            ['track', 'ViewContent', { contents: [{ content_id: 'gaming-pc', quantity: 1, price: 12990 }], content_type: 'product', value: 12990, currency: 'NOK' }],
            ['track', 'InitiateCheckout', { contents: [{ content_id: 'gaming-pc', quantity: 1, price: 12990 }], content_type: 'product', value: 13290, currency: 'NOK' }],
            tikTokPurchase(),
        ]);
        expect(storedTikTok()).toEqual([reference]);
    });

    it('leave out the value and the price when they are not known', () => {
        const ttq = acceptTikTok();

        trackViewContent('gaming-pc', null);
        trackInitiateCheckout('gaming-pc', 300);
        trackPurchaseOnce(order({ buildSlug: undefined }));

        expect(tikTokEvents(ttq)).toEqual([
            ['track', 'ViewContent', { contents: [{ content_id: 'gaming-pc', quantity: 1 }], content_type: 'product' }],
            ['track', 'InitiateCheckout', { contents: [{ content_id: 'gaming-pc', quantity: 1 }], content_type: 'product', value: 300, currency: 'NOK' }],
            tikTokPurchase(reference, null),
        ]);
    });

    it('give the Purchase item the build price and keep the total as the value', () => {
        const fbq = acceptPixel();
        const ttq = loadTikTok();

        expect(trackPurchaseOnce(order({ buildPriceInOre: 1269050 }))).toBe(true);

        expect(tikTokEvents(ttq)).toEqual([
            [
                'track',
                'Purchase',
                { contents: [{ content_id: 'gaming-pc', quantity: 1, price: 12690.5 }], content_type: 'product', value: 12990.5, currency: 'NOK' },
                { event_id: reference },
            ],
        ]);
        // Meta's reference documents no item price in contents, so its Purchase keeps the same shape.
        expect(events(fbq)).toEqual([purchase()]);
    });

    it('leave out the Purchase item price when the build price is null or missing', () => {
        acceptPixel();
        const ttq = loadTikTok();
        const missing = reference;
        const empty = `${reference}-NULL`;

        trackPurchaseOnce(order());
        trackPurchaseOnce(order({ reference: empty, buildPriceInOre: null }));

        expect(tikTokEvents(ttq)).toEqual([tikTokPurchase(missing), tikTokPurchase(empty)]);
    });

    it('send nothing without consent, even with the pixel loaded', () => {
        const ttq = loadTikTok();

        expect(trackViewContent('gaming-pc', 12990)).toEqual([]);
        trackInitiateCheckout('gaming-pc', 13290, 12990);
        expect(trackPurchaseOnce(order())).toBe(false);

        expect(ttq).not.toHaveBeenCalled();
        expect(storedTikTok()).toBeNull();
    });

    it('send to TikTok alone when only the TikTok Pixel is loaded', () => {
        const ttq = acceptTikTok();

        expect(trackViewContent('gaming-pc', 12990)).toEqual(['tiktok']);
        expect(trackPurchaseOnce(order())).toBe(true);

        expect(tikTokEvents(ttq)).toHaveLength(2);
        expect(storedTikTok()).toEqual([reference]);
        expect(stored()).toBeNull();
    });

    it('send only to the pixels asked for', () => {
        const fbq = acceptPixel();
        const ttq = loadTikTok();

        expect(trackViewContent('gaming-pc', 12990, ['tiktok'])).toEqual(['tiktok']);

        expect(events(fbq)).toEqual([]);
        expect(tikTokEvents(ttq)).toHaveLength(1);
    });
});

describe('Purchase once for each pixel', () => {
    it('records the purchase for the pixel that sent, and sends it to the other once that one loads', () => {
        const fbq = acceptPixel();

        expect(trackPurchaseOnce(order())).toBe(true);
        expect(stored()).toEqual([reference]);
        expect(storedTikTok()).toBeNull();

        const ttq = loadTikTok();
        expect(trackPurchaseOnce(order())).toBe(true);
        expect(trackPurchaseOnce(order())).toBe(false);

        expect(events(fbq)).toEqual([purchase()]);
        expect(tikTokEvents(ttq)).toEqual([tikTokPurchase()]);
        expect(storedTikTok()).toEqual([reference]);
    });

    it('sends to Meta later when only TikTok was loaded at first', () => {
        const ttq = acceptTikTok();

        expect(trackPurchaseOnce(order())).toBe(true);
        expect(stored()).toBeNull();

        const fbq = loadPixel();
        expect(trackPurchaseOnce(order())).toBe(true);
        expect(trackPurchaseOnce(order())).toBe(false);

        expect(events(fbq)).toEqual([purchase()]);
        expect(tikTokEvents(ttq)).toEqual([tikTokPurchase()]);
    });

    it('does not let one pixel stored purchase count for the other across a reload', async () => {
        acceptPixel();
        trackPurchaseOnce(order());

        // A reload: only localStorage remembers, and the Meta key must not count for TikTok.
        vi.resetModules();
        const reloaded = await import('@/lib/pixelEvents');
        const fbq = loadPixel();
        const ttq = loadTikTok();

        expect(reloaded.trackPurchaseOnce(order())).toBe(true);
        expect(reloaded.trackPurchaseOnce(order())).toBe(false);
        expect(events(fbq)).toEqual([]);
        expect(tikTokEvents(ttq)).toEqual([tikTokPurchase()]);
    });

    it('keeps a TikTok purchase from this page load when storage is broken', () => {
        acceptPixel();
        const ttq = loadTikTok();
        const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });

        expect(trackPurchaseOnce(order())).toBe(true);
        expect(trackPurchaseOnce(order())).toBe(false);

        setItem.mockRestore();
        expect(tikTokEvents(ttq)).toHaveLength(1);
    });
});

describe('ViewContentPixel', () => {
    it('sends ViewContent after the layout pixel has loaded in the same commit', async () => {
        acceptPixel();
        delete (window as Window & { fbq?: unknown }).fbq;

        // The page comes before MetaPixel in the tree, so its effect runs first, as in the layout.
        render(
            <>
                <ViewContentPixel slug="gaming-pc" priceNok={12990} />
                <MetaPixel {...CONSENT_OPTIONS} pixelId="123456789012345" />
            </>,
        );
        await tick();

        const queue = (window as Window & { fbq?: { queue: unknown[][] } }).fbq!.queue;
        expect(queue.filter(call => call[0] === 'track')).toEqual([
            ['track', 'PageView'],
            ['track', 'ViewContent', { content_ids: ['gaming-pc'], content_type: 'product', value: 12990, currency: 'NOK' }],
        ]);
    });

    it('sends it once across rerenders', async () => {
        const fbq = acceptPixel();

        const { rerender } = render(<ViewContentPixel slug="gaming-pc" priceNok={12990} />);
        await tick();
        rerender(<ViewContentPixel slug="gaming-pc" priceNok={12990} />);
        await tick();

        expect(events(fbq)).toHaveLength(1);
    });

    it('sends it once when the visitor withdraws and accepts again on the same page', async () => {
        const fbq = acceptPixel();

        render(<ViewContentPixel slug="gaming-pc" priceNok={12990} />);
        await tick();
        act(() => { setConsent({ marketing: false, ...CONSENT_OPTIONS }); });
        await tick();
        act(() => { setConsent({ marketing: true, ...CONSENT_OPTIONS }); });
        await tick();

        expect(events(fbq)).toHaveLength(1);
    });

    it('sends nothing until the visitor accepts', async () => {
        const fbq = loadPixel();

        render(<ViewContentPixel slug="gaming-pc" priceNok={12990} />);
        await tick();
        expect(fbq).not.toHaveBeenCalled();

        act(() => { acceptPixel(); });
        (window as Window & { fbq?: unknown }).fbq = fbq;
        await tick();

        expect(events(fbq)).toEqual([['track', 'ViewContent', expect.objectContaining({ content_ids: ['gaming-pc'] })]]);
    });
});

describe('ViewContentPixel with both pixels', () => {
    it('sends ViewContent to both pixels after the layout pixels load in the same commit', async () => {
        setConsent({ marketing: true, ...CONSENT_OPTIONS });

        render(
            <>
                <ViewContentPixel slug="gaming-pc" priceNok={12990} />
                <MetaPixel {...CONSENT_OPTIONS} pixelId="123456789012345" />
                <TikTokPixel {...CONSENT_OPTIONS} pixelId="C4A1B2C3D4E5F6G7H8I9" />
            </>,
        );
        await tick();

        const meta = (window as Window & { fbq?: { queue: unknown[][] } }).fbq!.queue;
        expect(meta.filter(call => call[0] === 'track')).toEqual([
            ['track', 'PageView'],
            ['track', 'ViewContent', { content_ids: ['gaming-pc'], content_type: 'product', value: 12990, currency: 'NOK' }],
        ]);
        const tiktok = (window as TtqWindow).ttq as unknown[][];
        expect(tiktok.filter(call => call[0] === 'track')).toEqual([
            ['track', 'ViewContent', { contents: [{ content_id: 'gaming-pc', quantity: 1, price: 12990 }], content_type: 'product', value: 12990, currency: 'NOK' }],
        ]);
    });

    it('sends to the pixel that missed it on a new consent, and not again to the one that sent', async () => {
        const fbq = acceptPixel();

        render(<ViewContentPixel slug="gaming-pc" priceNok={12990} />);
        await tick();
        expect(events(fbq)).toHaveLength(1);

        act(() => { setConsent({ marketing: false, ...CONSENT_OPTIONS }); });
        await tick();
        const ttq = loadTikTok();
        act(() => { setConsent({ marketing: true, ...CONSENT_OPTIONS }); });
        await tick();

        expect(events(fbq)).toHaveLength(1);
        expect(tikTokEvents(ttq)).toEqual([['track', 'ViewContent', expect.objectContaining({ content_type: 'product' })]]);
    });

    it('sends again for a new build on the same mount', async () => {
        const fbq = acceptPixel();
        const ttq = loadTikTok();

        const { rerender } = render(<ViewContentPixel slug="gaming-pc" priceNok={12990} />);
        await tick();
        rerender(<ViewContentPixel slug="office-pc" priceNok={6990} />);
        await tick();

        expect(events(fbq)).toHaveLength(2);
        expect(tikTokEvents(ttq)).toHaveLength(2);
    });
});

describe('the Purchase on the return page with both pixels', () => {
    it('fires once to each pixel with the order reference as the event ID', async () => {
        const fbq = acceptPixel();
        const ttq = loadTikTok();
        orderStatus.mockResolvedValue(order());

        render(<ShopReturn locale="no" />);

        await waitFor(() => expect(tikTokEvents(ttq)).toEqual([tikTokPurchase()]));
        expect(events(fbq)).toEqual([purchase()]);
        expect(stored()).toEqual([reference]);
        expect(storedTikTok()).toEqual([reference]);
    });

    it('fires to TikTok on a later visit when only Meta was loaded the first time', async () => {
        const fbq = acceptPixel();
        orderStatus.mockResolvedValue(order());
        const first = render(<ShopReturn locale="no" />);
        await waitFor(() => expect(events(fbq)).toEqual([purchase()]));
        first.unmount();

        const ttq = loadTikTok();
        render(<ShopReturn locale="no" />);
        await waitFor(() => expect(tikTokEvents(ttq)).toEqual([tikTokPurchase()]));
        await tick();

        expect(events(fbq)).toEqual([purchase()]);
    });
});

describe('the Purchase on the return page', () => {
    it('fires once with the order reference as the event ID', async () => {
        const fbq = acceptPixel();
        orderStatus.mockResolvedValue(order());

        render(<ShopReturn locale="no" />);
        await waitFor(() => expect(screen.getByRole('heading', { name: 'Betalingen er reservert' })).toBeInTheDocument());
        await waitFor(() => expect(events(fbq)).toEqual([purchase()]));
        expect(stored()).toEqual([reference]);
    });

    it('fires for a paid order', async () => {
        const fbq = acceptPixel();
        orderStatus.mockResolvedValue(order({ status: 'Paid' }));

        render(<ShopReturn locale="no" />);

        await waitFor(() => expect(events(fbq)).toEqual([purchase()]));
    });

    it.each(['Pending', 'Failed', 'Cancelled', 'Refunded'] as const)('does not fire for a %s order', async status => {
        const fbq = acceptPixel();
        orderStatus.mockResolvedValue(order({ status }));

        render(<ShopReturn locale="no" />);
        await tick();
        await tick();

        expect(events(fbq)).toEqual([]);
        expect(stored()).toBeNull();
    });

    it('fires only once across a remount and a reload', async () => {
        const fbq = acceptPixel();
        orderStatus.mockResolvedValue(order());

        const first = render(<ShopReturn locale="no" />);
        await tick();
        await tick();
        first.unmount();

        render(<ShopReturn locale="no" />).unmount();
        await tick();

        // A reload starts the modules again, so only localStorage remembers the purchase.
        vi.resetModules();
        const { default: Reloaded } = await import('@/components/shop/ShopReturn');
        render(<Reloaded locale="no" />);
        await tick();
        await tick();

        expect(orderStatus.mock.calls.length).toBeGreaterThanOrEqual(3);
        expect(events(fbq)).toEqual([purchase()]);
    });

    it('fires once across two tabs open on the same return page', async () => {
        const fbq = acceptPixel();
        orderStatus.mockResolvedValue(order());

        render(<ShopReturn locale="no" />);
        await waitFor(() => expect(events(fbq)).toHaveLength(1));

        // The second tab has its own copy of the modules and shares only localStorage with the first.
        vi.resetModules();
        const { default: SecondTab } = await import('@/components/shop/ShopReturn');
        render(<SecondTab locale="no" />);
        await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Betalingen er reservert' })).toHaveLength(2));
        await tick();

        expect(events(fbq)).toEqual([purchase()]);
        expect(stored()).toEqual([reference]);
    });

    it('sends Purchase after the layout pixel loads when the visitor accepts on the return page', async () => {
        orderStatus.mockResolvedValue(order());

        // ShopReturn comes before MetaPixel in the tree, so on accept its effect runs before the pixel exists.
        render(
            <>
                <ShopReturn locale="no" />
                <MetaPixel {...CONSENT_OPTIONS} pixelId="123456789012345" />
            </>,
        );
        await waitFor(() => expect(screen.getByRole('heading', { name: 'Betalingen er reservert' })).toBeInTheDocument());
        await tick();
        expect((window as Window & { fbq?: unknown }).fbq).toBeUndefined();

        act(() => { setConsent({ marketing: true, ...CONSENT_OPTIONS }); });
        await tick();

        const queue = (window as Window & { fbq?: { queue: unknown[][] } }).fbq!.queue;
        expect(queue.filter(call => call[0] === 'track')).toEqual([['track', 'PageView'], purchase()]);
        expect(stored()).toEqual([reference]);
    });

    it('fires once when the status moves from Reserved to Paid', async () => {
        const fbq = acceptPixel();
        orderStatus.mockResolvedValue(order());
        const reserved = render(<ShopReturn locale="no" />);
        await tick();
        await tick();
        reserved.unmount();

        orderStatus.mockResolvedValue(order({ status: 'Paid' }));
        render(<ShopReturn locale="no" />);
        await tick();
        await tick();

        expect(events(fbq)).toEqual([purchase()]);
    });

    it('waits for consent, and fires once the visitor accepts on the page', async () => {
        const fbq = loadPixel();
        orderStatus.mockResolvedValue(order());

        render(<ShopReturn locale="no" />);
        await tick();
        await tick();
        expect(fbq).not.toHaveBeenCalled();
        expect(stored()).toBeNull();

        act(() => { acceptPixel(); });
        (window as Window & { fbq?: unknown }).fbq = fbq;
        await tick();

        expect(events(fbq)).toEqual([purchase()]);
    });

    it('fires nothing when the visitor rejected', async () => {
        const fbq = loadPixel();
        orderStatus.mockResolvedValue(order());

        render(<ShopReturn locale="no" />);
        await tick();
        await tick();

        expect(fbq).not.toHaveBeenCalled();
        expect(stored()).toBeNull();
    });
});
