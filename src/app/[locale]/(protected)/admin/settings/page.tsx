"use client";

import { CompanySettingsForm } from '@sjolystinnovation/app-kit/admin';
import SettingsService from '@/services/settingsService';
import { BrandingManager } from '@sjolystinnovation/app-kit/branding';
import BrandingService from '@/services/brandingService';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function AdminSettingsPage() {
    const { dict } = useDictionary();

    return (
        <CompanySettingsForm
            service={SettingsService}
            strings={{
                contactRecipient: dict.admin.contactRecipient,
                contactRecipientHint: dict.admin.contactRecipientHint,
                companyName: dict.admin.companyName,
                legalName: dict.admin.legalName,
                legalNameHint: dict.admin.legalNameHint,
                orgNumber: dict.admin.orgNumber,
                vatRegistered: dict.admin.vatRegistered,
                vatHint: dict.admin.vatHint,
                streetAddress: dict.admin.streetAddress,
                postalCode: dict.admin.postalCode,
                addressLocality: dict.admin.addressLocality,
                addressRegion: dict.admin.addressRegion,
                addressHint: dict.admin.addressHint,
                publicEmail: dict.admin.publicEmail,
                publicPhone: dict.admin.publicPhone,
                loading: dict.common.loading,
                save: dict.common.save,
                saving: dict.common.saving,
                loadFailed: dict.admin.settingsLoadFailed,
                saved: dict.admin.settingsSaved,
                saveFailed: dict.admin.settingsSaveFailed,
                validation: {
                    required: dict.validation.required,
                    tooLong: dict.validation.maxLength,
                    invalidEmail: dict.validation.email,
                    orgNumberRequiredForVat: dict.validation.orgNumberRequiredForVat,
                    invalidOrgNumber: dict.validation.orgNumber,
                    invalidPostalCode: dict.validation.postalCode,
                    placeRequired: dict.validation.placeRequired,
                },
            }}
        >
            <BrandingManager
                save={BrandingService.update}
                strings={{
                    title: dict.admin.brandingTitle,
                    logo: dict.admin.brandingLogo,
                    logoHint: dict.admin.brandingLogoHint,
                    icon: dict.admin.brandingIcon,
                    iconHint: dict.admin.brandingIconHint,
                    none: dict.admin.brandingNone,
                    choose: dict.admin.brandingChoose,
                    remove: dict.common.remove,
                    save: dict.admin.brandingSave,
                    saving: dict.common.saving,
                    saved: dict.admin.brandingSaved,
                    saveFailed: dict.admin.brandingSaveFailed,
                }}
            />
        </CompanySettingsForm>
    );
}
