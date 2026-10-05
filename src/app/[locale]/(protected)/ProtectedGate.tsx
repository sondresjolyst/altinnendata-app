"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';
import { useSessionGate } from '@/lib/useSessionGate';

export default function ProtectedGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { locale, dict } = useDictionary();
    const { status, promptOpen, usable, wasUsable, recovering } = useSessionGate();

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

    // Once the page has rendered, keep it mounted through a reload of the session, and through a
    // signed-out status while the prompt is recovering it in place. Blanking the page in either
    // case would throw away the form the user is filling in, which is the whole point of both.
    if (!recovering && ((status === 'loading' && !wasUsable) || status === 'unauthenticated' || (!usable && !wasUsable))) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">{dict.common.loading}</div>
        );
    }

    return <>{children}</>;
}
