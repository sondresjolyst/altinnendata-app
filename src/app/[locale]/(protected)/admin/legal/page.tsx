"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import LegalService, { LEGAL_KEYS, LegalKey, LegalPage } from '@/services/legalService';
import LocaleTabs from '@/components/LocaleTabs';
import TextInput from '@/components/TextInput';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';

const KEY_LABELS: Record<LegalKey, string> = {
    terms: 'Vilkår',
    privacy: 'Personvern',
    cookies: 'Informasjonskapsler',
};

type Draft = { title: string; bodyMarkdown: string };

const emptyDraft: Draft = { title: '', bodyMarkdown: '' };

export default function AdminLegalPage() {
    const { dict } = useDictionary();
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [activeKey, setActiveKey] = useState<LegalKey>('terms');
    const [activeLocale, setActiveLocale] = useState<Locale>(DEFAULT_LOCALE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        LegalService.listAll()
            .then((pages: LegalPage[]) => {
                setDrafts(Object.fromEntries(pages.map(p => [`${p.key}:${p.locale}`, { title: p.title, bodyMarkdown: p.bodyMarkdown }])));
            })
            .catch(err => toast.error(err instanceof Error ? err.message : dict.admin.legalLoadFailed))
            .finally(() => setLoading(false));
    }, []);

    const slot = `${activeKey}:${activeLocale}`;
    const draft = drafts[slot] ?? emptyDraft;

    const patch = (changes: Partial<Draft>) =>
        setDrafts(prev => ({ ...prev, [slot]: { ...(prev[slot] ?? emptyDraft), ...changes } }));

    const save = async () => {
        if (draft.title.trim() === '' || draft.bodyMarkdown.trim() === '') {
            toast.error(dict.admin.legalRequired);
            return;
        }
        setSaving(true);
        try {
            await LegalService.save(activeKey, activeLocale, draft.title.trim(), draft.bodyMarkdown);
            toast.success(dict.admin.legalSaved);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : dict.admin.legalSaveFailed);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="text-gray-500">{dict.common.loading}</p>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">{dict.admin.legal}</h2>
                <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2 text-sm hover:brightness-95 disabled:opacity-60 transition"
                >
                    {saving ? dict.common.saving : dict.common.save}
                </button>
            </div>

            <div className="flex gap-1">
                {LEGAL_KEYS.map(key => (
                    <button
                        key={key}
                        onClick={() => setActiveKey(key)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            key === activeKey ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {dict.footer[key]}
                    </button>
                ))}
            </div>

            <LocaleTabs
                active={activeLocale}
                onChange={setActiveLocale}
                filled={Object.fromEntries(LOCALES.map(l => [l, (drafts[`${activeKey}:${l}`]?.bodyMarkdown ?? '') !== ''])) as Record<Locale, boolean>}
            />

            <TextInput label={dict.admin.buildTitle} value={draft.title} onChange={e => patch({ title: e.target.value })} />

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{dict.admin.bodyMarkdown}</label>
                <textarea
                    rows={24}
                    value={draft.bodyMarkdown}
                    onChange={e => patch({ bodyMarkdown: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
        </div>
    );
}
