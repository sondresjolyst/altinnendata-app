'use client';

import Link from 'next/link';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

/** Shown when a page cannot be rendered. The response is still a 500. */
export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const { locale, dict } = useDictionary();

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
            <h1 className="text-3xl font-black text-gray-900">{dict.common.unavailable}</h1>
            <p className="text-lg text-gray-600 max-w-md">{dict.common.unavailableBody}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
                <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-3 hover:brightness-95 transition"
                >
                    {dict.common.tryAgain}
                </button>
                <Link href={localeHref(locale, '/')} className="font-semibold text-gray-900 underline">
                    {dict.common.toFrontPage}
                </Link>
            </div>
        </div>
    );
}
