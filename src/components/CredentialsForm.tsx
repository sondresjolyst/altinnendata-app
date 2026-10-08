"use client";

import { CredentialsForm as Form, type CredentialsFormProps, type CredentialsFormStrings } from '@sjolystinnovation/app-kit/ui';
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

export default function CredentialsForm(props: Omit<CredentialsFormProps, 'strings'>) {
    return <Form {...props} strings={useCredentialsFormStrings()} />;
}
