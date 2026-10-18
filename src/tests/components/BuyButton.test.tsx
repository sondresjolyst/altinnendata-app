import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BuyButton from '@/components/shop/BuyButton';
import type { BuildDetail } from '@/services/buildService';

const session = vi.hoisted(() => ({ roles: [] as string[] }));

vi.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { roles: session.roles } }, status: 'authenticated' }),
}));

const build = (overrides: Partial<BuildDetail> = {}) =>
    ({ slug: 'gaming-pc', availability: 'Available', priceNok: 9990, published: true, ...overrides }) as BuildDetail;

describe('BuyButton', () => {
    it('shows Kjøp med Vipps to an admin while the mode is AdminsOnly', () => {
        session.roles = ['Admin'];
        render(<BuyButton build={build()} mode="AdminsOnly" locale="no" hasDelivery />);

        expect(screen.getByRole('link', { name: 'Kjøp med Vipps' })).toHaveAttribute('href', '/no/builds/gaming-pc/buy');
    });

    it('shows the English text and path for the English site', () => {
        session.roles = [];
        render(<BuyButton build={build()} mode="Everyone" locale="en" hasDelivery />);

        expect(screen.getByRole('link', { name: 'Buy with Vipps' })).toHaveAttribute('href', '/en/builds/gaming-pc/buy');
    });

    it('shows nothing to a visitor while the mode is AdminsOnly', () => {
        session.roles = [];
        render(<BuyButton build={build()} mode="AdminsOnly" locale="no" hasDelivery />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('shows nothing when the shop config is missing', () => {
        session.roles = ['Admin'];
        render(<BuyButton build={build()} mode={undefined} locale="no" hasDelivery />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it.each(['Reserved', 'Sold'] as const)('shows nothing for a %s build', availability => {
        session.roles = ['Admin'];
        render(<BuyButton build={build({ availability })} mode="Everyone" locale="no" hasDelivery />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('shows nothing for a build without a price', () => {
        session.roles = ['Admin'];
        render(<BuyButton build={build({ priceNok: null })} mode="Everyone" locale="no" hasDelivery />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('shows nothing when no delivery option is offered', () => {
        session.roles = ['Admin'];
        render(<BuyButton build={build()} mode="Everyone" locale="no" hasDelivery={false} />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
