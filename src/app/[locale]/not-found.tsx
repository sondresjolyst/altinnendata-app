import Link from 'next/link';
import { DEFAULT_LOCALE, localeHref } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

export default function NotFound() {
    // Not-found renders outside the locale params, so it uses the default language.
    const dict = getDictionary(DEFAULT_LOCALE);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
            <span className="text-6xl font-black text-gray-900">404</span>
            <p className="text-lg text-gray-600">{dict.common.notFoundBody}</p>
            <Link href={localeHref(DEFAULT_LOCALE, '/')} className="font-semibold text-gray-900 underline">
                {dict.common.toFrontPage}
            </Link>
        </div>
    );
}
