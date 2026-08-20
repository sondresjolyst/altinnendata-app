"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function ProtectedGate({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const router = useRouter();
    const { locale, dict } = useDictionary();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push(localeHref(locale, '/login'));
        }
    }, [status, router, locale]);

    if (status === 'loading' || status === 'unauthenticated') {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">{dict.common.loading}</div>
        );
    }

    return <>{children}</>;
}
