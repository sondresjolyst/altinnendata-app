"use client";

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import ComponentService, { CategoryTree, ComponentCategory, ComponentManufacturer } from '@/services/componentService';
import TextInput from '@/components/TextInput';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function AdminComponentsPage() {
    const { dict } = useDictionary();
    const [tree, setTree] = useState<CategoryTree[]>([]);
    const [categories, setCategories] = useState<ComponentCategory[]>([]);
    const [manufacturers, setManufacturers] = useState<ComponentManufacturer[]>([]);
    const [loading, setLoading] = useState(true);

    const [newCategoryKey, setNewCategoryKey] = useState('');
    const [newCategoryNames, setNewCategoryNames] = useState<Record<string, string>>({});
    const [newManufacturer, setNewManufacturer] = useState('');
    const [partCategoryId, setPartCategoryId] = useState<number | ''>('');
    const [partManufacturerId, setPartManufacturerId] = useState<number | ''>('');
    const [partName, setPartName] = useState('');
    const [partDetails, setPartDetails] = useState('');

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
        } catch (err) {
            toast.error(err instanceof Error ? err.message : dict.common.actionFailed);
        }
    };

    const addCategory = () => {
        const translations = LOCALES
            .map(locale => ({ locale, name: (newCategoryNames[locale] ?? '').trim() }))
            .filter(t => t.name !== '');

        if (!translations.some(t => t.locale === DEFAULT_LOCALE)) {
            toast.error(dict.admin.norwegianNameRequired);
            return;
        }

        return run(
            () => ComponentService.createCategory({ key: newCategoryKey.trim().toLowerCase(), sortOrder: (categories.at(-1)?.sortOrder ?? 0) + 10, translations }),
            dict.admin.categoryAdded,
        ).then(() => { setNewCategoryKey(''); setNewCategoryNames({}); });
    };

    const addPart = () => {
        if (partCategoryId === '' || partName.trim() === '') {
            toast.error(dict.admin.choosePartCategory);
            return;
        }
        return run(
            () => ComponentService.createPart({
                categoryId: Number(partCategoryId),
                manufacturerId: partManufacturerId === '' ? null : Number(partManufacturerId),
                name: partName.trim(),
                details: partDetails.trim() || null,
            }),
            dict.admin.partAdded,
        ).then(() => { setPartName(''); setPartDetails(''); });
    };

    if (loading) return <p className="text-gray-500">{dict.common.loading}</p>;

    return (
        <div className="space-y-8">
            <section className="space-y-3">
                <h2 className="font-bold text-gray-900">{dict.admin.categories}</h2>
                <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200">
                    {categories.map(category => (
                        <li key={category.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">{category.name}</p>
                                <p className="text-xs text-gray-500">
                                    {category.key} · {category.translations.map(t => `${t.locale}: ${t.name}`).join(' · ')}
                                </p>
                            </div>
                            <button
                                onClick={() => run(() => ComponentService.removeCategory(category.id), dict.admin.categoryDeleted)}
                                className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </li>
                    ))}
                </ul>

                <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray-200 p-4">
                    <div className="w-40">
                        <TextInput label={dict.admin.categoryKey} value={newCategoryKey} onChange={e => setNewCategoryKey(e.target.value)} placeholder="cpu" />
                    </div>
                    {LOCALES.map(locale => (
                        <div key={locale} className="w-44">
                            <TextInput
                                label={`${dict.admin.name} (${locale})`}
                                value={newCategoryNames[locale] ?? ''}
                                onChange={e => setNewCategoryNames(prev => ({ ...prev, [locale]: e.target.value }))}
                            />
                        </div>
                    ))}
                    <button onClick={addCategory} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-200">
                        <PlusIcon className="h-4 w-4" /> {dict.common.add}
                    </button>
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="font-bold text-gray-900">{dict.admin.manufacturers}</h2>
                <ul className="flex flex-wrap gap-2">
                    {manufacturers.map(manufacturer => (
                        <li key={manufacturer.id} className="inline-flex items-center gap-2 rounded-full border border-gray-200 pl-3 pr-1 py-1 text-sm">
                            {manufacturer.name}
                            <button
                                onClick={() => run(() => ComponentService.removeManufacturer(manufacturer.id), dict.admin.manufacturerDeleted)}
                                className="p-1 rounded-full text-red-500 hover:bg-red-50"
                            >
                                <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="flex items-end gap-2">
                    <div className="w-64">
                        <TextInput label={dict.admin.newManufacturer} value={newManufacturer} onChange={e => setNewManufacturer(e.target.value)} />
                    </div>
                    <button
                        onClick={() => run(() => ComponentService.createManufacturer(newManufacturer.trim()), dict.admin.manufacturerAdded).then(() => setNewManufacturer(''))}
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
                                    <li key={part.id} className="flex items-center gap-3 py-2">
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-900">
                                                {[part.manufacturerName, part.name].filter(Boolean).join(' ')}
                                            </p>
                                            {part.details && <p className="text-xs text-gray-500">{part.details}</p>}
                                        </div>
                                        <button
                                            onClick={() => run(() => ComponentService.removePart(part.id), dict.admin.partDeleted)}
                                            className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}

                <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray-200 p-4">
                    <label className="text-xs text-gray-600">
                        {dict.builds.category.label}
                        <select
                            value={partCategoryId}
                            onChange={e => setPartCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                            className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="">—</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </label>
                    <label className="text-xs text-gray-600">
                        {dict.admin.manufacturers}
                        <select
                            value={partManufacturerId}
                            onChange={e => setPartManufacturerId(e.target.value === '' ? '' : Number(e.target.value))}
                            className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="">—</option>
                            {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </label>
                    <div className="w-56">
                        <TextInput label={dict.admin.name} value={partName} onChange={e => setPartName(e.target.value)} />
                    </div>
                    <div className="flex-1 min-w-[12rem]">
                        <TextInput label={dict.admin.details} value={partDetails} onChange={e => setPartDetails(e.target.value)} />
                    </div>
                    <button onClick={addPart} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-200">
                        <PlusIcon className="h-4 w-4" /> {dict.admin.addPart}
                    </button>
                </div>
            </section>
        </div>
    );
}
