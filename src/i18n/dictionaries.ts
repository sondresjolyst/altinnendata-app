import type { Locale } from './config';
import no from './locales/no.json';
import en from './locales/en.json';

export type Dictionary = typeof no;

const DICTIONARIES: Record<Locale, Dictionary> = { no, en };

export function getDictionary(locale: Locale): Dictionary {
    return DICTIONARIES[locale];
}
