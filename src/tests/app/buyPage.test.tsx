import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BuyPage, { dynamic, generateMetadata } from '@/app/[locale]/builds/[slug]/buy/page';
import { publicGetLive, publicGetLiveOptional } from '@/lib/publicApi';
import type { BuildDetail } from '@/services/buildService';
import type { ShopConfig } from '@/services/shopService';

vi.mock('@/lib/publicApi', () => ({ publicGetLive: vi.fn(), publicGetLiveOptional: vi.fn() }));
vi.mock('@/components/shop/CheckoutForm', () => ({
    default: ({ mode, termsVersion }: { mode: string, termsVersion: string }) => <div data-testid="checkout-form" data-terms-version={termsVersion}>{mode}</div>,
}));

const build = (overrides: Partial<BuildDetail> = {}) =>
    ({ slug: 'gaming-pc', title: 'Gaming PC', availability: 'Available', priceNok: 9990, published: true, coverImageId: null, conditions: [], allPartsHaveCondition: true, ...overrides }) as BuildDetail;

const config: ShopConfig = {
    buyButton: 'Everyone',
    delivery: [{ method: 'Pickup', priceNok: 0, label: 'Henting', description: null, maxDistanceKm: null }],
    termsVersion: '2026-10-19T12:00:00.000000Z',
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
        expect(screen.getByTestId('checkout-form')).toHaveAttribute('data-terms-version', '2026-10-19T12:00:00.000000Z');
    });

    it('keeps Kjøp in place, off, with Mangler tilstand på delene. for a build with a part without a condition', async () => {
        vi.mocked(publicGetLive).mockResolvedValue(build({ allPartsHaveCondition: false }));
        vi.mocked(publicGetLiveOptional).mockResolvedValue(config);
        render(await BuyPage({ params }));

        expect(screen.getByRole('heading', { name: 'Kjøp Gaming PC' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kjøp' })).toBeDisabled();
        expect(screen.getByText('Mangler tilstand på delene.')).toBeInTheDocument();
        expect(screen.queryByTestId('checkout-form')).not.toBeInTheDocument();
    });

    it('shows the condition and the main parts above the checkout form', async () => {
        const part = (id: number, categoryKey: string, categoryName: string, name: string, condition: string | null) => ({
            id, componentPartId: null, componentCategoryId: null, categoryKey, categoryName, manufacturerName: null, name, details: null,
            condition: condition ? { id: condition === 'Ny' ? 2 : 1, key: condition.toLowerCase(), name: condition } : null, sortOrder: id,
        });
        vi.mocked(publicGetLive).mockResolvedValue(build({
            components: [
                part(1, 'storage', 'Lagring', 'Samsung 860 EVO 1 TB', 'Ny'),
                part(2, 'cooling', 'Kjøling', 'Arctic Freezer 34', 'Ny'),
                part(3, 'cpu', 'Prosessor', 'Ryzen 5 5600X', 'Brukt'),
                part(4, 'memory', 'Minne', '16 GB DDR4', null),
                part(5, 'gpu', 'Skjermkort', 'RTX 4070', 'Brukt'),
            ],
            conditions: [{ id: 2, key: 'ny', name: 'Ny' }, { id: 1, key: 'brukt', name: 'Brukt' }],
        }));
        vi.mocked(publicGetLiveOptional).mockResolvedValue(config);
        const { container } = render(await BuyPage({ params }));

        const rows = [...container.querySelectorAll('dl > div')].map(row => row.textContent);
        expect(rows).toEqual([
            'Tilstand:Ny, Brukt',
            'Prosessor:Ryzen 5 5600X (Brukt)',
            'Skjermkort:RTX 4070 (Brukt)',
            'Minne:16 GB DDR4',
            'Lagring:Samsung 860 EVO 1 TB (Ny)',
        ]);
        expect(container.querySelector('dl')!.compareDocumentPosition(screen.getByTestId('checkout-form'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it.each([
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

    it('shows the summary and a disabled button with the reserved text for a reserved build, and no form', async () => {
        vi.mocked(publicGetLive).mockResolvedValue(build({ availability: 'Reserved' }));
        vi.mocked(publicGetLiveOptional).mockResolvedValue(config);
        render(await BuyPage({ params }));

        expect(screen.getByRole('heading', { name: 'Kjøp Gaming PC' })).toBeInTheDocument();
        expect(screen.getByText(/9\s?990/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kjøp' })).toBeDisabled();
        expect(screen.getByText('Reservert av en annen kjøper.')).toBeInTheDocument();
        expect(screen.queryByTestId('checkout-form')).not.toBeInTheDocument();
        expect(screen.queryByText('Datamaskinen kan ikke kjøpes på nettet nå.')).not.toBeInTheDocument();
    });

    it('says it in English for a reserved build', async () => {
        vi.mocked(publicGetLive).mockResolvedValue(build({ availability: 'Reserved' }));
        vi.mocked(publicGetLiveOptional).mockResolvedValue(config);
        render(await BuyPage({ params: Promise.resolve({ locale: 'en', slug: 'gaming-pc' }) }));

        expect(screen.getByRole('button', { name: 'Buy' })).toBeDisabled();
        expect(screen.getByText('Reserved by another buyer.')).toBeInTheDocument();
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
