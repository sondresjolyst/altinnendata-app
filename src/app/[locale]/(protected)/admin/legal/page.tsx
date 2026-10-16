"use client";

import { LegalPagesEditor } from '@sjolystinnovation/app-kit/admin';
import LegalService, { LEGAL_KEYS } from '@/services/legalService';
import { LOCALES, LOCALE_LABELS } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function AdminLegalPage() {
    const { dict } = useDictionary();

    return (
        <LegalPagesEditor
            service={LegalService}
            keys={LEGAL_KEYS}
            keyLabels={dict.footer}
            locales={LOCALES}
            localeLabels={LOCALE_LABELS}
            strings={{
                heading: dict.admin.legal,
                title: dict.admin.buildTitle,
                bodyMarkdown: dict.admin.bodyMarkdown,
                notFilled: dict.admin.notFilled,
                loading: dict.common.loading,
                save: dict.common.save,
                saving: dict.common.saving,
                loadFailed: dict.admin.legalLoadFailed,
                required: dict.admin.legalRequired,
                saved: dict.admin.legalSaved,
                saveFailed: dict.admin.legalSaveFailed,
            }}
        />
    );
}
