"use client";

import type { CredentialsFormStrings } from '@sjolystinnovation/app-kit/session/react';
import { nbCredentialsFormStrings } from '@sjolystinnovation/app-kit/locales/nb';
import { useDictionary } from '@/i18n/DictionaryProvider';

/** The sign-in form's text: app-kit's Norwegian set, or its English defaults. */
export function useCredentialsFormStrings(): CredentialsFormStrings | undefined {
    const { locale } = useDictionary();
    return locale === 'no' ? nbCredentialsFormStrings : undefined;
}
