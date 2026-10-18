import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BuyPage, { dynamic, generateMetadata } from '@/app/[locale]/builds/[slug]/buy/page';
import { publicGetLive, publicGetLiveOptional } from '@/lib/publicApi';
import type { BuildDetail } from '@/services/buildService';
import type { ShopConfig } from '@/services/shopService';

vi.mock('@/lib/publicApi', () => ({ publicGetLive: vi.fn(), publicGetLiveOptional: vi.fn() }));
vi.mock('@/components/shop/CheckoutForm', () => ({
    default: ({ mode }: { mode: string }) => <div data-testid="checkout-form">{mode}</div>,
}));

const build = (overrides: Partial<BuildDetail> = {}) =>
    ({ slug: 'gaming-pc', title: 'Gaming PC', availability: 'Available', priceNok: 9990, published: true, coverImageId: null, ...overrides }) as BuildDetail;

const config: ShopConfig = {
    buyButton: 'Everyone',
    delivery: [{ method: 'Pickup', priceNok: 0, label: 'Henting', description: null, maxDistanceKm: null }],
};
const params = Promise.resolve({ locale: 'no', slug: 'gaming-pc' });

beforeEach(() => {
    vi.mocked(publicGetLive).mockReset();
    vi.mocked(publicGetLiveOptional).mockReset();
});

describe('buy page', () => {
    it('is rendered per request, reads the build and shop config uncached and stays out of search results', async () => {
        vi.mocked(publicGetLive).mockResolvedValue(build());
        vi.mocked(publicGetLiveOptional).mockResolvedValue(config);

        expect(dynamic).toBe('force-dynamic');
        await BuyPage({ params });
        expect(publicGetLive).toHaveBeenCalledWith('/builds/gaming-pc?locale=no');
        expect(publicGetLiveOptional).toHaveBeenCalledWith('/shop/config?locale=no');
        expect((await generateMetadata({ params })).robots).toEqual({ index: false });
    });

    it('shows the summary and the checkout form for a build that can be bought', async () => {
        vi.mocked(publicGetLive).mockResolvedValue(build());
        vi.mocked(publicGetLiveOptional).mockResolvedValue(config);
        render(await BuyPage({ params }));

        expect(screen.getByRole('heading', { name: 'Kjøp Gaming PC' })).toBeInTheDocument();
        expect(screen.getByText(/9\s?990/)).toBeInTheDocument();
        expect(screen.getByTestId('checkout-form')).toHaveTextContent('Everyone');
    });

    it.each([
        ['a reserved build', build({ availability: 'Reserved' }), config],
        ['a build without a price', build({ priceNok: null }), config],
        ['a closed shop', build(), { ...config, buyButton: 'Off' } as ShopConfig],
        ['a missing config', build(), null],
        ['every delivery option switched off', build(), { ...config, delivery: [] } as ShopConfig],
    ])('says the computer cannot be bought for %s', async (_name, current, shop) => {
        vi.mocked(publicGetLive).mockResolvedValue(current);
        vi.mocked(publicGetLiveOptional).mockResolvedValue(shop);
        render(await BuyPage({ params }));

        expect(screen.getByText('Datamaskinen kan ikke kjøpes på nettet nå.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Tilbake til datamaskinen' })).toHaveAttribute('href', '/no/builds/gaming-pc');
        expect(screen.getByRole('link', { name: 'Ta kontakt' })).toHaveAttribute('href', '/no/contact?build=gaming-pc');
        expect(screen.queryByTestId('checkout-form')).not.toBeInTheDocument();
    });

    it('has a heading on the unavailable view', async () => {
        vi.mocked(publicGetLive).mockResolvedValue(build({ availability: 'Sold' }));
        vi.mocked(publicGetLiveOptional).mockResolvedValue(config);
        render(await BuyPage({ params }));

        expect(screen.getByRole('heading', { level: 1, name: 'Datamaskinen kan ikke kjøpes på nettet nå.' })).toBeInTheDocument();
    });

    it('writes a title with $ patterns as typed', async () => {
        vi.mocked(publicGetLive).mockResolvedValue(build({ title: 'PC $& $1' }));
        vi.mocked(publicGetLiveOptional).mockResolvedValue(config);
        render(await BuyPage({ params }));

        expect(screen.getByRole('heading', { name: 'Kjøp PC $& $1' })).toBeInTheDocument();
    });
});
