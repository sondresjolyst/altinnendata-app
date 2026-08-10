import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BuildCard from '@/components/BuildCard';
import { BuildSummary } from '@/services/buildService';

const base: BuildSummary = {
    id: 1,
    slug: 'gaming-pc-4070',
    category: 'gaming',
    availability: 'Available',
    priceNok: 18990,
    builtOn: '2026-05-01',
    coverImageId: null,
    published: true,
    sortOrder: 0,
    locale: 'no',
    title: 'Gaming-PC 4070',
    summary: 'Rask maskin for spill',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
};

describe('BuildCard', () => {
    it('links to the build in the current locale', () => {
        render(<BuildCard build={base} locale="en" />);
        expect(screen.getByRole('link')).toHaveAttribute('href', '/en/builds/gaming-pc-4070');
    });

    it('shows the availability in the visitor language', () => {
        render(<BuildCard build={{ ...base, availability: 'Sold' }} locale="no" />);
        expect(screen.getByText('Solgt')).toBeInTheDocument();
    });

    it('marks unpublished builds as drafts', () => {
        render(<BuildCard build={{ ...base, published: false }} locale="no" />);
        expect(screen.getByText('Utkast')).toBeInTheDocument();
    });

    it('omits the price when the build has none', () => {
        render(<BuildCard build={{ ...base, priceNok: null }} locale="no" />);
        expect(screen.queryByText(/kr/)).not.toBeInTheDocument();
    });
});
