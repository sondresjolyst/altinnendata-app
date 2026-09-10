"use client";

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import BuildClassService, { BuildClass, BuildClassTranslation } from '@/services/buildClassService';
import TextArea from '@/components/TextArea';
import TextInput from '@/components/TextInput';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';

interface ClassDraft {
    key: string;
    translations: Record<string, { name: string; description: string }>;
}

const EMPTY_DRAFT: ClassDraft = { key: '', translations: {} };

const toDraft = (buildClass: BuildClass): ClassDraft => ({
    key: buildClass.key,
    translations: Object.fromEntries(
        buildClass.translations.map(t => [t.locale, { name: t.name, description: t.description ?? '' }]),
    ),
});

const filledTranslations = (draft: ClassDraft): BuildClassTranslation[] =>
    LOCALES
        .map(locale => ({
            locale,
            name: (draft.translations[locale]?.name ?? '').trim(),
            description: (draft.translations[locale]?.description ?? '').trim() || null,
        }))
        .filter(t => t.name !== '');

function ClassFields({ draft, onChange }: {
    draft: ClassDraft;
    onChange: (changes: Partial<ClassDraft>) => void;
}) {
    const { dict } = useDictionary();

    const patch = (locale: Locale, changes: Partial<{ name: string; description: string }>) => {
        const current = draft.translations[locale] ?? { name: '', description: '' };
        onChange({ translations: { ...draft.translations, [locale]: { ...current, ...changes } } });
    };

    return (
        <div className="space-y-4">
            <div className="sm:w-56">
                <TextInput
                    label={dict.admin.categoryKey}
                    value={draft.key}
                    onChange={e => onChange({ key: e.target.value })}
                    placeholder="budsjett"
                />
            </div>

            {LOCALES.map(locale => (
                <div key={locale} className="space-y-2 rounded-xl border border-gray-100 p-3">
                    <TextInput
                        label={`${dict.admin.name} (${locale})`}
                        value={draft.translations[locale]?.name ?? ''}
                        onChange={e => patch(locale, { name: e.target.value })}
                    />
                    <TextArea
                        label={`${dict.admin.classDescription} (${locale})`}
                        rows={2}
                        value={draft.translations[locale]?.description ?? ''}
                        onChange={e => patch(locale, { description: e.target.value })}
                        placeholder={locale === DEFAULT_LOCALE ? 'Egnet for lettere spill som Minecraft, Roblox og Fortnite' : undefined}
                    />
                </div>
            ))}
        </div>
    );
}

export default function AdminClassesPage() {
    const { dict } = useDictionary();
    const [classes, setClasses] = useState<BuildClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [newClass, setNewClass] = useState<ClassDraft>(EMPTY_DRAFT);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editClass, setEditClass] = useState<ClassDraft>(EMPTY_DRAFT);

    const load = useCallback(() => {
        setLoading(true);
        BuildClassService.list(DEFAULT_LOCALE)
            .then(setClasses)
            .catch(err => toast.error(err instanceof Error ? err.message : dict.admin.classesLoadFailed))
            .finally(() => setLoading(false));
    }, []);

    useEffect(load, [load]);

    const run = async (action: () => Promise<unknown>, success: string) => {
        try {
            await action();
            toast.success(success);
            load();
            return true;
        } catch (err) {
            toast.error(err instanceof Error ? err.message : dict.common.actionFailed);
            return false;
        }
    };

    const rejectInvalid = (draft: ClassDraft, translations: BuildClassTranslation[]) => {
        if (draft.key.trim() === '') {
            toast.error(dict.admin.categoryKeyRequired);
            return true;
        }
        if (!translations.some(t => t.locale === DEFAULT_LOCALE)) {
            toast.error(dict.admin.norwegianNameRequired);
            return true;
        }
        return false;
    };

    const addClass = async () => {
        const translations = filledTranslations(newClass);
        if (rejectInvalid(newClass, translations)) return;

        const ok = await run(
            () => BuildClassService.create({
                key: newClass.key.trim().toLowerCase(),
                sortOrder: (classes.at(-1)?.sortOrder ?? 0) + 10,
                translations,
            }),
            dict.admin.classAdded,
        );
        if (ok) setNewClass(EMPTY_DRAFT);
    };

    const saveClass = async (buildClass: BuildClass) => {
        const translations = filledTranslations(editClass);
        if (rejectInvalid(editClass, translations)) return;

        const ok = await run(
            () => BuildClassService.update(buildClass.id, {
                key: editClass.key.trim().toLowerCase(),
                sortOrder: buildClass.sortOrder,
                translations,
            }),
            dict.admin.classUpdated,
        );
        if (ok) setEditingId(null);
    };

    if (loading) return <p className="text-gray-500">{dict.common.loading}</p>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-bold text-gray-900">{dict.admin.classes}</h2>
                <p className="mt-1 text-sm text-gray-500">{dict.admin.classesHint}</p>
            </div>

            {classes.length === 0 ? (
                <p className="text-sm text-gray-500">{dict.admin.noClasses}</p>
            ) : (
                <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200">
                    {classes.map(buildClass => (
                        <li key={buildClass.id} className="px-4 py-3">
                            {editingId === buildClass.id ? (
                                <div className="space-y-3">
                                    <ClassFields draft={editClass} onChange={changes => setEditClass(prev => ({ ...prev, ...changes }))} />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                                        >
                                            <XMarkIcon className="h-4 w-4" /> {dict.common.cancel}
                                        </button>
                                        <button
                                            onClick={() => saveClass(buildClass)}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-1.5 text-sm hover:bg-gray-200"
                                        >
                                            <CheckIcon className="h-4 w-4" /> {dict.common.save}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{buildClass.name}</p>
                                        {buildClass.description && (
                                            <p className="mt-0.5 text-sm text-gray-600">{buildClass.description}</p>
                                        )}
                                        <p className="mt-0.5 text-xs text-gray-500">
                                            {buildClass.key} · {buildClass.translations.map(t => t.locale).join(' · ')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setEditingId(buildClass.id); setEditClass(toDraft(buildClass)); }}
                                        title={dict.common.edit}
                                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                    >
                                        <PencilSquareIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => run(() => BuildClassService.remove(buildClass.id), dict.admin.classDeleted)}
                                        title={dict.common.delete}
                                        className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
                <ClassFields draft={newClass} onChange={changes => setNewClass(prev => ({ ...prev, ...changes }))} />
                <div className="flex justify-end">
                    <button onClick={addClass} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-200">
                        <PlusIcon className="h-4 w-4" /> {dict.common.add}
                    </button>
                </div>
            </div>
        </div>
    );
}
