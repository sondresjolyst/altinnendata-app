"use client";
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { ResetPasswordFlow } from '@sjolystinnovation/app-kit/ui';
import { nbResetPasswordFlowStrings } from '@sjolystinnovation/app-kit/locales/nb';
import UserService from '@/services/userService';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPassword />
        </Suspense>
    );
}

// The emailed link carries the email and code, so the flow opens on its last step.
function ResetPassword() {
    const params = useSearchParams();
    const { locale } = useDictionary();
    return (
        <ResetPasswordFlow
            requestReset={UserService.requestPasswordReset}
            reset={UserService.resetPassword}
            loginHref={localeHref(locale, '/login')}
            initialEmail={params.get('email') ?? ''}
            initialCode={params.get('code') ?? ''}
            strings={{
                ...(locale === 'no' ? nbResetPasswordFlowStrings : undefined),
                signInPrompt: null,
                codeSent: null,
            }}
        />
    );
}
