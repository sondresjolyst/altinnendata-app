"use client";

import { CompanySettingsForm, type CompanySettingsFormStrings } from '@sjolystinnovation/app-kit/admin';
import { BrandingManager, type BrandingManagerStrings } from '@sjolystinnovation/app-kit/branding';
import { nbBrandingManagerStrings, nbCompanySettingsFormStrings } from '@sjolystinnovation/app-kit/locales/nb';
import SettingsService from '@/services/settingsService';
import BrandingService from '@/services/brandingService';
import MarketingSettingsForm from '@/components/MarketingSettingsForm';
import { useDictionary } from '@/i18n/DictionaryProvider';

// app-kit's English hint only says the county is optional.
const enCompanySettingsStrings: Partial<CompanySettingsFormStrings> = {
    addressHint: 'The postal code and place name are kept apart so search engines can read the address. County is optional.',
};

// app-kit's English set calls the section Branding.
const enBrandingStrings: Partial<BrandingManagerStrings> = {
    title: 'Logo and icon',
    save: 'Save logo and icon',
    saved: 'Logo and icon saved',
    saveFailed: 'Could not save the logo and icon',
};

export default function AdminSettingsPage() {
    const { locale } = useDictionary();
    const no = locale === 'no';

    return (
        <CompanySettingsForm service={SettingsService} strings={no ? nbCompanySettingsFormStrings : enCompanySettingsStrings}>
            <BrandingManager save={BrandingService.update} strings={no ? nbBrandingManagerStrings : enBrandingStrings} />
            <MarketingSettingsForm />
        </CompanySettingsForm>
    );
}
