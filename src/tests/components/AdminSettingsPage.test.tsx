import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminSettingsPage from '@/app/[locale]/(protected)/admin/settings/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { Locale } from '@/i18n/config';

vi.mock('@/services/settingsService', () => ({
    default: { get: vi.fn().mockResolvedValue({}), update: vi.fn() },
}));
vi.mock('@/services/brandingService', () => ({
    default: { update: vi.fn() },
}));

const renderPage = (locale: Locale) =>
    render(
        <DictionaryProvider locale={locale}>
            <AdminSettingsPage />
        </DictionaryProvider>,
    );

describe('the admin settings page', () => {
    it('shows the branding form in Norwegian', async () => {
        renderPage('no');

        expect(await screen.findByRole('heading', { name: 'Logo og ikon' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Lagre logo og ikon' })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Velg fil' })).toHaveLength(2);
        expect(screen.queryByText('Branding')).not.toBeInTheDocument();
    });

    it('shows the branding form in English', async () => {
        renderPage('en');

        expect(await screen.findByRole('heading', { name: 'Logo and icon' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save logo and icon' })).toBeInTheDocument();
    });
});
