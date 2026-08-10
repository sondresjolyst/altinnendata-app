"use client";

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import BuildService, { BuildAdmin, BuildSummary } from '@/services/buildService';
import BuildForm from './BuildForm';
import { DEFAULT_LOCALE } from '@/i18n/config';

export default function AdminBuildsPage() {
    const [builds, setBuilds] = useState<BuildSummary[]>([]);
    const [editing, setEditing] = useState<BuildAdmin | null>(null);
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        BuildService.list(DEFAULT_LOCALE, true)
            .then(setBuilds)
            .catch(err => toast.error(err instanceof Error ? err.message : 'Kunne ikke laste datamaskiner'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(load, [load]);

    const edit = async (id: number) => {
        try {
            setEditing(await BuildService.getForEdit(id));
            setCreating(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Kunne ikke laste datamaskineret');
        }
    };

    const remove = async (build: BuildSummary) => {
        if (!confirm(`Slette «${build.title}»?`)) return;
        try {
            await BuildService.remove(build.id);
            toast.success('Maskinen er slettet');
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Kunne ikke slette maskinen');
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
                <h2 className="font-bold text-gray-900">Datamaskiner</h2>
                <button
                    onClick={() => { setCreating(true); setEditing(null); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2 text-sm hover:brightness-95 transition"
                >
                    <PlusIcon className="h-4 w-4" /> Ny datamaskin
                </button>
            </div>

            {loading ? (
                <p className="text-gray-500">Laster…</p>
            ) : builds.length === 0 ? (
                <p className="text-gray-500">Ingen datamaskiner ennå.</p>
            ) : (
                <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200">
                    {builds.map(build => (
                        <li key={build.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <div className="flex-1 min-w-[12rem]">
                                <p className="font-semibold text-gray-900">{build.title}</p>
                                <p className="text-xs text-gray-500">
                                    /{build.slug} · {build.availability}
                                    {build.priceNok != null && ` · ${build.priceNok} kr`}
                                    {!build.published && ' · utkast'}
                                </p>
                            </div>
                            <button onClick={() => edit(build.id)} title="Rediger" className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                <PencilIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => remove(build)} title="Slett" className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
