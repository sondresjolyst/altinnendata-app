"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ContentService from '@/services/contentService';
import SectionsEditor from '@/components/SectionsEditor';
import LocaleTabs from '@/components/LocaleTabs';
import { Section } from '@/types/content';
import { defaultSections } from '@/lib/defaultSections';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';

type SectionsByLocale = Record<Locale, Section[]>;

export default function AdminContentPage() {
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
            toast.success('Forsiden er lagret');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Kunne ikke lagre');
        } finally {
            setSaving(false);
        }
    };

    if (!byLocale) return <p className="text-gray-500">Laster…</p>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Forside</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setByLocale({ ...byLocale, [active]: defaultSections(active) })}
                        className="text-sm text-gray-500 hover:text-gray-900"
                    >
                        Tilbakestill
                    </button>
                    <button
                        onClick={save}
                        disabled={saving}
                        className="rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2 text-sm hover:brightness-95 disabled:opacity-60 transition"
                    >
                        {saving ? 'Lagrer…' : 'Lagre'}
                    </button>
                </div>
            </div>

            <LocaleTabs active={active} onChange={setActive} />

            <p className="text-xs text-gray-500">Hvert språk lagres for seg. Lagre etter at du har endret en fane.</p>

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
                    {saving ? 'Lagrer…' : 'Lagre'}
                </button>
            </div>
        </div>
    );
}
