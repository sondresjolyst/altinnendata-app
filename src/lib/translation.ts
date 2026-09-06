import type { Locale } from '@/i18n/config';

export interface TranslatableFields {
    title: string | null;
    summary: string | null;
    description: string | null;
}

const FIELDS = ['title', 'summary', 'description'] as const;

// LibreTranslate carries no generic `no` model — Bokmål has its own code.
const TRANSLATE_CODES: Record<Locale, string> = { no: 'nb', en: 'en' };

const TIMEOUT_MS = 60_000;

// LibreTranslate drops whatever sits outside the words of a line and answers a line without words
// with an empty string, so markers and symbols are held back and wordless lines never sent.
const MARKER = /^\s*(?:[-*+]|\d+[.)]|#{1,6}|>)\s+/;
const LEADING_SYMBOLS = /^[^\p{L}\p{N}]+/u;
const TRAILING_SYMBOLS = /[^\p{L}\p{N}]+$/u;
const HAS_WORDS = /[\p{L}\p{N}]/u;

export class TranslationUnavailableError extends Error {}

async function translate(lines: string[], from: Locale, to: Locale): Promise<string[]> {
    const base = process.env.LIBRETRANSLATE_URL;
    if (!base) throw new TranslationUnavailableError('LIBRETRANSLATE_URL is not set');

    const apiKey = process.env.LIBRETRANSLATE_API_KEY;
    const response = await fetch(`${base.replace(/\/+$/, '')}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
            q: lines,
            source: TRANSLATE_CODES[from],
            target: TRANSLATE_CODES[to],
            format: 'text',
            ...(apiKey ? { api_key: apiKey } : {}),
        }),
    });

    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `LibreTranslate answered ${response.status}`);
    }

    const { translatedText } = (await response.json()) as { translatedText: string | string[] };
    const translated = Array.isArray(translatedText) ? translatedText : [translatedText];
    if (translated.length !== lines.length) {
        throw new Error('LibreTranslate returned a different number of lines than it was given');
    }
    return translated;
}

/**
 * Translates a line at a time: fed a whole markdown body, LibreTranslate reflows it as prose
 * and the list items and paragraph breaks are gone. Blank lines are left as they are, and all
 * the lines of all the fields go in one request.
 */
export async function translateFields(
    fields: TranslatableFields,
    from: Locale,
    to: Locale,
): Promise<TranslatableFields> {
    const split = FIELDS.map(field => (fields[field] ?? '').split('\n'));

    const filled: Array<{ field: number; index: number; prefix: string; text: string; suffix: string }> = [];
    split.forEach((lines, field) =>
        lines.forEach((line, index) => {
            if (!HAS_WORDS.test(line)) return;
            const marker = line.match(MARKER)?.[0] ?? '';
            const rest = line.slice(marker.length);
            const prefix = rest.match(LEADING_SYMBOLS)?.[0] ?? '';
            const suffix = rest.match(TRAILING_SYMBOLS)?.[0] ?? '';
            filled.push({
                field,
                index,
                prefix: marker + prefix,
                text: rest.slice(prefix.length, rest.length - suffix.length),
                suffix,
            });
        }),
    );

    if (filled.length > 0) {
        const translated = await translate(filled.map(line => line.text), from, to);
        filled.forEach(({ field, index, prefix, suffix }, n) => {
            split[field][index] = prefix + translated[n] + suffix;
        });
    }

    return {
        title: fields.title == null ? null : split[0].join('\n'),
        summary: fields.summary == null ? null : split[1].join('\n'),
        description: fields.description == null ? null : split[2].join('\n'),
    };
}
