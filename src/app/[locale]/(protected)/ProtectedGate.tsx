"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';
import { useSessionGate } from '@sjolystinnovation/app-kit/session/react';

export default function ProtectedGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { locale, dict } = useDictionary();
    const { status, promptOpen, usable, wasUsable, mayRender } = useSessionGate();

    useEffect(() => {
        // A session that is already dead when the page opens must not render the protected UI:
        // the user would start work they cannot save. One that dies later keeps the page, and
        // SessionExpiryGuard offers a sign-in that leaves the form and its draft intact, so
        // never redirect out from under that prompt.
        if (promptOpen) return;
        if (status === 'unauthenticated' || (status === 'authenticated' && !usable && !wasUsable)) {
            router.push(localeHref(locale, '/login'));
        }
    }, [status, usable, wasUsable, promptOpen, router, locale]);

    if (!mayRender) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">{dict.common.loading}</div>
        );
    }

    return <>{children}</>;
}
