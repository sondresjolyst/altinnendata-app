import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { defaultEmailStatsPanelStrings } from '@sjolystinnovation/app-kit/admin';
import { nbEmailStatsPanelStrings as nb } from '@sjolystinnovation/app-kit/locales/nb';
import AdminStatsPage from '@/app/[locale]/(protected)/admin/stats/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';

const admin = vi.hoisted(() => ({ getStats: vi.fn(), getStatsHistory: vi.fn() }));
const email = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('@/services/adminService', () => ({ default: admin, EmailStatsService: email }));
vi.mock('@/components/shop/VatThresholdPanel', () => ({ default: () => <section data-testid="vat-panel" /> }));

const stats = {
    totalUsers: 2, publishedBuilds: 3, draftBuilds: 1, soldBuilds: 0, catalogParts: 5, contentImages: 4,
    storageUsedBytes: 1536, diskTotalBytes: 10 * 1024 ** 3, diskFreeBytes: 4 * 1024 ** 3,
};

const renderPage = (locale: Locale) =>
    render(
        <DictionaryProvider locale={locale}>
            <AdminStatsPage />
        </DictionaryProvider>,
    );

const row = (label: string) => screen.getByText(label).parentElement!;

describe('admin stats page', () => {
    beforeEach(() => {
        admin.getStats.mockReset().mockResolvedValue(stats);
        admin.getStatsHistory.mockReset().mockResolvedValue([]);
        email.get.mockReset();
    });

    it.each([
        ['no', nb],
        ['en', defaultEmailStatsPanelStrings],
    ] as const)('shows the email stats in the page language (%s)', async (locale, text) => {
        email.get.mockResolvedValue({ days: 30, requests: 12, delivered: 10, hardBounces: 1, softBounces: 2, spamReports: 1, blocked: 3, invalid: 0 });
        renderPage(locale);

        expect(await screen.findByRole('heading', { name: text.title.replace('{days}', '30') })).toBeInTheDocument();
        expect(await screen.findByText(text.sent)).toBeInTheDocument();
        expect(row(text.sent)).toHaveTextContent('12');
        expect(row(text.delivered)).toHaveTextContent('10');
        expect(row(text.bounces)).toHaveTextContent('3');
        expect(row(text.blocked)).toHaveTextContent('4');
        expect(email.get).toHaveBeenCalledWith(30);
    });

    it('says the email stats are unavailable in Norwegian when they cannot load', async () => {
        email.get.mockRejectedValue(new Error('Bad gateway'));
        renderPage('no');

        expect(await screen.findByText(nb.unavailable)).toBeInTheDocument();
    });

    it('shows the storage numbers from the stats', async () => {
        email.get.mockResolvedValue({ days: 30, requests: 0, delivered: 0, hardBounces: 0, softBounces: 0, spamReports: 0, blocked: 0, invalid: 0 });
        renderPage('no');
        const dict = getDictionary('no');

        expect(await screen.findByText('1.5 KB')).toBeInTheDocument();
        expect(row(dict.admin.diskFree)).toHaveTextContent('4.0 GB');
        expect(row(dict.admin.diskTotal)).toHaveTextContent('10.0 GB');
    });

    it('shows the captured Vipps revenue in kroner', async () => {
        admin.getStats.mockResolvedValue({ ...stats, capturedRevenueInOre: 1299000 });
        email.get.mockResolvedValue({ days: 30, requests: 0, delivered: 0, hardBounces: 0, softBounces: 0, spamReports: 0, blocked: 0, invalid: 0 });
        renderPage('no');

        expect(await screen.findByText('Innbetalt med Vipps')).toBeInTheDocument();
        expect(row('Innbetalt med Vipps')).toHaveTextContent('12 990');
    });

    it('hides the row when the API sends no captured revenue', async () => {
        email.get.mockResolvedValue({ days: 30, requests: 0, delivered: 0, hardBounces: 0, softBounces: 0, spamReports: 0, blocked: 0, invalid: 0 });
        renderPage('no');

        expect(await screen.findByText(getDictionary('no').admin.revenue)).toBeInTheDocument();
        expect(screen.queryByText('Innbetalt med Vipps')).not.toBeInTheDocument();
    });
});
