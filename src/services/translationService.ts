import type { Locale } from '@/i18n/config';
import type { TranslatableFields } from '@/lib/translation';

export type { TranslatableFields };

const TranslationService = {
    translate: async (fields: TranslatableFields, from: Locale, to: Locale): Promise<TranslatableFields> => {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields, from, to }),
        });

        if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { message?: string } | null;
            throw new Error(body?.message ?? `Translation failed (${response.status})`);
        }

        return response.json();
    },
};

export default TranslationService;
