import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BuyPage, { dynamic, generateMetadata } from '@/app/[locale]/builds/[slug]/buy/page';
import { publicGet, publicGetOptional } from '@/lib/publicApi';
import type { BuildDetail } from '@/services/buildService';
import type { ShopConfig } from '@/services/shopService';

vi.mock('@/lib/publicApi', () => ({ publicGet: vi.fn(), publicGetOptional: vi.fn() }));
vi.mock('@/components/shop/CheckoutForm', () => ({
    default: ({ mode }: { mode: string }) => <div data-testid="checkout-form">{mode}</div>,
}));

const build = (overrides: Partial<BuildDetail> = {}) =>
    ({ slug: 'gaming-pc', title: 'Gaming PC', availability: 'Available', priceNok: 9990, published: true, coverImageId: null, ...overrides }) as BuildDetail;

const config: ShopConfig = { buyButton: 'Everyone', delivery: [] };
const params = Promise.resolve({ locale: 'no', slug: 'gaming-pc' });

beforeEach(() => {
    vi.mocked(publicGet).mockReset();
    vi.mocked(publicGetOptional).mockReset();
});

describe('buy page', () => {
    it('is rendered per request and kept out of search results', async () => {
        vi.mocked(publicGet).mockResolvedValue(build());

        expect(dynamic).toBe('force-dynamic');
        expect((await generateMetadata({ params })).robots).toEqual({ index: false });
    });

    it('shows the summary and the checkout form for a build that can be bought', async () => {
        vi.mocked(publicGet).mockResolvedValue(build());
        vi.mocked(publicGetOptional).mockResolvedValue(config);
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
    ])('says the computer cannot be bought for %s', async (_name, current, shop) => {
        vi.mocked(publicGet).mockResolvedValue(current);
        vi.mocked(publicGetOptional).mockResolvedValue(shop);
        render(await BuyPage({ params }));

        expect(screen.getByText('Datamaskinen kan ikke kjøpes på nettet nå.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Tilbake til datamaskinen' })).toHaveAttribute('href', '/no/builds/gaming-pc');
        expect(screen.getByRole('link', { name: 'Ta kontakt' })).toHaveAttribute('href', '/no/contact?build=gaming-pc');
        expect(screen.queryByTestId('checkout-form')).not.toBeInTheDocument();
    });
});
