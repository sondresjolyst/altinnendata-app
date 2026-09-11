"use client";

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ComponentConditionService, { ComponentCondition, ComponentConditionTranslation } from '@/services/componentConditionService';
import TextInput from '@/components/TextInput';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';

interface ConditionDraft {
    key: string;
    names: Record<string, string>;
}

const EMPTY_DRAFT: ConditionDraft = { key: '', names: {} };

const toDraft = (condition: ComponentCondition): ConditionDraft => ({
    key: condition.key,
    names: Object.fromEntries(condition.translations.map(t => [t.locale, t.name])),
});

const filledTranslations = (draft: ConditionDraft): ComponentConditionTranslation[] =>
    LOCALES
        .map(locale => ({ locale, name: (draft.names[locale] ?? '').trim() }))
        .filter(t => t.name !== '');

function ConditionFields({ draft, onChange }: {
    draft: ConditionDraft;
    onChange: (changes: Partial<ConditionDraft>) => void;
}) {
    const { dict } = useDictionary();

    const patch = (locale: Locale, name: string) =>
        onChange({ names: { ...draft.names, [locale]: name } });

    return (
        <div className="grid gap-3 sm:grid-cols-3">
            <TextInput
                label={dict.admin.categoryKey}
                value={draft.key}
                onChange={e => onChange({ key: e.target.value })}
                placeholder="brukt"
            />
            {LOCALES.map(locale => (
                <TextInput
                    key={locale}
                    label={`${dict.admin.name} (${locale})`}
                    value={draft.names[locale] ?? ''}
                    onChange={e => patch(locale, e.target.value)}
                />
            ))}
        </div>
    );
}

export default function AdminConditionsPage() {
    const { dict } = useDictionary();
    const [conditions, setConditions] = useState<ComponentCondition[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCondition, setNewCondition] = useState<ConditionDraft>(EMPTY_DRAFT);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editCondition, setEditCondition] = useState<ConditionDraft>(EMPTY_DRAFT);

    const load = useCallback(() => {
        setLoading(true);
        ComponentConditionService.list(DEFAULT_LOCALE)
            .then(setConditions)
            .catch(err => toast.error(err instanceof Error ? err.message : dict.admin.conditionsLoadFailed))
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

    const rejectInvalid = (draft: ConditionDraft, translations: ComponentConditionTranslation[]) => {
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

    const addCondition = async () => {
        const translations = filledTranslations(newCondition);
        if (rejectInvalid(newCondition, translations)) return;

        const ok = await run(
            () => ComponentConditionService.create({
                key: newCondition.key.trim().toLowerCase(),
                sortOrder: (conditions.at(-1)?.sortOrder ?? 0) + 10,
                translations,
            }),
            dict.admin.conditionAdded,
        );
        if (ok) setNewCondition(EMPTY_DRAFT);
    };

    const saveCondition = async (condition: ComponentCondition) => {
        const translations = filledTranslations(editCondition);
        if (rejectInvalid(editCondition, translations)) return;

        const ok = await run(
            () => ComponentConditionService.update(condition.id, {
                key: editCondition.key.trim().toLowerCase(),
                sortOrder: condition.sortOrder,
                translations,
            }),
            dict.admin.conditionUpdated,
        );
        if (ok) setEditingId(null);
    };

    if (loading) return <p className="text-gray-500">{dict.common.loading}</p>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-bold text-gray-900">{dict.admin.conditions}</h2>
                <p className="mt-1 text-sm text-gray-500">{dict.admin.conditionsHint}</p>
            </div>

            {conditions.length === 0 ? (
                <p className="text-sm text-gray-500">{dict.admin.noConditions}</p>
            ) : (
                <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200">
                    {conditions.map(condition => (
                        <li key={condition.id} className="px-4 py-3">
                            {editingId === condition.id ? (
                                <div className="space-y-3">
                                    <ConditionFields draft={editCondition} onChange={changes => setEditCondition(prev => ({ ...prev, ...changes }))} />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                                        >
                                            <XMarkIcon className="h-4 w-4" /> {dict.common.cancel}
                                        </button>
                                        <button
                                            onClick={() => saveCondition(condition)}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-1.5 text-sm hover:bg-gray-200"
                                        >
                                            <CheckIcon className="h-4 w-4" /> {dict.common.save}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{condition.name}</p>
                                        <p className="mt-0.5 text-xs text-gray-500">
                                            {condition.key} · {condition.translations.map(t => t.locale).join(' · ')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setEditingId(condition.id); setEditCondition(toDraft(condition)); }}
                                        title={dict.common.edit}
                                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                    >
                                        <PencilSquareIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => run(() => ComponentConditionService.remove(condition.id), dict.admin.conditionDeleted)}
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
                <ConditionFields draft={newCondition} onChange={changes => setNewCondition(prev => ({ ...prev, ...changes }))} />
                <div className="flex justify-end">
                    <button onClick={addCondition} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-200">
                        <PlusIcon className="h-4 w-4" /> {dict.common.add}
                    </button>
                </div>
            </div>
        </div>
    );
}
