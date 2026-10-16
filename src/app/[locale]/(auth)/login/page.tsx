"use client";

import { LoginPage } from '@sjolystinnovation/app-kit/ui';
import { useCredentialsFormStrings } from '@/components/CredentialsForm';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function Login() {
    const { locale, dict } = useDictionary();

    return (
        <LoginPage
            redirectTo={localeHref(locale, '/admin')}
            resetHref={localeHref(locale, '/reset-password')}
            strings={{ title: dict.auth.signInTitle, forgotPassword: dict.auth.forgotPassword }}
            formStrings={useCredentialsFormStrings()}
        />
    );
}
