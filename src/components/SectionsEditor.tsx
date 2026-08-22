"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import {
    ArrowUpIcon, ArrowDownIcon, TrashIcon, PlusIcon, EyeIcon, EyeSlashIcon, DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import ImageService, { imagePath } from '@/services/imageService';
import { Section, SectionType, createSection, cloneSection, StatItem, ImageSection, FeedAvailability } from '@/types/content';
import TextInput from '@/components/TextInput';
import { useDictionary } from '@/i18n/DictionaryProvider';

const ALL_TYPES: SectionType[] = ['hero', 'feature', 'text', 'feed', 'contact', 'cta', 'stats', 'image'];

export default function SectionsEditor({
    sections,
    onChange,
    types = ALL_TYPES,
}: {
    sections: Section[];
    onChange: (sections: Section[]) => void;
    types?: SectionType[];
}) {
    const { dict } = useDictionary();
    const [addType, setAddType] = useState<SectionType>(types[0]);

    const patch = (id: string, changes: Partial<Section>) =>
        onChange(sections.map(s => (s.id === id ? { ...s, ...changes } as Section : s)));

    const move = (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= sections.length) return;
        const next = [...sections];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    const duplicate = (index: number) => {
        const next = [...sections];
        next.splice(index + 1, 0, cloneSection(sections[index]));
        onChange(next);
    };

    return (
        <div className="space-y-4">
            {sections.map((section, index) => (
                <div key={section.id} className="rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            {dict.sectionTypes[section.type]}
                        </span>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => patch(section.id, { visible: !section.visible })} title={section.visible ? dict.common.hide : dict.common.show} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                {section.visible ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                            </button>
                            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} title={dict.sections.moveUp} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30">
                                <ArrowUpIcon className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1} title={dict.sections.moveDown} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30">
                                <ArrowDownIcon className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => duplicate(index)} title={dict.sections.duplicate} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                <DocumentDuplicateIcon className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => onChange(sections.filter(s => s.id !== section.id))} title={dict.common.delete} className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <SectionEditor section={section} patch={changes => patch(section.id, changes)} />
                </div>
            ))}

            <div className="flex items-center gap-2 pt-2">
                <select
                    value={addType}
                    onChange={e => setAddType(e.target.value as SectionType)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                    {types.map(t => <option key={t} value={t}>{dict.sectionTypes[t]}</option>)}
                </select>
                <button
                    type="button"
                    onClick={() => onChange([...sections, createSection(addType)])}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-200 transition"
                >
                    <PlusIcon className="h-4 w-4" /> {dict.sections.add}
                </button>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
    if (textarea) {
        return (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <textarea
                    rows={3}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
        );
    }
    return <TextInput label={label} value={value} onChange={e => onChange(e.target.value)} />;
}

function SectionEditor({ section, patch }: { section: Section; patch: (changes: Partial<Section>) => void }) {
    const { dict } = useDictionary();
    switch (section.type) {
        case 'hero':
            return (
                <div className="space-y-4">
                    <Field label={dict.sections.heading} value={section.heading} onChange={v => patch({ heading: v })} />
                    <Field label={dict.sections.subheading} value={section.subheading} onChange={v => patch({ subheading: v })} textarea />
                    <div>
                        <ImagePicker
                            imageId={section.backgroundImageId}
                            onChange={backgroundImageId => patch({ backgroundImageId })}
                            label={dict.sections.backgroundImage}
                        />
                        <p className="mt-1 text-xs text-gray-500">{dict.sections.backgroundHint}</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label={dict.sections.button1Label} value={section.primaryLabel} onChange={v => patch({ primaryLabel: v })} />
                        <Field label={dict.sections.button1Href} value={section.primaryHref} onChange={v => patch({ primaryHref: v })} />
                        <Field label={dict.sections.button2Label} value={section.secondaryLabel} onChange={v => patch({ secondaryLabel: v })} />
                        <Field label={dict.sections.button2Href} value={section.secondaryHref} onChange={v => patch({ secondaryHref: v })} />
                    </div>
                </div>
            );

        case 'feature':
            return (
                <div className="space-y-4">
                    <Field label={dict.sections.heading} value={section.heading} onChange={v => patch({ heading: v })} />
                    <Field label={dict.sections.text} value={section.text} onChange={v => patch({ text: v })} textarea />
                    <BulletEditor bullets={section.bullets} onChange={bullets => patch({ bullets })} />
                </div>
            );

        case 'text':
            return (
                <div className="space-y-4">
                    <Field label={dict.sections.heading} value={section.heading} onChange={v => patch({ heading: v })} />
                    <Field label={dict.sections.body} value={section.body} onChange={v => patch({ body: v })} textarea />
                </div>
            );

        case 'feed':
            return (
                <div className="grid sm:grid-cols-3 gap-4">
                    <Field label={dict.sections.heading} value={section.heading} onChange={v => patch({ heading: v })} />
                    <TextInput
                        label={dict.sections.count}
                        type="number"
                        value={section.limit.toString()}
                        onChange={e => patch({ limit: Math.max(1, Number(e.target.value) || 1) })}
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{dict.sections.showing}</label>
                        <select
                            value={section.availability ?? 'all'}
                            onChange={e => patch({ availability: e.target.value as FeedAvailability })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="all">{dict.sections.showingAll}</option>
                            <option value="available">{dict.sections.showingAvailable}</option>
                            <option value="reserved">{dict.sections.showingReserved}</option>
                            <option value="sold">{dict.sections.showingSold}</option>
                        </select>
                    </div>
                </div>
            );

        case 'contact':
            return (
                <div className="space-y-4">
                    <Field label={dict.sections.heading} value={section.heading} onChange={v => patch({ heading: v })} />
                    <Field label={dict.sections.text} value={section.text} onChange={v => patch({ text: v })} textarea />
                </div>
            );

        case 'cta':
            return (
                <div className="space-y-4">
                    <Field label={dict.sections.heading} value={section.heading} onChange={v => patch({ heading: v })} />
                    <Field label={dict.sections.text} value={section.text} onChange={v => patch({ text: v })} textarea />
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label={dict.sections.buttonLabel} value={section.primaryLabel} onChange={v => patch({ primaryLabel: v })} />
                        <Field label={dict.sections.buttonHref} value={section.primaryHref} onChange={v => patch({ primaryHref: v })} />
                    </div>
                </div>
            );

        case 'stats':
            return (
                <div className="space-y-4">
                    <Field label={dict.sections.headingOptional} value={section.heading} onChange={v => patch({ heading: v })} />
                    <StatsEditor items={section.items} onChange={items => patch({ items })} />
                </div>
            );

        case 'image': {
            const layout = section.layout ?? 'standard';
            const usesText = layout === 'left' || layout === 'right' || layout === 'overlay' || layout === 'overlayFull';
            return (
                <div className="space-y-4">
                    <ImagePicker imageId={section.imageId} onChange={imageId => patch({ imageId })} />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{dict.sections.layout}</label>
                        <select
                            value={layout}
                            onChange={e => patch({ layout: e.target.value as ImageSection['layout'] })}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="standard">{dict.sections.layoutStandard}</option>
                            <option value="full">{dict.sections.layoutFull}</option>
                            <option value="left">{dict.sections.layoutLeft}</option>
                            <option value="right">{dict.sections.layoutRight}</option>
                            <option value="overlay">{dict.sections.layoutOverlay}</option>
                            <option value="overlayFull">{dict.sections.layoutOverlayFull}</option>
                        </select>
                    </div>
                    <Field label={dict.sections.altText} value={section.alt} onChange={v => patch({ alt: v })} />
                    {usesText && <Field label={dict.sections.text} value={section.text} onChange={v => patch({ text: v })} textarea />}
                    {!usesText && <Field label={dict.sections.caption} value={section.caption} onChange={v => patch({ caption: v })} />}
                </div>
            );
        }
    }
}

function StatsEditor({ items, onChange }: { items: StatItem[]; onChange: (items: StatItem[]) => void }) {
    const { dict } = useDictionary();
    const update = (i: number, changes: Partial<StatItem>) =>
        onChange(items.map((it, j) => (j === i ? { ...it, ...changes } : it)));

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.sections.numbers}</label>
            <div className="space-y-3">
                {items.map((item, i) => (
                    <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 p-3">
                        <label className="text-xs text-gray-600">
                            {dict.sections.source}
                            <select
                                value={item.source}
                                onChange={e => {
                                    const source = e.target.value as StatItem['source'];
                                    const defaults: Record<StatItem['source'], string> = {
                                        static: '',
                                        builds: dict.stats.builds,
                                        parts: dict.stats.parts,
                                    };
                                    update(i, { source, ...(item.label ? {} : { label: defaults[source] }) });
                                }}
                                className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            >
                                <option value="static">{dict.sections.sourceStatic}</option>
                                <option value="builds">{dict.sections.sourceBuilds}</option>
                                <option value="parts">{dict.sections.sourceParts}</option>
                            </select>
                        </label>
                        {item.source === 'static' && (
                            <div className="w-28">
                                <TextInput label={dict.sections.value} value={item.value} onChange={e => update(i, { value: e.target.value })} />
                            </div>
                        )}
                        <div className="flex-1 min-w-[10rem]">
                            <TextInput label={dict.sections.label} value={item.label} onChange={e => update(i, { label: e.target.value })} />
                        </div>
                        <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-2 rounded-lg text-red-500 hover:bg-red-50">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                <button type="button" onClick={() => onChange([...items, { source: 'static', value: '', label: '' }])} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
                    <PlusIcon className="h-4 w-4" /> {dict.sections.addNumber}
                </button>
            </div>
        </div>
    );
}

export function ImagePicker({ imageId, onChange, label }: { imageId: string | null; onChange: (id: string | null) => void; label?: string }) {
    const { dict } = useDictionary();
    const [uploading, setUploading] = useState(false);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setUploading(true);
        try {
            const { id } = await ImageService.upload(file);
            onChange(id);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : dict.sections.uploadFailed);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label ?? dict.sections.image}</label>
            {imageId != null && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePath(imageId)} alt="" className="mb-2 h-32 w-auto rounded-lg border border-gray-200 object-cover" />
            )}
            <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-200 transition cursor-pointer">
                    {uploading ? dict.admin.uploading : imageId != null ? dict.sections.replaceImage : dict.sections.uploadImage}
                    <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
                </label>
                {imageId != null && (
                    <button type="button" onClick={() => onChange(null)} className="text-sm text-red-500 hover:text-red-700">{dict.common.remove}</button>
                )}
            </div>
        </div>
    );
}

function BulletEditor({ bullets, onChange }: { bullets: string[]; onChange: (bullets: string[]) => void }) {
    const { dict } = useDictionary();
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.sections.bullets}</label>
            <div className="space-y-2">
                {bullets.map((bullet, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <input
                            value={bullet}
                            onChange={e => onChange(bullets.map((b, j) => (j === i ? e.target.value : b)))}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button type="button" onClick={() => onChange(bullets.filter((_, j) => j !== i))} className="p-2 rounded-lg text-red-500 hover:bg-red-50">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                <button type="button" onClick={() => onChange([...bullets, ''])} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
                    <PlusIcon className="h-4 w-4" /> {dict.sections.addBullet}
                </button>
            </div>
        </div>
    );
}
