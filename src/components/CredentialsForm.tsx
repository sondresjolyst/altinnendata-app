"use client";

import type { CredentialsFormStrings } from '@sjolystinnovation/app-kit/ui';
import { useDictionary } from '@/i18n/DictionaryProvider';

/** The sign-in form's text from the app's dictionary. */
export function useCredentialsFormStrings(): Partial<CredentialsFormStrings> {
    const { dict } = useDictionary();
    return {
        email: dict.auth.email,
        password: dict.auth.password,
        signIn: dict.auth.signIn,
        signingIn: dict.auth.signingIn,
        invalidCredentials: dict.auth.invalidCredentials,
        signInUnavailable: dict.auth.signInUnavailable,
        somethingWentWrong: dict.common.somethingWentWrong,
    };
}
