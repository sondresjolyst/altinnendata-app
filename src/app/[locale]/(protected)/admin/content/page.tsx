"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ContentService from '@/services/contentService';
import SectionsEditor from '@/components/SectionsEditor';
import LocaleTabs from '@/components/LocaleTabs';
import { Section } from '@/types/content';
import { defaultSections } from '@/lib/defaultSections';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';

type SectionsByLocale = Record<Locale, Section[]>;

export default function AdminContentPage() {
    const { dict } = useDictionary();
    const [byLocale, setByLocale] = useState<SectionsByLocale | null>(null);
    const [active, setActive] = useState<Locale>(DEFAULT_LOCALE);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all(LOCALES.map(locale => ContentService.getHome(locale)))
            .then(results => {
                const loaded = Object.fromEntries(
                    LOCALES.map((locale, i) => [locale, results[i].length > 0 ? results[i] : defaultSections(locale)]),
                ) as SectionsByLocale;
                setByLocale(loaded);
            })
            .catch(() => {
                setByLocale(Object.fromEntries(LOCALES.map(l => [l, defaultSections(l)])) as SectionsByLocale);
            });
    }, []);

    const save = async () => {
        if (!byLocale) return;
        setSaving(true);
        try {
            await ContentService.updateHome(active, byLocale[active]);
            toast.success(dict.admin.frontPageSaved);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : dict.admin.frontPageSaveFailed);
        } finally {
            setSaving(false);
        }
    };

    if (!byLocale) return <p className="text-gray-500">{dict.common.loading}</p>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">{dict.admin.content}</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setByLocale({ ...byLocale, [active]: defaultSections(active) })}
                        className="text-sm text-gray-500 hover:text-gray-900"
                    >
                        {dict.admin.reset}
                    </button>
                    <button
                        onClick={save}
                        disabled={saving}
                        className="rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2 text-sm hover:brightness-95 disabled:opacity-60 transition"
                    >
                        {saving ? dict.common.saving : dict.common.save}
                    </button>
                </div>
            </div>

            <LocaleTabs active={active} onChange={setActive} />

            <p className="text-xs text-gray-500">{dict.admin.perLanguageHint}</p>

            <SectionsEditor
                sections={byLocale[active]}
                onChange={sections => setByLocale({ ...byLocale, [active]: sections })}
            />

            <div className="flex justify-end border-t border-gray-200 pt-4">
                <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2 text-sm hover:brightness-95 disabled:opacity-60 transition"
                >
                    {saving ? dict.common.saving : dict.common.save}
                </button>
            </div>
        </div>
    );
}
