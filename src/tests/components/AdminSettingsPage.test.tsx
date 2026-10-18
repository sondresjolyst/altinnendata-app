import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import AdminSettingsPage from '@/app/[locale]/(protected)/admin/settings/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { nbCompanySettingsFormStrings as nb } from '@sjolystinnovation/app-kit/locales/nb';
import { defaultCompanySettingsFormStrings } from '@sjolystinnovation/app-kit/admin';
import type { Locale } from '@/i18n/config';

const updateBranding = vi.fn();
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
    default: { update: (...args: unknown[]) => updateBranding(...args) },
}));

// The Error that the branding service throws when the API refuses a file.
const refusedLogo = (code: string) =>
    request(
        () =>
            Promise.reject(
                Object.assign(new Error('Request failed with status code 400'), {
                    isAxiosError: true,
                    response: {
                        status: 400,
                        data: {
                            errors: { Logo: ['The image must be a PNG, JPEG, WebP, GIF or ICO file of at most 2 MB.'] },
                            codes: { Logo: [code] },
                            limits: {},
                        },
                    },
                }),
            ),
        'Failed',
    ).catch((e: unknown) => e);

const renderPage = (locale: Locale) =>
    render(
        <DictionaryProvider locale={locale}>
            <AdminSettingsPage />
        </DictionaryProvider>,
    );

// The Error that the settings service throws for the API's validation problem.
const refusedSettings = () =>
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
    beforeEach(() => {
        update.mockReset();
        updateBranding.mockReset();
    });

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
        ['no', nb, 'Bruk 100 eller færre tegn.'],
        ['en', defaultCompanySettingsFormStrings, 'At most 100 characters.'],
    ] as const)('shows the API field errors in the page language (%s)', async (locale, text, limitText) => {
        update.mockRejectedValueOnce(await refusedSettings());
        renderPage(locale);
        const org = await screen.findByLabelText(new RegExp(`^${text.orgNumber}`));

        await userEvent.click(screen.getByRole('button', { name: text.save }));

        await waitFor(() => expect(org).toHaveAccessibleDescription(text.validation.invalidOrgNumber));
        expect(screen.getByLabelText(new RegExp(`^${text.companyName}`))).toHaveAccessibleDescription(limitText);
    });

    it.each([
        ['no', nb.addressHint],
        ['en', 'The postal code and place name are kept apart so search engines can read the address. County is optional.'],
    ] as const)('shows the long address hint (%s)', async (locale, hint) => {
        renderPage(locale);

        expect(await screen.findByText(hint)).toBeInTheDocument();
        expect(screen.queryByText(defaultCompanySettingsFormStrings.addressHint)).not.toBeInTheDocument();
    });

    it.each([
        ['no', 'Lagre logo og ikon', 'Ugyldig filformat. Last opp en bildefil.', 'Filen er for stor. Last opp en fil på 2 MB eller mindre.'],
        ['en', 'Save logo and icon', 'Invalid file format. Upload a PNG, JPEG, WebP, GIF or ICO image.', 'The file is too large. Upload a file of 2 MB or less.'],
    ] as const)('shows a refused logo in the page language (%s)', async (locale, saveLabel, invalid, tooLarge) => {
        updateBranding.mockRejectedValueOnce(await refusedLogo('invalidImage')).mockRejectedValueOnce(await refusedLogo('imageTooLarge'));
        renderPage(locale);
        const logo = await screen.findByLabelText('Logo');
        await userEvent.upload(logo, new File(['x'], 'logo.png', { type: 'image/png' }));

        await userEvent.click(screen.getByRole('button', { name: saveLabel }));
        await waitFor(() => expect(logo).toHaveAccessibleDescription(invalid));

        await userEvent.click(screen.getByRole('button', { name: saveLabel }));
        await waitFor(() => expect(logo).toHaveAccessibleDescription(tooLarge));
    });
});
