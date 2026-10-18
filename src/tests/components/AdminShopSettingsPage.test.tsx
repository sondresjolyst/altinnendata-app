import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import { navigation, resetTestMocks, toastSpies } from '@sjolystinnovation/app-kit/testing';
import AdminShopSettingsPage from '@/app/[locale]/(protected)/admin/shop/settings/page';
import AdminShopLayout from '@/app/[locale]/(protected)/admin/shop/layout';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { Locale } from '@/i18n/config';
import type { ShopSettings } from '@/services/shopService';

const service = vi.hoisted(() => ({ getSettings: vi.fn(), updateSettings: vi.fn() }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('next/navigation', async () => (await import('@sjolystinnovation/app-kit/testing')).nextNavigationMock());
vi.mock('@/services/shopService', () => ({ default: service }));

const settings: ShopSettings = {
    buyButton: 'AdminsOnly',
    vippsTestMode: true,
    delivery: [
        { method: 'Shipping', enabled: true, priceNok: 300, labelNo: 'Sending', labelEn: 'Shipping', descriptionNo: 'Med Bring', descriptionEn: 'With Bring', maxDistanceKm: null },
        { method: 'HomeDelivery', enabled: false, priceNok: 500, labelNo: 'Levering hjem', labelEn: 'Home delivery', descriptionNo: null, descriptionEn: null, maxDistanceKm: 50 },
        { method: 'Pickup', enabled: true, priceNok: 0, labelNo: 'Henting', labelEn: 'Pickup', descriptionNo: null, descriptionEn: null, maxDistanceKm: null },
    ],
    termsUpdatedSinceShop: true,
    shopCreatedAt: '2026-01-01T00:00:00Z',
};

const strings = {
    no: {
        admins: 'Bare for administratorer', everyone: 'For alle', vippsTest: 'Test (testpenger)', vippsLive: 'Ekte betalinger',
        offered: 'Tilbys', price: 'Pris (kr)', shipping: 'Sending', home: 'Levering hjem', maxDistance: 'Største avstand (km)',
        warning: 'Vilkårene må oppdateres med salgsvilkår før kjøpsknappen kan vises for alle. Lagre vilkårene på norsk og engelsk under Juridiske sider.',
    },
    en: {
        admins: 'Administrators only', everyone: 'Everyone', vippsTest: 'Test (test money)', vippsLive: 'Real payments',
        offered: 'Offered', price: 'Price (NOK)', shipping: 'Shipping', home: 'Home delivery', maxDistance: 'Longest distance (km)',
        warning: 'The terms must be updated with sales terms before the buy button can show for everyone. Save the terms in Norwegian and English under Legal pages.',
    },
} as const;

// The Error that the shop service throws for an API refusal.
const refused = (status: number, data: object) =>
    request(
        () => Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, data } })),
        'Failed',
    ).catch((e: unknown) => e);

const renderPage = (locale: Locale) =>
    render(
        <DictionaryProvider locale={locale}>
            <AdminShopSettingsPage />
        </DictionaryProvider>,
    );

const group = (name: string) => screen.getByRole('group', { name });

describe('the admin shop settings page', () => {
    beforeEach(() => {
        resetTestMocks();
        service.getSettings.mockReset().mockResolvedValue(settings);
        service.updateSettings.mockReset();
    });

    it.each(['no', 'en'] as const)('shows the saved modes and delivery options (%s)', async locale => {
        const t = strings[locale];
        renderPage(locale);

        expect(await screen.findByRole('radio', { name: t.admins })).toBeChecked();
        expect(screen.getByRole('radio', { name: t.vippsTest })).toBeChecked();
        expect(screen.getByRole('radio', { name: t.vippsLive })).not.toBeChecked();

        const shipping = within(group(t.shipping));
        expect(shipping.getByRole('switch', { name: t.offered })).toBeChecked();
        expect(shipping.getByLabelText(t.price)).toHaveValue(300);
        expect(shipping.getByDisplayValue('With Bring')).toBeInTheDocument();
        expect(shipping.queryByLabelText(t.maxDistance)).not.toBeInTheDocument();

        const home = within(group(t.home));
        expect(home.getByRole('switch', { name: t.offered })).not.toBeChecked();
        expect(home.getByLabelText(t.maxDistance)).toHaveValue(50);
    });

    it.each(['no', 'en'] as const)('disables For alle and shows the terms warning until the terms are saved (%s)', async locale => {
        const t = strings[locale];
        service.getSettings.mockResolvedValue({ ...settings, termsUpdatedSinceShop: false });
        renderPage(locale);

        expect(await screen.findByRole('radio', { name: t.everyone })).toBeDisabled();
        expect(screen.getByText(t.warning)).toBeInTheDocument();
    });

    it('enables For alle once the terms are saved', async () => {
        renderPage('no');

        expect(await screen.findByRole('radio', { name: 'For alle' })).toBeEnabled();
        expect(screen.queryByText(strings.no.warning)).not.toBeInTheDocument();
    });

    it('shows the terms warning when the API refuses For alle with termsNotUpdated', async () => {
        service.updateSettings.mockRejectedValueOnce(await refused(409, { code: 'termsNotUpdated', message: 'Save the terms first.' }));
        renderPage('no');
        await userEvent.click(await screen.findByRole('button', { name: 'Lagre' }));

        expect(await screen.findByText(strings.no.warning)).toBeInTheDocument();
        expect(toastSpies.error).not.toHaveBeenCalled();
    });

    it('sends the edited settings and shows Innstillingene er lagret', async () => {
        service.updateSettings.mockResolvedValue(settings);
        renderPage('no');
        await userEvent.click(await screen.findByRole('radio', { name: 'Ekte betalinger' }));
        await userEvent.click(screen.getByRole('radio', { name: 'For alle' }));
        const home = within(group('Levering hjem'));
        await userEvent.click(home.getByRole('switch', { name: 'Tilbys' }));
        await userEvent.clear(home.getByLabelText('Pris (kr)'));
        await userEvent.type(home.getByLabelText('Pris (kr)'), '600');
        await userEvent.click(screen.getByRole('button', { name: 'Lagre' }));

        await waitFor(() => expect(service.updateSettings).toHaveBeenCalledTimes(1));
        const sent = service.updateSettings.mock.calls[0][0];
        expect(sent).not.toHaveProperty('termsUpdatedSinceShop');
        expect(sent).not.toHaveProperty('shopCreatedAt');
        expect(sent.buyButton).toBe('Everyone');
        expect(sent.vippsTestMode).toBe(false);
        expect(sent.delivery[1]).toMatchObject({ method: 'HomeDelivery', enabled: true, priceNok: 600, maxDistanceKm: 50 });
        expect(sent.delivery[0]).toMatchObject({ method: 'Shipping', priceNok: 300, labelNo: 'Sending', descriptionEn: 'With Bring' });
        await waitFor(() => expect(toastSpies.success).toHaveBeenCalledWith('Innstillingene er lagret'));
    });

    it('shows Bruk 80 eller færre tegn. under the label the API refused', async () => {
        service.updateSettings.mockRejectedValueOnce(
            await refused(400, {
                errors: { 'Delivery[2].LabelNo': ['Too long.'] },
                codes: { 'Delivery[2].LabelNo': ['tooLong'] },
                limits: { 'Delivery[2].LabelNo': 80 },
            }),
        );
        renderPage('no');
        await userEvent.click(await screen.findByRole('button', { name: 'Lagre' }));

        const label = within(group('Henting')).getByLabelText(/^Navn \(Norsk\)/);
        await waitFor(() => expect(label).toHaveAccessibleDescription('Bruk 80 eller færre tegn.'));
        expect(within(group('Sending')).getByLabelText(/^Navn \(Norsk\)/)).not.toHaveAccessibleDescription();
    });
});

describe('the Butikk sub navigation', () => {
    beforeEach(() => resetTestMocks());

    it.each([
        ['no', '/no/admin/shop/settings', 'Innstillinger', 'Ordrer'],
        ['en', '/en/admin/shop/settings', 'Settings', 'Orders'],
        ['no', '/no/admin/shop', 'Ordrer', 'Innstillinger'],
        ['no', '/no/admin/shop/orders/7', 'Ordrer', 'Innstillinger'],
    ] as const)('marks the current sub page (%s %s)', (locale, path, current, other) => {
        navigation.pathname = path;
        render(
            <DictionaryProvider locale={locale}>
                <AdminShopLayout>
                    <p>content</p>
                </AdminShopLayout>
            </DictionaryProvider>,
        );

        expect(screen.getByRole('link', { name: current })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: other })).not.toHaveAttribute('aria-current');
        expect(screen.getByText('content')).toBeInTheDocument();
    });
});
