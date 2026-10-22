"use client";

import { use, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from '@sjolystinnovation/app-kit/toast';
import { Alert } from '@sjolystinnovation/app-kit/ui';
import EnquiryService, { type Assignee, type Enquiry, type EnquiryStatus, type EnquiryUpdate } from '@/services/enquiryService';
import BuildService from '@/services/buildService';
import { localeHref } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { fillTemplate } from '@/lib/format';
import { osloDateTime } from '@/lib/shop';

const STATUSES: EnquiryStatus[] = ['New', 'InProgress', 'Answered', 'Done'];
// The reply goes out in the language the enquiry was written in.
const REPLY_SUBJECTS: Record<string, string> = { no: 'Henvendelsen din til Altinnendata', en: 'Your enquiry to Altinnendata' };
const BUTTON = 'rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY = 'bg-gray-900 text-white hover:bg-gray-800';
const SECONDARY = 'border border-gray-300 text-gray-900 hover:bg-gray-50';
const SELECT = 'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:opacity-50';

export default function AdminEnquiryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: rawId } = use(params);
    const id = Number(rawId);
    const { locale, dict } = useDictionary();
    const text = dict.admin.enquiries;
    const detail = text.detail;
    const router = useRouter();
    const { data: session } = useSession();
    const me = session?.user?.id;
    const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
    const [assignees, setAssignees] = useState<Assignee[]>([]);
    const [loadFailed, setLoadFailed] = useState(false);
    const [buildExists, setBuildExists] = useState(false);
    const [busy, setBusy] = useState(false);
    const [conflict, setConflict] = useState(false);

    useEffect(() => {
        let current = true;
        EnquiryService.get(id)
            .then(loaded => { if (current) setEnquiry(loaded); })
            .catch(() => { if (current) setLoadFailed(true); });
        // Without the list the page still works, with the current owner and None in the select.
        EnquiryService.assignees()
            .then(admins => { if (current) setAssignees(admins); })
            .catch(() => {});
        return () => { current = false; };
    }, [id]);

    const slug = enquiry?.buildSlug ?? null;
    const hasBuildTitle = Boolean(enquiry?.buildTitle);
    useEffect(() => {
        if (!slug || !hasBuildTitle) return;
        let current = true;
        BuildService.findBySlug(slug, locale)
            .then(build => { if (current) setBuildExists(build !== null); })
            .catch(() => { if (current) setBuildExists(false); });
        return () => { current = false; };
    }, [slug, hasBuildTitle, locale]);

    if (!enquiry && loadFailed) return <Alert variant="error">{detail.loadFailed}</Alert>;

    if (!enquiry) {
        return <div className="py-10 text-center text-gray-500">{dict.common.loading}</div>;
    }

    const owner = enquiry.owner;
    const otherOwner = owner && owner.id !== me ? owner : null;
    const mine = owner !== null && owner.id === me;

    const save = async (body: EnquiryUpdate) => {
        setBusy(true);
        setConflict(false);
        try {
            const result = await EnquiryService.update(enquiry.id, body);
            if (result.ok) {
                setEnquiry(result.enquiry);
                toast.success(detail.saved);
            } else {
                // The owner changed since this page loaded, so show the current case and let the admin decide again.
                setEnquiry(result.conflict);
                setConflict(true);
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : detail.updateFailed);
        } finally {
            setBusy(false);
        }
    };

    const changeOwner = (assignedUserId: string | null) => {
        if (otherOwner) {
            const question = assignedUserId === null ? detail.confirmUnassign : detail.confirmTakeOver;
            if (!window.confirm(fillTemplate(question, { name: otherOwner.name }))) return;
        }
        void save({ setOwner: true, assignedUserId, expectedAssignedUserId: owner?.id ?? null });
    };

    const remove = async () => {
        if (!window.confirm(detail.confirmDelete)) return;
        setBusy(true);
        try {
            await EnquiryService.remove(enquiry.id);
            toast.success(detail.deleted);
            router.push(localeHref(locale, '/admin/enquiries'));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : detail.deleteFailed);
            setBusy(false);
        }
    };

    const takeReason = mine ? detail.yours : me ? null : detail.waitingForLogin;
    const subject = REPLY_SUBJECTS[enquiry.locale] ?? REPLY_SUBJECTS.en;
    const fields: [string, ReactNode][] = [
        [detail.received, osloDateTime(enquiry.createdAt)],
        [detail.name, enquiry.name],
        [detail.email, enquiry.email],
        [detail.phone, enquiry.phone],
        [detail.useCase, enquiry.useCase],
        [detail.budget, enquiry.budgetNok],
        [
            detail.build,
            enquiry.buildTitle && (
                buildExists && slug
                    ? <Link href={localeHref(locale, `/builds/${slug}`)} className="underline">{enquiry.buildTitle}</Link>
                    : enquiry.buildTitle
            ),
        ],
    ];

    return (
        <div className="space-y-6">
            <Link href={localeHref(locale, '/admin/enquiries')} className="text-sm font-semibold text-gray-900 underline">
                {detail.back}
            </Link>

            <section aria-labelledby="enquiry-heading" className="space-y-4 rounded-2xl border border-gray-200 p-5">
                <h2 id="enquiry-heading" className="font-bold text-gray-900">{detail.heading}</h2>
                {!enquiry.receiptSent && <Alert variant="warning">{detail.noReceipt}</Alert>}
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    {fields.filter(([, value]) => value !== null && value !== '').map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
                            <dd className="break-words text-gray-900">{value}</dd>
                        </div>
                    ))}
                </dl>
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{detail.message}</h3>
                    <div className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-sm text-gray-900">{enquiry.message}</div>
                </div>
            </section>

            <section aria-label={detail.owner} className="space-y-4 rounded-2xl border border-gray-200 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-gray-900">
                        {detail.status}
                        <select
                            value={enquiry.status}
                            disabled={busy}
                            onChange={event => void save({ status: event.target.value as EnquiryStatus })}
                            className={SELECT}
                        >
                            {STATUSES.map(status => <option key={status} value={status}>{text.statuses[status]}</option>)}
                        </select>
                    </label>
                    <label className="block text-sm font-semibold text-gray-900">
                        {detail.owner}
                        <select
                            value={owner?.id ?? ''}
                            disabled={busy}
                            onChange={event => changeOwner(event.target.value || null)}
                            className={SELECT}
                        >
                            <option value="">{text.noOwner}</option>
                            {owner && !assignees.some(admin => admin.id === owner.id) && <option value={owner.id}>{owner.name}</option>}
                            {assignees.map(admin => <option key={admin.id} value={admin.id}>{admin.name}</option>)}
                        </select>
                        {enquiry.ownerRemoved && <span className="mt-1 block text-xs font-normal text-amber-800">{text.ownerRemoved}</span>}
                    </label>
                </div>
                {conflict && <Alert variant="warning">{detail.conflict}</Alert>}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        disabled={busy || takeReason !== null}
                        aria-describedby={takeReason ? 'take-note' : undefined}
                        onClick={() => me && changeOwner(me)}
                        className={`${BUTTON} ${PRIMARY}`}
                    >
                        {otherOwner ? fillTemplate(detail.takeOver, { name: otherOwner.name }) : detail.take}
                    </button>
                    {takeReason && <p id="take-note" className="text-sm text-gray-600">{takeReason}</p>}
                    <a href={`mailto:${encodeURIComponent(enquiry.email).replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}`} className={`${BUTTON} ${SECONDARY}`}>
                        {detail.reply}
                    </a>
                    {otherOwner && <p className="text-sm text-gray-600">{fillTemplate(detail.ownedBy, { name: otherOwner.name })}</p>}
                    <button type="button" disabled={busy} onClick={() => void remove()} className={`${BUTTON} ${SECONDARY} ml-auto`}>
                        {detail.delete}
                    </button>
                </div>
            </section>
        </div>
    );
}
