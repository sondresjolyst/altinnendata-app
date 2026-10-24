import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MetaPixel, setConsent } from '@sjolystinnovation/app-kit/consent';
import ViewContentPixel from '@/components/shop/ViewContentPixel';
import ShopReturn from '@/components/shop/ShopReturn';
import ShopService, { type OrderStatusInfo } from '@/services/shopService';
import { PURCHASE_STORAGE_KEY, trackInitiateCheckout, trackPurchaseOnce, trackViewContent } from '@/lib/pixelEvents';
import { CONSENT_OPTIONS } from '@/lib/consent';
import { acceptPixel, events, loadPixel, resetPixel } from '../pixel';

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

const stored = () => JSON.parse(window.localStorage.getItem(PURCHASE_STORAGE_KEY) ?? 'null') as string[] | null;

beforeEach(() => {
    reference = `AID-00100${++count}-9C0D1E2F`;
    resetPixel();
    orderStatus.mockReset();
});

describe('the pixel event helpers', () => {
    it('send ViewContent, InitiateCheckout and Purchase in NOK with the build as the product', () => {
        const fbq = acceptPixel();

        expect(trackViewContent('gaming-pc', 12990)).toBe(true);
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

        expect(trackViewContent('gaming-pc', 12990)).toBe(false);
        trackInitiateCheckout('gaming-pc', 13290);
        expect(trackPurchaseOnce(order())).toBe(false);

        expect(fbq).not.toHaveBeenCalled();
        expect(stored()).toBeNull();
    });

    it('send nothing with consent before the pixel has loaded', () => {
        acceptPixel();
        delete (window as Window & { fbq?: unknown }).fbq;

        expect(trackViewContent('gaming-pc', 12990)).toBe(false);
        expect(trackPurchaseOnce(order())).toBe(false);
        expect(stored()).toBeNull();
    });

    it('send nothing for a consent given under an older notice', () => {
        const fbq = loadPixel();
        setConsent({ marketing: true, noticeVersion: '2025-01-01' });

        expect(trackViewContent('gaming-pc', 12990)).toBe(false);
        expect(trackPurchaseOnce(order())).toBe(false);

        expect(fbq).not.toHaveBeenCalled();
        expect(stored()).toBeNull();
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
