import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BuyButton from '@/components/shop/BuyButton';
import type { BuildDetail } from '@/services/buildService';

const session = vi.hoisted(() => ({ roles: [] as string[] }));

vi.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { roles: session.roles } }, status: 'authenticated' }),
}));

const build = (overrides: Partial<BuildDetail> = {}) =>
    ({ slug: 'gaming-pc', availability: 'Available', priceNok: 9990, published: true, allPartsHaveCondition: true, ...overrides }) as BuildDetail;

describe('BuyButton', () => {
    it('shows Kjøp to an admin while the mode is AdminsOnly', () => {
        session.roles = ['Admin'];
        render(<BuyButton build={build()} mode="AdminsOnly" locale="no" hasDelivery />);

        expect(screen.getByRole('link', { name: 'Kjøp' })).toHaveAttribute('href', '/no/builds/gaming-pc/buy');
    });

    it('shows the English text and path for the English site', () => {
        session.roles = [];
        render(<BuyButton build={build()} mode="Everyone" locale="en" hasDelivery />);

        expect(screen.getByRole('link', { name: 'Buy' })).toHaveAttribute('href', '/en/builds/gaming-pc/buy');
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

    it.each([
        ['Reserved', 'no', 'Reservert av en annen kjøper.'],
        ['Sold', 'no', 'Solgt.'],
        ['Reserved', 'en', 'Reserved by another buyer.'],
        ['Sold', 'en', 'Sold.'],
    ] as const)('shows a disabled button and the note for a %s build in %s', (availability, locale, note) => {
        session.roles = [];
        render(<BuyButton build={build({ availability })} mode="Everyone" locale={locale} hasDelivery />);

        const button = screen.getByRole('button', { name: locale === 'no' ? 'Kjøp' : 'Buy' });
        expect(button).toBeDisabled();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.getByText(note)).toBeInTheDocument();
    });

    it('gives the disabled button the size classes of the link, so nothing moves', () => {
        session.roles = [];
        const link = render(<BuyButton build={build()} mode="Everyone" locale="no" hasDelivery />);
        const linkClasses = screen.getByRole('link').className;
        link.unmount();
        render(<BuyButton build={build({ availability: 'Reserved' })} mode="Everyone" locale="no" hasDelivery />);

        for (const name of ['px-6', 'py-3', 'font-semibold', 'rounded-lg']) {
            expect(linkClasses).toContain(name);
            expect(screen.getByRole('button').className).toContain(name);
        }
    });

    it('shows a plain site button, not the Vipps artwork, because it opens our own checkout', () => {
        session.roles = [];
        render(<BuyButton build={build()} mode="Everyone" locale="no" hasDelivery />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it.each(['Reserved', 'Sold'] as const)('shows a disabled button for a %s build only to a viewer the mode allows', availability => {
        session.roles = [];
        render(<BuyButton build={build({ availability })} mode="AdminsOnly" locale="no" hasDelivery />);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.queryByText(/Reservert|Solgt/)).not.toBeInTheDocument();
    });

    it.each([
        ['without a price', { priceNok: null }],
        ['that is unpublished', { published: false }],
        ['that is unpublished and reserved', { published: false, availability: 'Reserved' as const }],
    ])('shows nothing for a build %s', (_name, overrides) => {
        session.roles = ['Admin'];
        render(<BuyButton build={build(overrides)} mode="Everyone" locale="no" hasDelivery />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows nothing when no delivery option is offered', () => {
        session.roles = ['Admin'];
        render(<BuyButton build={build({ availability: 'Reserved' })} mode="Everyone" locale="no" hasDelivery={false} />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('keeps Kjøp in place, off, with Mangler tilstand på delene. when a part has no condition', () => {
        session.roles = [];
        render(<BuyButton build={build({ allPartsHaveCondition: false })} mode="Everyone" locale="no" hasDelivery />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kjøp' })).toBeDisabled();
        expect(screen.getByText('Mangler tilstand på delene.')).toBeInTheDocument();
    });

    it('says the English text for a build missing conditions', () => {
        session.roles = [];
        render(<BuyButton build={build({ allPartsHaveCondition: false })} mode="Everyone" locale="en" hasDelivery />);

        expect(screen.getByRole('button', { name: 'Buy' })).toBeDisabled();
        expect(screen.getByText('The condition of the parts is missing.')).toBeInTheDocument();
    });
});
