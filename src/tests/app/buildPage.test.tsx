import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import BuildPage from '@/app/[locale]/builds/[slug]/page';
import { publicGet, publicGetOptional } from '@/lib/publicApi';
import type { BuildComponent, BuildDetail } from '@/services/buildService';

vi.mock('@/lib/publicApi', () => ({ publicGet: vi.fn(), publicGetOptional: vi.fn() }));
vi.mock('@/components/shop/BuyButton', () => ({
    default: ({ mode, hasDelivery }: { mode: string | undefined; hasDelivery: boolean }) => <span data-testid="buy-button">{`${String(mode)} ${hasDelivery}`}</span>,
}));

const component = (id: number, overrides: Partial<BuildComponent>): BuildComponent => ({
    id,
    componentPartId: null,
    componentCategoryId: null,
    categoryKey: null,
    categoryName: 'Grafikkort',
    manufacturerName: null,
    name: 'RTX 3070',
    details: null,
    condition: null,
    sortOrder: id,
    ...overrides,
});

const build = (components: BuildComponent[]): BuildDetail => ({
    conditions: [...new Map(components.flatMap(c => (c.condition ? [[c.condition.id, c.condition] as const] : []))).values()],
    id: 1,
    slug: 'gaming-pc',
    category: null,
    availability: 'Available',
    buildClass: null,
    priceNok: null,
    builtOn: null,
    soldOn: null,
    coverImageId: null,
    published: true,
    sortOrder: 0,
    locale: 'no',
    title: 'Gaming PC',
    summary: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    allPartsHaveCondition: true,
    finnUrl: null,
    description: null,
    imageIds: [],
    components,
    availableLocales: ['no'],
});

async function renderPage(components: BuildComponent[]) {
    vi.mocked(publicGet).mockResolvedValue(build(components));
    render(await BuildPage({ params: Promise.resolve({ locale: 'no', slug: 'gaming-pc' }) }));
    return screen.getAllByRole('row').map(row =>
        [within(row).getByRole('rowheader'), ...within(row).getAllByRole('cell')].map(cell => cell.textContent));
}

beforeEach(() => {
    vi.mocked(publicGet).mockReset();
    vi.mocked(publicGetOptional).mockReset();
    vi.mocked(publicGetOptional).mockResolvedValue(null);
});

describe('build page spec table', () => {
    it('shows the condition beside the category', async () => {
        const rows = await renderPage([
            component(1, { name: 'RTX 3070', condition: { id: 1, key: 'brukt', name: 'brukt' }, details: '8 GB' }),
            component(2, { categoryName: 'Prosessor', name: 'Ryzen 5 5600X' }),
        ]);

        expect(rows).toEqual([
            ['Grafikkort (brukt)', 'RTX 3070 — 8 GB'],
            ['Prosessor', 'Ryzen 5 5600X'],
        ]);
    });
});

describe('build page buy button', () => {
    it('keeps the contact link first and hands the shop mode to the buy button', async () => {
        vi.mocked(publicGet).mockResolvedValue(build([]));
        vi.mocked(publicGetOptional).mockResolvedValue({
            buyButton: 'Everyone',
            delivery: [{ method: 'Pickup', priceNok: 0, label: 'Henting', description: null, maxDistanceKm: null }],
        });
        render(await BuildPage({ params: Promise.resolve({ locale: 'no', slug: 'gaming-pc' }) }));

        const contact = screen.getByRole('link', { name: 'Ta kontakt om maskinen' });
        expect(contact).toHaveAttribute('href', '/no/contact?build=gaming-pc');
        expect(screen.getByTestId('buy-button')).toHaveTextContent('Everyone true');
        expect(screen.getByTestId('buy-button').parentElement).toBe(contact.parentElement);
        expect(contact.compareDocumentPosition(screen.getByTestId('buy-button')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(publicGetOptional).toHaveBeenCalledWith('/shop/config?locale=no', { tags: ['shop'] });
    });

    it('tells the buy button when no delivery option is offered', async () => {
        vi.mocked(publicGet).mockResolvedValue(build([]));
        vi.mocked(publicGetOptional).mockResolvedValue({ buyButton: 'Everyone', delivery: [] });
        render(await BuildPage({ params: Promise.resolve({ locale: 'no', slug: 'gaming-pc' }) }));

        expect(screen.getByTestId('buy-button')).toHaveTextContent('Everyone false');
    });

    it('passes no mode when the config cannot be fetched', async () => {
        vi.mocked(publicGet).mockResolvedValue(build([]));
        render(await BuildPage({ params: Promise.resolve({ locale: 'no', slug: 'gaming-pc' }) }));

        expect(screen.getByTestId('buy-button')).toHaveTextContent('undefined false');
    });

    it('shows the conditions of the parts next to the other facts', async () => {
        await renderPage([
            component(1, { condition: { id: 1, key: 'brukt', name: 'Brukt' } }),
            component(2, { condition: { id: 2, key: 'ny', name: 'Ny' } }),
        ]);

        expect(screen.getByText('Tilstand:').nextElementSibling).toHaveTextContent('Brukt, Ny');
    });

    it('takes the conditions from the API, in its order', async () => {
        vi.mocked(publicGet).mockResolvedValue({ ...build([]), conditions: [{ id: 2, key: 'ny', name: 'Ny' }, { id: 1, key: 'brukt', name: 'Brukt' }] });
        render(await BuildPage({ params: Promise.resolve({ locale: 'no', slug: 'gaming-pc' }) }));

        expect(screen.getByText('Tilstand:').nextElementSibling).toHaveTextContent('Ny, Brukt');
    });

    it('leaves the condition out when no part has one', async () => {
        await renderPage([component(1, {})]);

        expect(screen.queryByText('Tilstand:')).not.toBeInTheDocument();
    });
});
