"use client";

import { toast } from 'sonner';
import { SessionExpiryGuard as Guard } from '@sjolystinnovation/app-kit/session/react';
import { useCredentialsFormStrings } from './CredentialsForm';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function SessionExpiryGuard() {
    const { locale, dict } = useDictionary();
    return (
        <Guard
            loginHref={localeHref(locale, '/login')}
            onRestored={() => toast.success(dict.auth.sessionRestored)}
            strings={{
                expiredTitle: dict.auth.sessionExpiredTitle,
                expiredBody: dict.auth.sessionExpiredBody,
                expiringSoon: dict.auth.sessionExpiringSoon,
                reSignIn: dict.auth.reSignIn,
                notRestored: dict.auth.sessionNotRestored,
                wrongUser: dict.auth.sessionWrongUser,
                close: dict.common.close,
            }}
            formStrings={useCredentialsFormStrings()}
        />
    );
}
