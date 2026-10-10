'use client';

import { ErrorState } from '@sjolystinnovation/app-kit/ui';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

/** Shown when a page cannot be rendered. The response is still a 500. */
export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const { locale, dict } = useDictionary();

    return (
        <ErrorState
            reset={reset}
            homeHref={localeHref(locale, '/')}
            strings={{
                title: dict.common.unavailable,
                body: dict.common.unavailableBody,
                tryAgain: dict.common.tryAgain,
                home: dict.common.toFrontPage,
            }}
        />
    );
}
