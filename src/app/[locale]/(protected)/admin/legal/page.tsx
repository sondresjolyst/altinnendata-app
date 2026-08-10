"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import LegalService, { LEGAL_KEYS, LegalKey, LegalPage } from '@/services/legalService';
import LocaleTabs from '@/components/LocaleTabs';
import TextInput from '@/components/TextInput';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';

const KEY_LABELS: Record<LegalKey, string> = {
    terms: 'Vilkår',
    privacy: 'Personvern',
    cookies: 'Informasjonskapsler',
};

type Draft = { title: string; bodyMarkdown: string };

const emptyDraft: Draft = { title: '', bodyMarkdown: '' };

export default function AdminLegalPage() {
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
            .catch(err => toast.error(err instanceof Error ? err.message : 'Kunne ikke laste sidene'))
            .finally(() => setLoading(false));
    }, []);

    const slot = `${activeKey}:${activeLocale}`;
    const draft = drafts[slot] ?? emptyDraft;

    const patch = (changes: Partial<Draft>) =>
        setDrafts(prev => ({ ...prev, [slot]: { ...(prev[slot] ?? emptyDraft), ...changes } }));

    const save = async () => {
        if (draft.title.trim() === '' || draft.bodyMarkdown.trim() === '') {
            toast.error('Tittel og innhold må fylles ut');
            return;
        }
        setSaving(true);
        try {
            await LegalService.save(activeKey, activeLocale, draft.title.trim(), draft.bodyMarkdown);
            toast.success('Siden er lagret');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Kunne ikke lagre siden');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="text-gray-500">Laster…</p>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Juridiske sider</h2>
                <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2 text-sm hover:brightness-95 disabled:opacity-60 transition"
                >
                    {saving ? 'Lagrer…' : 'Lagre'}
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
                        {KEY_LABELS[key]}
                    </button>
                ))}
            </div>

            <LocaleTabs
                active={activeLocale}
                onChange={setActiveLocale}
                filled={Object.fromEntries(LOCALES.map(l => [l, (drafts[`${activeKey}:${l}`]?.bodyMarkdown ?? '') !== ''])) as Record<Locale, boolean>}
            />

            <TextInput label="Tittel" value={draft.title} onChange={e => patch({ title: e.target.value })} />

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Innhold (markdown)</label>
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
