'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOCALES, LOCALE_LABELS, switchLocalePath } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function LocaleSwitcher() {
    const pathname = usePathname();
    const { locale, dict } = useDictionary();

    return (
        <div className="flex items-center gap-1" aria-label={dict.nav.language}>
            {LOCALES.map(target => (
                <Link
                    key={target}
                    href={switchLocalePath(pathname, target)}
                    hrefLang={target}
                    aria-current={target === locale ? 'true' : undefined}
                    title={LOCALE_LABELS[target]}
                    className={`px-2 py-1 rounded-md text-xs font-semibold uppercase transition-colors ${
                        target === locale ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    {target}
                </Link>
            ))}
        </div>
    );
}
