'use client';

import { createContext, useContext } from 'react';
import type { Locale } from './config';
import { DEFAULT_LOCALE } from './config';
import type { Dictionary } from './dictionaries';
import { getDictionary } from './dictionaries';

interface DictionaryContextValue {
    locale: Locale;
    dict: Dictionary;
}

const DictionaryContext = createContext<DictionaryContextValue>({
    locale: DEFAULT_LOCALE,
    dict: getDictionary(DEFAULT_LOCALE),
});

export function DictionaryProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
    return (
        <DictionaryContext.Provider value={{ locale, dict: getDictionary(locale) }}>
            {children}
        </DictionaryContext.Provider>
    );
}

export function useDictionary() {
    return useContext(DictionaryContext);
}
