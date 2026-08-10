"use client";

import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/config';

export default function LocaleTabs({
    active,
    onChange,
    filled,
}: {
    active: Locale;
    onChange: (locale: Locale) => void;
    filled?: Partial<Record<Locale, boolean>>;
}) {
    return (
        <div className="flex items-center gap-1 border-b border-gray-200">
            {LOCALES.map(locale => (
                <button
                    key={locale}
                    type="button"
                    onClick={() => onChange(locale)}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                        locale === active
                            ? 'border-gray-900 text-gray-900'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    {LOCALE_LABELS[locale]}
                    {filled && filled[locale] === false && (
                        <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" title="Ikke fylt ut" />
                    )}
                </button>
            ))}
        </div>
    );
}
