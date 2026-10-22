"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@sjolystinnovation/app-kit/toast';
import { Alert } from '@sjolystinnovation/app-kit/ui';
import EnquiryService, { type EnquiryPage, type EnquiryStatus } from '@/services/enquiryService';
import { localeHref } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { fillTemplate } from '@/lib/format';
import { osloDate } from '@/lib/shop';

const STATUSES: EnquiryStatus[] = ['New', 'InProgress', 'Answered', 'Done'];
const DEFAULT_STATUSES: EnquiryStatus[] = ['New', 'InProgress', 'Answered'];
const PAGE_SIZE = 50;
const NOTHING: EnquiryPage = { items: [], total: 0 };

export default function AdminEnquiriesPage() {
    const { locale, dict } = useDictionary();
    const text = dict.admin.enquiries;
    const [statuses, setStatuses] = useState<EnquiryStatus[]>(DEFAULT_STATUSES);
    const [mine, setMine] = useState(false);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [loaded, setResult] = useState<EnquiryPage | null>(null);
    const [loadedKey, setLoadedKey] = useState('');
    const [loadFailed, setLoadFailed] = useState(false);
    const key = JSON.stringify([statuses, mine, query, page]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setQuery(search.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        // The API shows everything but Done when no status is sent, so no status means no request.
        if (statuses.length === 0) return;
        let current = true;
        EnquiryService.list({ status: statuses, mine, q: query, page })
            .then(next => {
                if (!current) return;
                setLoadFailed(false);
                if (next.items.length === 0 && next.total > 0 && page > 1) {
                    // The total shrank while on a later page, so go to the last page.
                    setPage(Math.ceil(next.total / PAGE_SIZE));
                    return;
                }
                setResult(next);
                setLoadedKey(key);
            })
            .catch(err => {
                if (!current) return;
                setLoadFailed(true);
                toast.error(err instanceof Error ? err.message : text.loadFailed);
            });
        return () => { current = false; };
    }, [statuses, mine, query, page, key, text.loadFailed]);

    const toggleStatus = (status: EnquiryStatus) => {
        setStatuses(current => STATUSES.filter(value => value === status ? !current.includes(value) : current.includes(value)));
        setPage(1);
    };

    const failed = loadFailed && statuses.length > 0;
    const result = statuses.length === 0 ? NOTHING : loaded;
    const loading = statuses.length > 0 && !failed && key !== loadedKey;
    const pages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;
    const cell = 'px-3 py-3 align-top';
    const badge = 'ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800';

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <legend className="sr-only">{text.filterStatus}</legend>
                    {STATUSES.map(status => (
                        <label key={status} className="flex items-center gap-2 text-sm text-gray-900">
                            <input type="checkbox" checked={statuses.includes(status)} onChange={() => toggleStatus(status)} />
                            {text.statuses[status]}
                        </label>
                    ))}
                </fieldset>
                <label className="flex items-center gap-2 text-sm text-gray-900">
                    <input type="checkbox" checked={mine} onChange={() => { setMine(!mine); setPage(1); }} />
                    {text.mine}
                </label>
                <input
                    type="search"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder={text.search}
                    aria-label={text.search}
                    className="min-w-60 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
            </div>

            {failed && <Alert variant="error">{text.loadFailed}</Alert>}
            {!failed && !result && <div className="py-10 text-center text-gray-500">{dict.common.loading}</div>}
            {!failed && result && result.items.length === 0 && <div className="py-10 text-center text-gray-500">{statuses.length === 0 ? text.pickStatus : text.empty}</div>}

            {!failed && result && result.items.length > 0 && (
                <div aria-busy={loading} className={`overflow-x-auto rounded-2xl border border-gray-200${loading ? ' opacity-50' : ''}`}>
                    <table className="w-full text-left text-sm text-gray-900">
                        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className={cell}>{text.columns.received}</th>
                                <th className={cell}>{text.columns.name}</th>
                                <th className={`${cell} hidden sm:table-cell`}>{text.columns.about}</th>
                                <th className={cell}>{text.columns.status}</th>
                                <th className={`${cell} hidden sm:table-cell`}>{text.columns.owner}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {result.items.map(enquiry => (
                                <tr key={enquiry.id} className={enquiry.status === 'New' ? 'font-bold' : undefined}>
                                    <td className={cell}>{osloDate(enquiry.createdAt)}</td>
                                    <td className={cell}>
                                        <Link href={localeHref(locale, `/admin/enquiries/${enquiry.id}`)} className="underline" title={text.open}>
                                            {enquiry.name}
                                        </Link>
                                        <div className="mt-1 text-xs font-normal text-gray-600 sm:hidden">
                                            {enquiry.owner ? enquiry.owner.name : text.noOwner}
                                            {enquiry.ownerRemoved && <span className={badge}>{text.ownerRemoved}</span>}
                                        </div>
                                    </td>
                                    <td className={`${cell} hidden sm:table-cell`}>{enquiry.buildTitle ?? enquiry.useCase}</td>
                                    <td className={cell}>{text.statuses[enquiry.status]}</td>
                                    <td className={`${cell} hidden sm:table-cell`}>
                                        {enquiry.owner ? enquiry.owner.name : text.noOwner}
                                        {enquiry.ownerRemoved && <span className={badge}>{text.ownerRemoved}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {result && result.total > PAGE_SIZE && (
                <div className="flex items-center justify-between text-sm text-gray-900">
                    <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50">
                        {text.previous}
                    </button>
                    <span>{fillTemplate(text.pageOf, { page: String(page), pages: String(pages) })}</span>
                    <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50">
                        {text.next}
                    </button>
                </div>
            )}
        </div>
    );
}
