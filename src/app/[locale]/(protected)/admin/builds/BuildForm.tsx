"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownTrayIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import BuildService, { Availability, BuildAdmin, BuildInput, BuildTranslation } from '@/services/buildService';
import ComponentService, { CategoryTree } from '@/services/componentService';
import FinnService from '@/services/finnService';
import ImageService, { imagePath } from '@/services/imageService';
import { ImagePicker } from '@/components/SectionsEditor';
import LocaleTabs from '@/components/LocaleTabs';
import TextInput from '@/components/TextInput';
import Toggle from '@/components/Toggle';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';

const AVAILABILITIES: Availability[] = ['Available', 'Reserved', 'Sold'];

const AVAILABILITY_LABELS: Record<Availability, string> = {
    Available: 'Tilgjengelig',
    Reserved: 'Reservert',
    Sold: 'Solgt',
};

const CATEGORIES = ['gaming', 'office', 'streaming', 'workstation'];

const CATEGORY_LABELS: Record<string, string> = {
    gaming: 'Gaming',
    office: 'Kontor',
    streaming: 'Streaming',
    workstation: 'Arbeidsstasjon',
};

interface PartLine {
    componentPartId: number | null;
    componentCategoryId: number | null;
    name: string;
    details: string;
}

const emptyTranslation = (locale: Locale): BuildTranslation => ({ locale, title: '', summary: '', description: '' });

export default function BuildForm({ build, onSaved, onCancel }: {
    build: BuildAdmin | null;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const { dict } = useDictionary();
    const [activeLocale, setActiveLocale] = useState<Locale>(DEFAULT_LOCALE);
    const [translations, setTranslations] = useState<Record<Locale, BuildTranslation>>(() =>
        Object.fromEntries(
            LOCALES.map(locale => [
                locale,
                build?.translations.find(t => t.locale === locale) ?? emptyTranslation(locale),
            ]),
        ) as Record<Locale, BuildTranslation>,
    );

    const [category, setCategory] = useState(build?.category ?? '');
    const [availability, setAvailability] = useState<Availability>(build?.availability ?? 'Available');
    const [priceNok, setPriceNok] = useState(build?.priceNok?.toString() ?? '');
    const [builtOn, setBuiltOn] = useState(build?.builtOn ?? '');
    const [coverImageId, setCoverImageId] = useState<string | null>(build?.coverImageId ?? null);
    const [published, setPublished] = useState(build?.published ?? false);
    const [sortOrder, setSortOrder] = useState(build?.sortOrder ?? 0);
    const [parts, setParts] = useState<PartLine[]>(
        build?.components.map(c => ({
            componentPartId: c.componentPartId,
            componentCategoryId: c.componentCategoryId,
            name: c.componentPartId ? '' : c.name,
            details: c.details ?? '',
        })) ?? [],
    );

    const [finnUrl, setFinnUrl] = useState(build?.finnUrl ?? '');
    const [imageIds, setImageIds] = useState<string[]>(build?.imageIds ?? []);
    const [importing, setImporting] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [tree, setTree] = useState<CategoryTree[]>([]);
    const [saving, setSaving] = useState(false);

    const moveImage = (index: number, delta: number) => {
        const target = index + delta;
        if (target < 0 || target >= imageIds.length) return;
        const next = [...imageIds];
        [next[index], next[target]] = [next[target], next[index]];
        setImageIds(next);
    };

    const addImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (files.length === 0) return;

        setUploading(true);
        try {
            const uploaded = await Promise.all(files.map(file => ImageService.upload(file)));
            setImageIds(current => [...current, ...uploaded.map(u => u.id)]);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : dict.admin.uploadFailed);
        } finally {
            setUploading(false);
        }
    };

    const importFromFinn = async () => {
        setImporting(true);
        try {
            const ad = await FinnService.import(finnUrl.trim());

            if (ad.title) patchTranslation(activeLocale, { title: ad.title });
            if (ad.summary) patchTranslation(activeLocale, { summary: ad.summary });
            if (ad.description) patchTranslation(activeLocale, { description: ad.description });
            if (ad.priceNok != null) setPriceNok(ad.priceNok.toString());
            if (ad.imageIds.length > 0) {
                setImageIds(current => [...current, ...ad.imageIds.filter(id => !current.includes(id))]);
                if (!coverImageId && ad.coverImageId) setCoverImageId(ad.coverImageId);
            }

            toast.success(
                ad.skippedImages > 0
                    ? dict.admin.importedSkipped.replace('{count}', String(ad.skippedImages))
                    : dict.admin.imported,
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : dict.admin.importFailed);
        } finally {
            setImporting(false);
        }
    };

    useEffect(() => {
        ComponentService.getTree(DEFAULT_LOCALE).then(setTree).catch(() => setTree([]));
    }, []);

    const patchTranslation = (locale: Locale, changes: Partial<BuildTranslation>) =>
        setTranslations(prev => ({ ...prev, [locale]: { ...prev[locale], ...changes } }));

    const patchPart = (index: number, changes: Partial<PartLine>) =>
        setParts(prev => prev.map((p, i) => (i === index ? { ...p, ...changes } : p)));

    const save = async () => {
        const filled = LOCALES
            .map(locale => translations[locale])
            .filter(t => t.title.trim() !== '');

        if (!filled.some(t => t.locale === DEFAULT_LOCALE)) {
            toast.error(dict.admin.titleRequired);
            return;
        }

        const input: BuildInput = {
            category: category || null,
            availability,
            priceNok: priceNok === '' ? null : Number(priceNok),
            builtOn: builtOn || null,
            finnUrl: finnUrl.trim() || null,
            published,
            sortOrder,
            imageIds,
            translations: filled.map(t => ({
                ...t,
                summary: t.summary?.trim() || null,
                description: t.description?.trim() || null,
            })),
            components: parts.map((p, i) => ({
                componentPartId: p.componentPartId,
                componentCategoryId: p.componentCategoryId,
                name: p.componentPartId ? null : p.name.trim() || null,
                details: p.details.trim() || null,
                sortOrder: i,
            })),
        };

        setSaving(true);
        try {
            if (build) await BuildService.update(build.id, input);
            else await BuildService.create(input);
            toast.success(build ? dict.admin.buildSaved : dict.admin.buildCreated);
            onSaved();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : dict.admin.buildSaveFailed);
        } finally {
            setSaving(false);
        }
    };

    const translation = translations[activeLocale];
    const allParts = tree.flatMap(category => category.parts);

    return (
        <div className="space-y-6 rounded-2xl border border-gray-200 p-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{dict.builds.category.label}</label>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">—</option>
                        {CATEGORIES.map(key => <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{dict.builds.availability.label}</label>
                    <select
                        value={availability}
                        onChange={e => setAvailability(e.target.value as Availability)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        {AVAILABILITIES.map(a => <option key={a} value={a}>{AVAILABILITY_LABELS[a]}</option>)}
                    </select>
                </div>

                <TextInput label={dict.admin.price} type="number" value={priceNok} onChange={e => setPriceNok(e.target.value)} />
                <TextInput label={dict.builds.builtOn} type="date" value={builtOn} onChange={e => setBuiltOn(e.target.value)} />
                <TextInput label={dict.admin.sortOrder} type="number" value={sortOrder.toString()} onChange={e => setSortOrder(Number(e.target.value) || 0)} />

                <div className="flex items-end">
                    <Toggle checked={published} onChange={setPublished} label={dict.admin.published} />
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[18rem]">
                        <TextInput
                            label={dict.admin.finnUrl}
                            value={finnUrl}
                            onChange={e => setFinnUrl(e.target.value)}
                            placeholder="https://www.finn.no/recommerce/forsale/item/..."
                        />
                    </div>
                    <button
                        type="button"
                        onClick={importFromFinn}
                        disabled={importing || finnUrl.trim() === ''}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-200 disabled:opacity-50"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" /> {importing ? dict.admin.importing : dict.admin.importFromFinn}
                    </button>
                </div>
                <p className="text-xs text-gray-500">
                    {dict.admin.finnHelp}
                </p>
            </div>

            <ImagePicker imageId={coverImageId} onChange={setCoverImageId} label={dict.admin.coverImage} />

            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">{dict.admin.gallery}</h3>
                    <label className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-3 py-1.5 text-xs hover:bg-gray-200 cursor-pointer">
                        {uploading ? dict.admin.uploading : dict.admin.addImage}
                        <input type="file" accept="image/*" multiple onChange={addImages} disabled={uploading} className="hidden" />
                    </label>
                </div>
                {imageIds.length === 0 ? (
                    <p className="text-sm text-gray-500">{dict.admin.noImages}</p>
                ) : (
                    <ul className="flex flex-wrap gap-3">
                        {imageIds.map((id, index) => (
                            <li key={id} className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`${imagePath(id)}?w=384`} alt="" className="h-24 w-32 rounded-lg border border-gray-200 object-cover" />
                                <div className="mt-1 flex items-center justify-between gap-1">
                                    <div className="flex gap-1">
                                        <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} className="rounded px-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30">←</button>
                                        <button type="button" onClick={() => moveImage(index, 1)} disabled={index === imageIds.length - 1} className="rounded px-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30">→</button>
                                    </div>
                                    <button type="button" onClick={() => setImageIds(imageIds.filter(x => x !== id))} className="rounded p-1 text-red-500 hover:bg-red-50">
                                        <TrashIcon className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="space-y-4">
                <LocaleTabs
                    active={activeLocale}
                    onChange={setActiveLocale}
                    filled={Object.fromEntries(LOCALES.map(l => [l, translations[l].title.trim() !== ''])) as Record<Locale, boolean>}
                />
                <TextInput
                    label={dict.admin.buildTitle}
                    value={translation.title}
                    onChange={e => patchTranslation(activeLocale, { title: e.target.value })}
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{dict.admin.buildSummary}</label>
                    <textarea
                        rows={2}
                        value={translation.summary ?? ''}
                        onChange={e => patchTranslation(activeLocale, { summary: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{dict.admin.buildBody}</label>
                    <textarea
                        rows={8}
                        value={translation.description ?? ''}
                        onChange={e => patchTranslation(activeLocale, { description: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="mt-1 text-xs text-gray-500">{dict.admin.markdownHint}</p>
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Deleliste</h3>
                <div className="space-y-2">
                    {parts.map((part, i) => (
                        <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 p-3">
                            <label className="text-xs text-gray-600">
                                Del fra katalog
                                <select
                                    value={part.componentPartId ?? ''}
                                    onChange={e => {
                                        const id = e.target.value === '' ? null : Number(e.target.value);
                                        const chosen = allParts.find(p => p.id === id);
                                        patchPart(i, {
                                            componentPartId: id,
                                            componentCategoryId: chosen?.categoryId ?? part.componentCategoryId,
                                        });
                                    }}
                                    className="mt-1 block w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                >
                                    <option value="">— fritekst —</option>
                                    {tree.map(category => (
                                        <optgroup key={category.id} label={category.name}>
                                            {category.parts.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {[p.manufacturerName, p.name].filter(Boolean).join(' ')}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </label>

                            {part.componentPartId == null && (
                                <>
                                    <label className="text-xs text-gray-600">
                                        Kategori
                                        <select
                                            value={part.componentCategoryId ?? ''}
                                            onChange={e => patchPart(i, { componentCategoryId: e.target.value === '' ? null : Number(e.target.value) })}
                                            className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        >
                                            <option value="">—</option>
                                            {tree.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </label>
                                    <div className="flex-1 min-w-[12rem]">
                                        <TextInput label="Navn" value={part.name} onChange={e => patchPart(i, { name: e.target.value })} />
                                    </div>
                                </>
                            )}

                            <div className="flex-1 min-w-[10rem]">
                                <TextInput label="Detaljer" value={part.details} onChange={e => patchPart(i, { details: e.target.value })} />
                            </div>

                            <button type="button" onClick={() => setParts(parts.filter((_, j) => j !== i))} className="p-2 rounded-lg text-red-500 hover:bg-red-50">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => setParts([...parts, { componentPartId: null, componentCategoryId: null, name: '', details: '' }])}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
                    >
                        <PlusIcon className="h-4 w-4" /> Legg til del
                    </button>
                </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
                <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                    Avbryt
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
    );
}
