"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CredentialsForm from '@/components/CredentialsForm';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function LoginPage() {
    const router = useRouter();
    const { locale, dict } = useDictionary();

    return (
        <div className="max-w-md mx-auto px-4 py-16">
            <h1 className="text-2xl font-black text-gray-900 mb-6">{dict.auth.signInTitle}</h1>
            <CredentialsForm
                onSignedIn={() => {
                    router.push(localeHref(locale, '/admin'));
                    router.refresh();
                }}
            />
            <p className="mt-6 text-sm text-gray-600">
                <Link href={localeHref(locale, '/reset-password')} className="font-semibold text-gray-900">
                    {dict.auth.forgotPassword}
                </Link>
            </p>
        </div>
    );
}
