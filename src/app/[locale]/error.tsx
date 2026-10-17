'use client';

import { ErrorState } from '@sjolystinnovation/app-kit/ui';
import { nbErrorStateStrings } from '@sjolystinnovation/app-kit/locales/nb';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

/** Shown when a page cannot be rendered. The response is still a 500. */
export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const { locale } = useDictionary();

    return (
        <ErrorState
            reset={reset}
            homeHref={localeHref(locale, '/')}
            strings={locale === 'no' ? nbErrorStateStrings : undefined}
        />
    );
}
