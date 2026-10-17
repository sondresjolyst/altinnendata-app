"use client";

import { CompanySettingsForm } from '@sjolystinnovation/app-kit/admin';
import { BrandingManager } from '@sjolystinnovation/app-kit/branding';
import { nbBrandingManagerStrings, nbCompanySettingsFormStrings } from '@sjolystinnovation/app-kit/locales/nb';
import SettingsService from '@/services/settingsService';
import BrandingService from '@/services/brandingService';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function AdminSettingsPage() {
    const { locale, dict } = useDictionary();

    return (
        <CompanySettingsForm
            service={SettingsService}
            strings={{
                ...(locale === 'no' ? nbCompanySettingsFormStrings : undefined),
                // app-kit's English hint only says the county is optional.
                addressHint: dict.admin.addressHint,
            }}
        >
            <BrandingManager
                save={BrandingService.update}
                strings={{
                    ...(locale === 'no' ? nbBrandingManagerStrings : undefined),
                    // app-kit's English set calls the section Branding and has one text for both refusals.
                    title: dict.admin.brandingTitle,
                    save: dict.admin.brandingSave,
                    saved: dict.admin.brandingSaved,
                    saveFailed: dict.admin.brandingSaveFailed,
                    validation: {
                        invalidImage: dict.admin.brandingInvalidImage,
                        imageTooLarge: dict.admin.brandingImageTooLarge,
                    },
                }}
            />
        </CompanySettingsForm>
    );
}
