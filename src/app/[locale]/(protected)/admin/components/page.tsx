"use client";

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ComponentService, { CategoryTree, ComponentCategory, ComponentManufacturer, ComponentPart } from '@/services/componentService';
import TextArea from '@/components/TextArea';
import TextInput from '@/components/TextInput';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';

interface PartDraft {
    categoryId: number | '';
    manufacturerId: number | '';
    name: string;
    details: string;
}

const EMPTY_PART: PartDraft = { categoryId: '', manufacturerId: '', name: '', details: '' };

const toPartDraft = (part: ComponentPart): PartDraft => ({
    categoryId: part.categoryId,
    manufacturerId: part.manufacturerId ?? '',
    name: part.name,
    details: part.details ?? '',
});

function PartFields({ draft, onChange, categories, manufacturers }: {
    draft: PartDraft;
    onChange: (changes: Partial<PartDraft>) => void;
    categories: ComponentCategory[];
    manufacturers: ComponentManufacturer[];
}) {
    const { dict } = useDictionary();
    return (
        <>
            <div className="grid gap-4 sm:grid-cols-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{dict.builds.category.label}</label>
                    <select
                        value={draft.categoryId}
                        onChange={e => onChange({ categoryId: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">—</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{dict.admin.manufacturer}</label>
                    <select
                        value={draft.manufacturerId}
                        onChange={e => onChange({ manufacturerId: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">—</option>
                        {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
                <TextInput label={dict.admin.name} value={draft.name} onChange={e => onChange({ name: e.target.value })} />
            </div>

            <TextArea
                label={dict.admin.details}
                value={draft.details}
                onChange={e => onChange({ details: e.target.value })}
            />
        </>
    );
}

function CategoryFields({ categoryKey, names, onKeyChange, onNameChange }: {
    categoryKey: string;
    names: Record<string, string>;
    onKeyChange: (value: string) => void;
    onNameChange: (locale: string, value: string) => void;
}) {
    const { dict } = useDictionary();
    return (
        <div className="grid gap-4 sm:grid-cols-3">
            <TextInput label={dict.admin.categoryKey} value={categoryKey} onChange={e => onKeyChange(e.target.value)} placeholder="cpu" />
            {LOCALES.map(locale => (
                <TextInput
                    key={locale}
                    label={`${dict.admin.name} (${locale})`}
                    value={names[locale] ?? ''}
                    onChange={e => onNameChange(locale, e.target.value)}
                />
            ))}
        </div>
    );
}

export default function AdminComponentsPage() {
    const { dict } = useDictionary();
    const [tree, setTree] = useState<CategoryTree[]>([]);
    const [categories, setCategories] = useState<ComponentCategory[]>([]);
    const [manufacturers, setManufacturers] = useState<ComponentManufacturer[]>([]);
    const [loading, setLoading] = useState(true);

    const [newCategoryKey, setNewCategoryKey] = useState('');
    const [newCategoryNames, setNewCategoryNames] = useState<Record<string, string>>({});
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [editCategoryKey, setEditCategoryKey] = useState('');
    const [editCategoryNames, setEditCategoryNames] = useState<Record<string, string>>({});

    const [newManufacturer, setNewManufacturer] = useState('');
    const [editingManufacturerId, setEditingManufacturerId] = useState<number | null>(null);
    const [editManufacturerName, setEditManufacturerName] = useState('');

    const [newPart, setNewPart] = useState<PartDraft>(EMPTY_PART);
    const [editingPartId, setEditingPartId] = useState<number | null>(null);
    const [editPart, setEditPart] = useState<PartDraft>(EMPTY_PART);

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            ComponentService.getTree(DEFAULT_LOCALE),
            ComponentService.listCategories(DEFAULT_LOCALE),
            ComponentService.listManufacturers(),
        ])
            .then(([treeData, categoryData, manufacturerData]) => {
                setTree(treeData);
                setCategories(categoryData);
                setManufacturers(manufacturerData);
            })
            .catch(err => toast.error(err instanceof Error ? err.message : dict.admin.catalogLoadFailed))
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

    const categoryTranslations = (names: Record<string, string>) =>
        LOCALES
            .map(locale => ({ locale, name: (names[locale] ?? '').trim() }))
            .filter(t => t.name !== '');

    const rejectInvalidCategory = (key: string, translations: { locale: string }[]) => {
        if (key.trim() === '') {
            toast.error(dict.admin.categoryKeyRequired);
            return true;
        }
        if (!translations.some(t => t.locale === DEFAULT_LOCALE)) {
            toast.error(dict.admin.norwegianNameRequired);
            return true;
        }
        return false;
    };

    const addCategory = async () => {
        const translations = categoryTranslations(newCategoryNames);
        if (rejectInvalidCategory(newCategoryKey, translations)) return;

        const ok = await run(
            () => ComponentService.createCategory({
                key: newCategoryKey.trim().toLowerCase(),
                sortOrder: (categories.at(-1)?.sortOrder ?? 0) + 10,
                translations,
            }),
            dict.admin.categoryAdded,
        );
        if (ok) { setNewCategoryKey(''); setNewCategoryNames({}); }
    };

    const startEditCategory = (category: ComponentCategory) => {
        setEditingCategoryId(category.id);
        setEditCategoryKey(category.key);
        setEditCategoryNames(Object.fromEntries(category.translations.map(t => [t.locale, t.name])));
    };

    const saveCategory = async (category: ComponentCategory) => {
        const translations = categoryTranslations(editCategoryNames);
        if (rejectInvalidCategory(editCategoryKey, translations)) return;

        const ok = await run(
            () => ComponentService.updateCategory(category.id, {
                key: editCategoryKey.trim().toLowerCase(),
                sortOrder: category.sortOrder,
                translations,
            }),
            dict.admin.categoryUpdated,
        );
        if (ok) setEditingCategoryId(null);
    };

    const saveManufacturer = async (id: number) => {
        if (editManufacturerName.trim() === '') {
            toast.error(dict.admin.manufacturerNameRequired);
            return;
        }
        const ok = await run(
            () => ComponentService.renameManufacturer(id, editManufacturerName.trim()),
            dict.admin.manufacturerUpdated,
        );
        if (ok) setEditingManufacturerId(null);
    };

    const partInput = (draft: PartDraft) => ({
        categoryId: Number(draft.categoryId),
        manufacturerId: draft.manufacturerId === '' ? null : Number(draft.manufacturerId),
        name: draft.name.trim(),
        details: draft.details.trim() || null,
    });

    const addPart = async () => {
        if (newPart.categoryId === '' || newPart.name.trim() === '') {
            toast.error(dict.admin.choosePartCategory);
            return;
        }
        const ok = await run(() => ComponentService.createPart(partInput(newPart)), dict.admin.partAdded);
        if (ok) setNewPart(EMPTY_PART);
    };

    const savePart = async (id: number) => {
        if (editPart.categoryId === '' || editPart.name.trim() === '') {
            toast.error(dict.admin.choosePartCategory);
            return;
        }
        const ok = await run(() => ComponentService.updatePart(id, partInput(editPart)), dict.admin.partUpdated);
        if (ok) setEditingPartId(null);
    };

    if (loading) return <p className="text-gray-500">{dict.common.loading}</p>;

    return (
        <div className="space-y-8">
            <section className="space-y-3">
                <h2 className="font-bold text-gray-900">{dict.admin.categories}</h2>
                <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200">
                    {categories.map(category => (
                        <li key={category.id} className="px-4 py-3">
                            {editingCategoryId === category.id ? (
                                <div className="space-y-3">
                                    <CategoryFields
                                        categoryKey={editCategoryKey}
                                        names={editCategoryNames}
                                        onKeyChange={setEditCategoryKey}
                                        onNameChange={(locale, value) => setEditCategoryNames(prev => ({ ...prev, [locale]: value }))}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setEditingCategoryId(null)}
                                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                                        >
                                            <XMarkIcon className="h-4 w-4" /> {dict.common.cancel}
                                        </button>
                                        <button
                                            onClick={() => saveCategory(category)}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-1.5 text-sm hover:bg-gray-200"
                                        >
                                            <CheckIcon className="h-4 w-4" /> {dict.common.save}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{category.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {category.key} · {category.translations.map(t => `${t.locale}: ${t.name}`).join(' · ')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => startEditCategory(category)}
                                        title={dict.common.edit}
                                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                    >
                                        <PencilSquareIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => run(() => ComponentService.removeCategory(category.id), dict.admin.categoryDeleted)}
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

                <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
                    <CategoryFields
                        categoryKey={newCategoryKey}
                        names={newCategoryNames}
                        onKeyChange={setNewCategoryKey}
                        onNameChange={(locale, value) => setNewCategoryNames(prev => ({ ...prev, [locale]: value }))}
                    />
                    <div className="flex justify-end">
                        <button onClick={addCategory} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-200">
                            <PlusIcon className="h-4 w-4" /> {dict.common.add}
                        </button>
                    </div>
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="font-bold text-gray-900">{dict.admin.manufacturers}</h2>
                <ul className="flex flex-wrap gap-2">
                    {manufacturers.map(manufacturer => (
                        <li key={manufacturer.id} className="inline-flex items-center gap-2 rounded-full border border-gray-200 pl-3 pr-1 py-1 text-sm">
                            {editingManufacturerId === manufacturer.id ? (
                                <>
                                    <input
                                        value={editManufacturerName}
                                        onChange={e => setEditManufacturerName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') saveManufacturer(manufacturer.id);
                                            if (e.key === 'Escape') setEditingManufacturerId(null);
                                        }}
                                        autoFocus
                                        className="w-40 rounded-full border border-gray-300 px-2 py-0.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <button
                                        onClick={() => saveManufacturer(manufacturer.id)}
                                        disabled={editManufacturerName.trim() === ''}
                                        title={dict.common.save}
                                        className="p-1 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                                    >
                                        <CheckIcon className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setEditingManufacturerId(null)}
                                        title={dict.common.cancel}
                                        className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
                                    >
                                        <XMarkIcon className="h-3.5 w-3.5" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    {manufacturer.name}
                                    <button
                                        onClick={() => {
                                            setEditingManufacturerId(manufacturer.id);
                                            setEditManufacturerName(manufacturer.name);
                                        }}
                                        title={dict.common.edit}
                                        className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                    >
                                        <PencilSquareIcon className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => run(() => ComponentService.removeManufacturer(manufacturer.id), dict.admin.manufacturerDeleted)}
                                        title={dict.common.delete}
                                        className="p-1 rounded-full text-red-500 hover:bg-red-50"
                                    >
                                        <TrashIcon className="h-3.5 w-3.5" />
                                    </button>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
                <div className="flex items-end gap-2">
                    <div className="w-64">
                        <TextInput label={dict.admin.newManufacturer} value={newManufacturer} onChange={e => setNewManufacturer(e.target.value)} />
                    </div>
                    <button
                        onClick={async () => {
                            const ok = await run(() => ComponentService.createManufacturer(newManufacturer.trim()), dict.admin.manufacturerAdded);
                            if (ok) setNewManufacturer('');
                        }}
                        disabled={newManufacturer.trim() === ''}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-200 disabled:opacity-50"
                    >
                        <PlusIcon className="h-4 w-4" /> {dict.common.add}
                    </button>
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="font-bold text-gray-900">{dict.admin.parts}</h2>
                {tree.map(category => (
                    <div key={category.id} className="rounded-2xl border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        {category.parts.length === 0 ? (
                            <p className="mt-1 text-sm text-gray-500">{dict.admin.noParts}</p>
                        ) : (
                            <ul className="mt-2 divide-y divide-gray-100">
                                {category.parts.map(part => (
                                    <li key={part.id} className="py-2">
                                        {editingPartId === part.id ? (
                                            <div className="space-y-4">
                                                <PartFields
                                                    draft={editPart}
                                                    onChange={changes => setEditPart(prev => ({ ...prev, ...changes }))}
                                                    categories={categories}
                                                    manufacturers={manufacturers}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setEditingPartId(null)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                                                    >
                                                        <XMarkIcon className="h-4 w-4" /> {dict.common.cancel}
                                                    </button>
                                                    <button
                                                        onClick={() => savePart(part.id)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-1.5 text-sm hover:bg-gray-200"
                                                    >
                                                        <CheckIcon className="h-4 w-4" /> {dict.common.save}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <p className="text-sm text-gray-900">
                                                        {[part.manufacturerName, part.name].filter(Boolean).join(' ')}
                                                    </p>
                                                    {part.details && <p className="text-xs text-gray-500 whitespace-pre-line">{part.details}</p>}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setEditingPartId(part.id);
                                                        setEditPart(toPartDraft(part));
                                                    }}
                                                    title={dict.common.edit}
                                                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => run(() => ComponentService.removePart(part.id), dict.admin.partDeleted)}
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
                    </div>
                ))}

                <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
                    <PartFields
                        draft={newPart}
                        onChange={changes => setNewPart(prev => ({ ...prev, ...changes }))}
                        categories={categories}
                        manufacturers={manufacturers}
                    />
                    <div className="flex justify-end">
                        <button onClick={addPart} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-200">
                            <PlusIcon className="h-4 w-4" /> {dict.admin.addPart}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
