"use client";

import { LegalPagesEditor } from '@sjolystinnovation/app-kit/admin';
import { nbLegalPageKeyLabels, nbLegalPagesEditorStrings } from '@sjolystinnovation/app-kit/locales/nb';
import LegalService from '@/services/legalService';
import { LOCALES, LOCALE_LABELS } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function AdminLegalPage() {
    const { locale } = useDictionary();

    return (
        <LegalPagesEditor
            service={LegalService}
            keyLabels={locale === 'no' ? nbLegalPageKeyLabels : undefined}
            locales={LOCALES}
            localeLabels={LOCALE_LABELS}
            strings={locale === 'no' ? nbLegalPagesEditorStrings : undefined}
        />
    );
}
