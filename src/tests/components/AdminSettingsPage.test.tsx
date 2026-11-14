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
const marketing = vi.hoisted(() => ({ getSettings: vi.fn(), updateSettings: vi.fn() }));
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
vi.mock('@/services/marketingService', () => ({ default: marketing }));
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
        marketing.getSettings.mockReset().mockResolvedValue({ metaPixelId: null, tikTokPixelId: null });
        marketing.updateSettings.mockReset();
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

// The Error that the marketing service throws when the API refuses an ID.
const refusedPixelId = (errors: Record<string, string[]> = { metaPixelId: ['The Meta Pixel ID must be 5 to 20 digits.'] }) =>
    request(
        () =>
            Promise.reject(
                Object.assign(new Error('Request failed with status code 400'), {
                    isAxiosError: true,
                    response: { status: 400, data: { errors } },
                }),
            ),
        'Failed',
    ).catch((e: unknown) => e);

describe('the marketing section', () => {
    beforeEach(() => {
        marketing.getSettings.mockReset().mockResolvedValue({ metaPixelId: '123456789012345', tikTokPixelId: 'C4A1B2C3D4E5F6G7H8I9' });
        marketing.updateSettings.mockReset();
    });

    it.each([
        ['no', 'Markedsføring', 'Meta Pixel-ID', /Meta Events Manager under Datasett/, 'TikTok Pixel-ID', /TikTok Events Manager under Data Sources\. Den består av store bokstaver og tall\./, 'Meta Pixel og TikTok Pixel lastes bare etter at den besøkende har godtatt markedsføring i samtykkebanneret.'],
        ['en', 'Marketing', 'Meta Pixel ID', /Meta Events Manager under Datasets/, 'TikTok Pixel ID', /TikTok Events Manager under Data Sources\. It has capital letters and digits\./, 'The Meta Pixel and the TikTok Pixel load only after the visitor has accepted marketing in the consent banner.'],
    ] as const)('shows the saved IDs with where to find them and that the pixels wait for consent (%s)', async (locale, title, label, hint, tikTokLabel, tikTokHint, note) => {
        renderPage(locale);

        expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
        const field = screen.getByLabelText(label);
        await waitFor(() => expect(field).toHaveValue('123456789012345'));
        expect(field).toHaveAccessibleDescription(expect.stringMatching(hint));
        expect(field).toHaveAccessibleDescription(expect.stringContaining(note));
        const tikTok = screen.getByLabelText(tikTokLabel);
        expect(tikTok).toHaveValue('C4A1B2C3D4E5F6G7H8I9');
        expect(tikTok).toHaveAccessibleDescription(expect.stringMatching(tikTokHint));
        expect(tikTok).toHaveAccessibleDescription(expect.stringContaining(note));
        // A plain info line, not a warning box.
        expect(screen.getByText(note)).toHaveClass('text-xs', 'text-gray-500');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('keeps the field and the button in place but disabled until the ID has loaded', async () => {
        marketing.getSettings.mockReset().mockReturnValue(new Promise(() => undefined));
        renderPage('no');

        expect(await screen.findByLabelText('Meta Pixel-ID')).toBeDisabled();
        expect(screen.getByLabelText('TikTok Pixel-ID')).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Lagre markedsføring' })).toBeDisabled();
    });

    it('says so when the ID cannot be loaded', async () => {
        marketing.getSettings.mockReset().mockRejectedValue(new Error('down'));
        renderPage('no');

        expect(await screen.findByText('Kunne ikke laste innstillingene for markedsføring')).toBeInTheDocument();
        expect(screen.getByLabelText('Meta Pixel-ID')).toBeDisabled();
    });

    it('saves the trimmed ID', async () => {
        marketing.updateSettings.mockResolvedValue({ metaPixelId: '987654321', tikTokPixelId: 'C4A1B2C3D4E5F6G7H8I9' });
        renderPage('no');
        const field = await screen.findByLabelText('Meta Pixel-ID');
        await waitFor(() => expect(field).toBeEnabled());

        await userEvent.clear(field);
        await userEvent.type(field, ' 987654321 ');
        await userEvent.click(screen.getByRole('button', { name: 'Lagre markedsføring' }));

        await waitFor(() => expect(marketing.updateSettings).toHaveBeenCalledWith({ metaPixelId: '987654321', tikTokPixelId: 'C4A1B2C3D4E5F6G7H8I9' }));
        expect(field).toHaveValue('987654321');
        expect(field).not.toHaveAttribute('aria-invalid');
    });

    it('clears the ID with an empty field', async () => {
        marketing.updateSettings.mockResolvedValue({ metaPixelId: null, tikTokPixelId: 'C4A1B2C3D4E5F6G7H8I9' });
        renderPage('no');
        const field = await screen.findByLabelText('Meta Pixel-ID');
        await waitFor(() => expect(field).toBeEnabled());

        await userEvent.clear(field);
        await userEvent.click(screen.getByRole('button', { name: 'Lagre markedsføring' }));

        await waitFor(() => expect(marketing.updateSettings).toHaveBeenCalledWith({ metaPixelId: '', tikTokPixelId: 'C4A1B2C3D4E5F6G7H8I9' }));
        expect(field).toHaveValue('');
    });

    it.each(['12ab5', '1234', '123456789012345678901', '１２３４５'])('refuses %s before sending it', async value => {
        renderPage('no');
        const field = await screen.findByLabelText('Meta Pixel-ID');
        await waitFor(() => expect(field).toBeEnabled());

        await userEvent.clear(field);
        await userEvent.type(field, value);
        await userEvent.click(screen.getByRole('button', { name: 'Lagre markedsføring' }));

        expect(field).toHaveAccessibleDescription(expect.stringMatching(/Meta Pixel-ID-en må bestå av 5 til 20 siffer\.$/));
        expect(field).toHaveAttribute('aria-invalid', 'true');
        expect(marketing.updateSettings).not.toHaveBeenCalled();
    });

    it.each([
        ['no', 'Meta Pixel-ID', 'Lagre markedsføring', /Meta Pixel-ID-en må bestå av 5 til 20 siffer\.$/],
        ['en', 'Meta Pixel ID', 'Save marketing', /The Meta Pixel ID must be 5 to 20 digits\.$/],
    ] as const)('shows the API field error on the field in the page language (%s)', async (locale, label, save, message) => {
        marketing.updateSettings.mockRejectedValueOnce(await refusedPixelId());
        renderPage(locale);
        const field = await screen.findByLabelText(label);
        await waitFor(() => expect(field).toBeEnabled());

        await userEvent.click(screen.getByRole('button', { name: save }));

        await waitFor(() => expect(field).toHaveAccessibleDescription(expect.stringMatching(message)));
        expect(field).toHaveAttribute('aria-invalid', 'true');
    });

    it('saves the trimmed TikTok ID with the Meta ID, since the API replaces the whole setting', async () => {
        marketing.updateSettings.mockResolvedValue({ metaPixelId: '123456789012345', tikTokPixelId: 'D1E2F3G4H5I6J7K8L9M0' });
        renderPage('no');
        const field = await screen.findByLabelText('TikTok Pixel-ID');
        await waitFor(() => expect(field).toBeEnabled());

        await userEvent.clear(field);
        await userEvent.type(field, ' D1E2F3G4H5I6J7K8L9M0 ');
        await userEvent.click(screen.getByRole('button', { name: 'Lagre markedsføring' }));

        await waitFor(() => expect(marketing.updateSettings).toHaveBeenCalledWith({ metaPixelId: '123456789012345', tikTokPixelId: 'D1E2F3G4H5I6J7K8L9M0' }));
        expect(field).toHaveValue('D1E2F3G4H5I6J7K8L9M0');
        expect(field).not.toHaveAttribute('aria-invalid');
    });

    it('turns the TikTok Pixel off with an empty field', async () => {
        marketing.updateSettings.mockResolvedValue({ metaPixelId: '123456789012345', tikTokPixelId: null });
        renderPage('no');
        const field = await screen.findByLabelText('TikTok Pixel-ID');
        await waitFor(() => expect(field).toBeEnabled());

        await userEvent.clear(field);
        await userEvent.click(screen.getByRole('button', { name: 'Lagre markedsføring' }));

        await waitFor(() => expect(marketing.updateSettings).toHaveBeenCalledWith({ metaPixelId: '123456789012345', tikTokPixelId: '' }));
        expect(field).toHaveValue('');
    });

    it('shows an empty TikTok field when the API has no TikTok ID', async () => {
        marketing.getSettings.mockReset().mockResolvedValue({ metaPixelId: '123456789012345' });
        renderPage('no');
        const field = await screen.findByLabelText('TikTok Pixel-ID');
        await waitFor(() => expect(field).toBeEnabled());

        expect(field).toHaveValue('');
    });

    it.each(['c4a1b2c3d4e5f6g7h8i9', 'ABC123456', 'A'.repeat(33), 'ABC-1234567', 'ＡＢＣ１２３４５６７'])('refuses the TikTok ID %s before sending it, without changing it', async value => {
        renderPage('no');
        const field = await screen.findByLabelText('TikTok Pixel-ID');
        await waitFor(() => expect(field).toBeEnabled());

        await userEvent.clear(field);
        await userEvent.type(field, value);
        await userEvent.click(screen.getByRole('button', { name: 'Lagre markedsføring' }));

        expect(field).toHaveAccessibleDescription(expect.stringMatching(/TikTok Pixel-ID-en må bestå av 10 til 32 store bokstaver og tall\.$/));
        expect(field).toHaveAttribute('aria-invalid', 'true');
        expect(field).toHaveValue(value);
        expect(screen.getByLabelText('Meta Pixel-ID')).not.toHaveAttribute('aria-invalid');
        expect(marketing.updateSettings).not.toHaveBeenCalled();
    });

    it('marks both fields when both IDs are wrong', async () => {
        renderPage('no');
        const meta = await screen.findByLabelText('Meta Pixel-ID');
        const tikTok = screen.getByLabelText('TikTok Pixel-ID');
        await waitFor(() => expect(meta).toBeEnabled());

        await userEvent.clear(meta);
        await userEvent.type(meta, '12ab5');
        await userEvent.clear(tikTok);
        await userEvent.type(tikTok, 'abc');
        await userEvent.click(screen.getByRole('button', { name: 'Lagre markedsføring' }));

        expect(meta).toHaveAttribute('aria-invalid', 'true');
        expect(tikTok).toHaveAttribute('aria-invalid', 'true');
        expect(marketing.updateSettings).not.toHaveBeenCalled();
    });

    it.each([
        ['no', 'TikTok Pixel-ID', 'Meta Pixel-ID', 'Lagre markedsføring', /TikTok Pixel-ID-en må bestå av 10 til 32 store bokstaver og tall\.$/],
        ['en', 'TikTok Pixel ID', 'Meta Pixel ID', 'Save marketing', /The TikTok Pixel ID must be 10 to 32 capital letters and digits\.$/],
    ] as const)('shows the API error for the TikTok ID on its field in the page language (%s)', async (locale, label, metaLabel, save, message) => {
        marketing.updateSettings.mockRejectedValueOnce(await refusedPixelId({ tikTokPixelId: ['The TikTok Pixel ID must be 10 to 32 capital letters and digits.'] }));
        renderPage(locale);
        const field = await screen.findByLabelText(label);
        await waitFor(() => expect(field).toBeEnabled());

        await userEvent.click(screen.getByRole('button', { name: save }));

        await waitFor(() => expect(field).toHaveAccessibleDescription(expect.stringMatching(message)));
        expect(field).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText(metaLabel)).not.toHaveAttribute('aria-invalid');
    });

    it('marks no field when the save fails for another reason', async () => {
        marketing.updateSettings.mockRejectedValueOnce(new Error('Network Error'));
        renderPage('no');
        const field = await screen.findByLabelText('Meta Pixel-ID');
        await waitFor(() => expect(field).toBeEnabled());

        await userEvent.click(screen.getByRole('button', { name: 'Lagre markedsføring' }));

        await waitFor(() => expect(screen.getByRole('button', { name: 'Lagre markedsføring' })).toBeEnabled());
        expect(marketing.updateSettings).toHaveBeenCalledTimes(1);
        expect(field).not.toHaveAttribute('aria-invalid');
    });
});
