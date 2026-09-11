"use client";

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import BuildService, { Availability, BuildAdmin, BuildSummary } from '@/services/buildService';
import BuildForm from './BuildForm';
import { formatDate, formatPrice } from '@/lib/format';
import { DEFAULT_LOCALE } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';

const GROUPS: { key: Availability; dictKey: 'available' | 'reserved' | 'sold'; tone: string; open: boolean }[] = [
    { key: 'Available', dictKey: 'available', tone: 'bg-emerald-100 text-emerald-800', open: true },
    { key: 'Reserved', dictKey: 'reserved', tone: 'bg-amber-100 text-amber-800', open: true },
    { key: 'Sold', dictKey: 'sold', tone: 'bg-gray-200 text-gray-700', open: false },
];

export default function AdminBuildsPage() {
    const { locale, dict } = useDictionary();
    const [builds, setBuilds] = useState<BuildSummary[]>([]);
    const [editing, setEditing] = useState<BuildAdmin | null>(null);
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        BuildService.list(DEFAULT_LOCALE, true)
            .then(setBuilds)
            .catch(err => toast.error(err instanceof Error ? err.message : dict.admin.buildsLoadFailed))
            .finally(() => setLoading(false));
    }, []);

    useEffect(load, [load]);

    const edit = async (id: number) => {
        try {
            setEditing(await BuildService.getForEdit(id));
            setCreating(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : dict.admin.buildLoadFailed);
        }
    };

    const remove = async (build: BuildSummary) => {
        if (!confirm(dict.admin.confirmDeleteBuild.replace('{title}', build.title))) return;
        try {
            await BuildService.remove(build.id);
            toast.success(dict.admin.buildDeleted);
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : dict.admin.buildDeleteFailed);
        }
    };

    const closeForm = () => {
        setEditing(null);
        setCreating(false);
    };

    const savedAndClose = () => {
        closeForm();
        load();
    };

    if (creating || editing) {
        return <BuildForm build={editing} onSaved={savedAndClose} onCancel={closeForm} />;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">{dict.admin.builds}</h2>
                <button
                    onClick={() => { setCreating(true); setEditing(null); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2 text-sm hover:brightness-95 transition"
                >
                    <PlusIcon className="h-4 w-4" /> {dict.admin.newBuild}
                </button>
            </div>

            {loading ? (
                <p className="text-gray-500">{dict.common.loading}</p>
            ) : builds.length === 0 ? (
                <p className="text-gray-500">{dict.admin.noBuilds}</p>
            ) : (
                GROUPS.map(group => {
                    const inGroup = builds.filter(build => build.availability === group.key);
                    if (inGroup.length === 0) return null;

                    return (
                        <details key={group.key} open={group.open} className="group">
                            <summary className="flex cursor-pointer list-none items-center gap-2 py-2 marker:content-none">
                                <span className="inline-block text-gray-400 transition-transform group-open:rotate-90">▸</span>
                                <h3 className="font-semibold text-gray-900">{dict.builds.groups[group.dictKey]}</h3>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${group.tone}`}>{inGroup.length}</span>
                            </summary>
                            <ul className="mt-2 divide-y divide-gray-200 rounded-2xl border border-gray-200">
                                {inGroup.map(build => (
                                    <li key={build.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                        <div className="flex-1 min-w-[12rem]">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold text-gray-900">{build.title}</p>
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${group.tone}`}>
                                                    {dict.builds.availability[group.dictKey]}
                                                </span>
                                                {!build.published && (
                                                    <span className="rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-500">
                                                        {dict.admin.draftTag}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                /{build.slug}
                                                {build.priceNok != null && ` · ${formatPrice(build.priceNok, locale)}`}
                                                {group.key === 'Sold' && build.soldOn && ` ·${dict.admin.soldOn} ${formatDate(build.soldOn, locale)}`}
                                            </p>
                                        </div>
                                        <button onClick={() => edit(build.id)} title={dict.common.edit} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => remove(build)} title={dict.common.delete} className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    );
                })
            )}
        </div>
    );
}
