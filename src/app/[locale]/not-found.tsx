'use client';

import Link from 'next/link';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

/** Shown for a missing build and for any unknown path under a locale, in that locale's language. */
export default function NotFound() {
    const { locale, dict } = useDictionary();

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
            <span className="text-6xl font-black text-gray-900">404</span>
            <h1 className="text-lg text-gray-600">{dict.common.notFoundBody}</h1>
            <Link href={localeHref(locale, '/')} className="font-semibold text-gray-900 underline">
                {dict.common.toFrontPage}
            </Link>
        </div>
    );
}
