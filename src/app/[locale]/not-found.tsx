'use client';

import { NotFoundState } from '@sjolystinnovation/app-kit/ui';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

/** Shown for a missing build and for any unknown path under a locale, in that locale's language. */
export default function NotFound() {
    const { locale, dict } = useDictionary();

    return (
        <NotFoundState
            homeHref={localeHref(locale, '/')}
            strings={{ body: dict.common.notFoundBody, home: dict.common.toFrontPage }}
        />
    );
}
