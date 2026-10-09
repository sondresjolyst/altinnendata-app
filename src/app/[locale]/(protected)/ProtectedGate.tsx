"use client";

import { ProtectedGate as Gate } from '@sjolystinnovation/app-kit/session/react';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function ProtectedGate({ children }: { children: React.ReactNode }) {
    const { locale, dict } = useDictionary();
    return (
        <Gate
            loginHref={localeHref(locale, '/login')}
            fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">{dict.common.loading}</div>}
        >
            {children}
        </Gate>
    );
}
