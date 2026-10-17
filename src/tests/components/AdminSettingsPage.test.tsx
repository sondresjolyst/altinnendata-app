import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import AdminSettingsPage from '@/app/[locale]/(protected)/admin/settings/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';

const update = vi.fn();
const saved = {
    contactRecipientEmail: 'post@altinnendata.no',
    companyName: 'Altinnendata',
    companyLegalName: '',
    orgNumber: '',
    vatRegistered: false,
    streetAddress: 'Gate 1',
    postalCode: '',
    addressLocality: '',
    addressRegion: '',
    publicEmail: 'post@altinnendata.no',
    publicPhone: '12345678',
};

vi.mock('@/services/settingsService', () => ({
    default: { get: () => Promise.resolve(saved), update: (...args: unknown[]) => update(...args) },
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

// The Error that the settings service throws for the API's validation problem.
const refused = () =>
    request(
        () =>
            Promise.reject(
                Object.assign(new Error('Request failed with status code 400'), {
                    isAxiosError: true,
                    response: {
                        status: 400,
                        data: {
                            errors: { OrgNumber: ['Not a valid organisation number.'], CompanyName: ['At most 100 characters.'] },
                            codes: { OrgNumber: ['invalidOrgNumber'], CompanyName: ['tooLong'] },
                            limits: { CompanyName: 100 },
                        },
                    },
                }),
            ),
        'Failed',
    ).catch((e: unknown) => e);

describe('the admin settings page', () => {
    beforeEach(() => update.mockReset());

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

    it.each([
        ['no', 'Bruk 100 eller færre tegn'],
        ['en', 'At most 100 characters'],
    ] as const)('shows the API field errors from the %s dictionary', async (locale, limitText) => {
        const dict = getDictionary(locale);
        update.mockRejectedValueOnce(await refused());
        renderPage(locale);
        const org = await screen.findByLabelText(new RegExp(`^${dict.admin.orgNumber}`));

        await userEvent.click(screen.getByRole('button', { name: dict.common.save }));

        await waitFor(() => expect(org).toHaveAccessibleDescription(dict.validation.orgNumber));
        expect(screen.getByLabelText(new RegExp(`^${dict.admin.companyName}`))).toHaveAccessibleDescription(limitText);
    });
});
