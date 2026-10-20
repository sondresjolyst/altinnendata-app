import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PayLinkPage, { dynamic, generateMetadata } from '@/app/[locale]/shop/pay/[token]/page';
import { publicGet } from '@/lib/publicApi';
import type { PayLinkInfo } from '@/services/shopService';

vi.mock('@/lib/publicApi', () => ({ publicGet: vi.fn() }));
vi.mock('@/components/shop/PayLinkButton', () => ({
    default: ({ token, locale }: { token: string; locale: string }) => <button type="button" data-token={token} data-locale={locale}>Vipps</button>,
}));

const token = 'abcDEF123_-abcDEF123_-abcDEF123_-abcDEF123';
const link: PayLinkInfo = { reference: 'AID-000007-1A2B3C4D', buildTitle: 'Spillmaskin', totalInOre: 1299000, expiresAt: '2026-10-23T12:30:00Z', locale: 'no' };
const params = (locale = 'no') => Promise.resolve({ locale, token });

beforeEach(() => {
    vi.mocked(publicGet).mockReset();
});

describe('the pay link page', () => {
    it('reads the link live on every request and stays out of search results', async () => {
        vi.mocked(publicGet).mockResolvedValue(link);
        expect(dynamic).toBe('force-dynamic');
        await PayLinkPage({ params: params() });
        expect(publicGet).toHaveBeenCalledWith(`/shop/pay/${token}`, { revalidate: 0 });

        const metadata = await generateMetadata({ params: params() });
        expect(metadata.robots).toEqual({ index: false, follow: false });
        expect(metadata.title).toBe('Betaling');
        expect(metadata.alternates).toBeUndefined();
    });

    it('escapes the token in the API path', async () => {
        vi.mocked(publicGet).mockResolvedValue(null);
        await PayLinkPage({ params: Promise.resolve({ locale: 'no', token: 'a/b?c' }) });
        expect(publicGet).toHaveBeenCalledWith('/shop/pay/a%2Fb%3Fc', { revalidate: 0 });
    });

    it('shows the build, order number, total, expiry and the Vipps button', async () => {
        vi.mocked(publicGet).mockResolvedValue(link);
        render(await PayLinkPage({ params: params() }));

        expect(screen.getByRole('heading', { level: 1, name: 'Betal ordren' })).toBeInTheDocument();
        expect(screen.getByText('Datamaskin:').nextElementSibling).toHaveTextContent('Spillmaskin');
        expect(screen.getByText('Ordrenummer:').nextElementSibling).toHaveTextContent('AID-000007-1A2B3C4D');
        expect(screen.getByText('Totalt:').nextElementSibling).toHaveTextContent(/^12\s990\skr$/);
        expect(screen.getByText('Lenken er gyldig til 23.10.2026 kl. 14:30.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Vipps' })).toHaveAttribute('data-token', token);
        expect(screen.queryByText(/vilkår/i)).not.toBeInTheDocument();
    });

    it('shows the English texts', async () => {
        vi.mocked(publicGet).mockResolvedValue(link);
        render(await PayLinkPage({ params: params('en') }));

        expect(screen.getByRole('heading', { level: 1, name: 'Pay for your order' })).toBeInTheDocument();
        expect(screen.getByText('The link is valid until 23.10.2026 at 14:30.')).toBeInTheDocument();
    });

    it('tells the buyer to contact us for an unknown, used or expired link', async () => {
        vi.mocked(publicGet).mockResolvedValue(null);
        render(await PayLinkPage({ params: params() }));

        expect(screen.getByRole('heading', { level: 1, name: 'Lenken er ikke gyldig lenger. Ta kontakt med oss.' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Kontakt oss' })).toHaveAttribute('href', '/no/contact');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
