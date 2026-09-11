import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import BuildPage from '@/app/[locale]/builds/[slug]/page';
import { publicGet } from '@/lib/publicApi';
import type { BuildComponent, BuildDetail } from '@/services/buildService';

vi.mock('@/lib/publicApi', () => ({ publicGet: vi.fn() }));

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

beforeEach(() => vi.mocked(publicGet).mockReset());

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
