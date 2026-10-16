"use client";
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { ResetPasswordFlow } from '@sjolystinnovation/app-kit/ui';
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
    const { locale, dict } = useDictionary();
    return (
        <ResetPasswordFlow
            requestReset={UserService.requestPasswordReset}
            reset={UserService.resetPassword}
            loginHref={localeHref(locale, '/login')}
            initialEmail={params.get('email') ?? ''}
            initialCode={params.get('code') ?? ''}
            strings={{
                title: dict.auth.resetTitle,
                signInPrompt: null,
                signIn: dict.auth.signIn,
                backToSignIn: `${dict.auth.signIn} →`,
                intro: dict.auth.resetIntro,
                codeSent: null,
                email: dict.auth.email,
                code: dict.auth.resetCode,
                newPassword: dict.auth.newPassword,
                passwordHint: dict.validation.password,
                requestCode: dict.auth.requestCode,
                requestingCode: dict.common.saving,
                setPassword: dict.auth.setPassword,
                settingPassword: dict.common.saving,
                done: dict.auth.resetDone,
                passwordInvalid: dict.validation.password,
                somethingWentWrong: dict.common.somethingWentWrong,
            }}
        />
    );
}
