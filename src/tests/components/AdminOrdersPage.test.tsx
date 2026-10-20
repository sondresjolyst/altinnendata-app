import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { resetTestMocks } from '@sjolystinnovation/app-kit/testing';
import AdminOrdersPage from '@/app/[locale]/(protected)/admin/shop/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { AdminOrderSummary } from '@/services/shopService';

const service = vi.hoisted(() => ({ getOrders: vi.fn() }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('next/navigation', async () => (await import('@sjolystinnovation/app-kit/testing')).nextNavigationMock());
vi.mock('@/services/shopService', () => ({ default: service }));

const summary = (overrides: Partial<AdminOrderSummary>): AdminOrderSummary => ({
    id: 1,
    reference: 'AID-000001-5E6F7A8B',
    status: 'Reserved',
    buyerName: 'Kari Nordmann',
    buildTitle: 'Spillmaskin',
    pcBuildId: 3,
    deliveryMethod: 'Shipping',
    totalInOre: 1299000,
    capturedInOre: 0,
    refundedInOre: 0,
    isTest: false,
    captureGuaranteedUntil: '2099-01-01T00:00:00Z',
    invoiceNumber: null,
    createdAt: '2026-10-18T10:00:00Z',
    ...overrides,
});

const renderPage = () =>
    render(
        <DictionaryProvider locale="no">
            <AdminOrdersPage />
        </DictionaryProvider>,
    );

describe('the admin orders page', () => {
    beforeEach(() => {
        resetTestMocks();
        service.getOrders.mockReset();
    });

    it('lists orders with the Test pill, the deadline badge and the invoice number', async () => {
        const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        service.getOrders.mockResolvedValue([
            summary({ id: 1, status: 'Paid', invoiceNumber: 'F-1001', captureGuaranteedUntil: soon }),
            summary({ id: 2, buyerName: 'Ola Test', isTest: true, captureGuaranteedUntil: soon, createdAt: '2026-10-19T10:00:00Z' }),
        ]);
        renderPage();

        const rows = (await screen.findAllByRole('row')).slice(1);
        expect(rows).toHaveLength(2);

        const newest = within(rows[0]);
        expect(newest.getByText('Ola Test')).toBeInTheDocument();
        expect(newest.getByText('Test')).toBeInTheDocument();
        expect(newest.getByText('Reservert')).toBeInTheDocument();
        expect(newest.getByText(/^(kr\s)?12\s990(\skr)?$/)).toBeInTheDocument();
        expect(newest.getByText('Under 2 dager igjen')).toBeInTheDocument();
        expect(newest.getByRole('link', { name: 'Åpne ordre' })).toHaveAttribute('href', '/no/admin/shop/orders/2');

        const older = within(rows[1]);
        expect(older.getByText('Betalt')).toBeInTheDocument();
        expect(older.getByText('F-1001')).toBeInTheDocument();
        expect(older.queryByText('Under 2 dager igjen')).not.toBeInTheDocument();
        expect(older.queryByText('Test')).not.toBeInTheDocument();
    });

    it('shows the Delvis tilbakebetalt pill only while part of the captured amount is refunded', async () => {
        service.getOrders.mockResolvedValue([
            summary({ id: 1, status: 'Paid', capturedInOre: 1299000, refundedInOre: 300000 }),
            summary({ id: 2, status: 'Paid', capturedInOre: 1299000, refundedInOre: 0, createdAt: '2026-10-17T10:00:00Z' }),
            summary({ id: 3, status: 'Refunded', capturedInOre: 1299000, refundedInOre: 1299000, createdAt: '2026-10-16T10:00:00Z' }),
        ]);
        renderPage();

        const rows = (await screen.findAllByRole('row')).slice(1);
        expect(within(rows[0]).getByText('Delvis tilbakebetalt')).toBeInTheDocument();
        expect(within(rows[1]).queryByText('Delvis tilbakebetalt')).not.toBeInTheDocument();
        expect(within(rows[2]).queryByText('Delvis tilbakebetalt')).not.toBeInTheDocument();
    });

    it('shows Ukjent when the capture deadline is not known', async () => {
        service.getOrders.mockResolvedValue([summary({ captureGuaranteedUntil: null })]);
        renderPage();

        expect(await screen.findByText('Ukjent')).toBeInTheDocument();
    });

    it('shows an error instead of Laster when the orders cannot be loaded', async () => {
        service.getOrders.mockRejectedValue(new Error('Boom'));
        renderPage();

        expect(await screen.findByText('Kunne ikke hente ordrene')).toBeInTheDocument();
        expect(screen.queryByText('Laster…')).not.toBeInTheDocument();
    });
});
