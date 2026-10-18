"use client";

import { use, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { apiErrorCode } from '@sjolystinnovation/app-kit/api';
import { toast } from '@sjolystinnovation/app-kit/toast';
import { formatNok } from '@sjolystinnovation/app-kit/payments';
import { TextInput } from '@sjolystinnovation/app-kit/ui';
import ShopService, { type AdminOrder } from '@/services/shopService';
import CopyField from '@/components/shop/CopyField';
import { localeHref } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { invoiceDetails, osloDate } from '@/lib/shop';

type Action = 'capture' | 'cancel' | 'refund';

const BUTTON = 'rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';
const PRIMARY = 'bg-gray-900 text-white hover:bg-gray-800';
const SECONDARY = 'border border-gray-300 text-gray-900 hover:bg-gray-50';

export default function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: rawId } = use(params);
    const id = Number(rawId);
    const { locale, dict } = useDictionary();
    const text = dict.admin.shop;
    const [order, setOrder] = useState<AdminOrder | null>(null);
    const [confirming, setConfirming] = useState<Action | null>(null);
    const [busy, setBusy] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [savingInvoice, setSavingInvoice] = useState(false);

    useEffect(() => {
        let current = true;
        ShopService.getOrder(id)
            .then(loaded => {
                if (!current) return;
                setOrder(loaded);
                setInvoiceNumber(loaded.invoiceNumber ?? '');
            })
            .catch(err => toast.error(err instanceof Error ? err.message : text.orderLoadFailed));
        return () => { current = false; };
    }, [id, text.orderLoadFailed]);

    if (!order) {
        return <div className="py-10 text-center text-gray-500">{dict.common.loading}</div>;
    }

    const failureText = (err: unknown, fallback: string) => {
        const code = apiErrorCode(err);
        const known = code !== undefined && Object.hasOwn(text.apiErrors, code) ? text.apiErrors[code as keyof typeof text.apiErrors] : undefined;
        return known ?? (err instanceof Error && err.message ? err.message : fallback);
    };

    const run = async (action: Action) => {
        setBusy(true);
        try {
            const updated = await ShopService[action](order.id);
            setOrder(updated);
            setConfirming(null);
            toast.success({ capture: text.captureDone, cancel: text.cancelDone, refund: text.refundDone }[action]);
        } catch (err) {
            setConfirming(null);
            toast.error(failureText(err, text.actionFailed));
        } finally {
            setBusy(false);
        }
    };

    const saveInvoiceNumber = async () => {
        setSavingInvoice(true);
        try {
            const updated = await ShopService.setInvoiceNumber(order.id, invoiceNumber.trim() || null);
            setOrder(updated);
            setInvoiceNumber(updated.invoiceNumber ?? '');
            toast.success(text.invoiceSaved);
        } catch (err) {
            toast.error(failureText(err, text.invoiceFailed));
        } finally {
            setSavingInvoice(false);
        }
    };

    const actions: { action: Action; label: string; confirm: string; style: string }[] = [];
    if (order.status === 'Reserved') {
        actions.push(
            { action: 'capture', label: text.capture, confirm: text.confirmCapture, style: PRIMARY },
            { action: 'cancel', label: text.cancel, confirm: text.confirmCancel, style: SECONDARY },
        );
    } else if (order.status === 'Paid') {
        actions.push({ action: 'refund', label: text.refund, confirm: text.confirmRefund, style: SECONDARY });
    }
    const pending = actions.find(a => a.action === confirming);

    const address = [order.streetAddress, [order.postalCode, order.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const date = (iso: string | null) => (iso ? osloDate(iso) : null);
    const fields: [string, ReactNode][] = [
        [
            text.columns.status,
            <>
                {text.statuses[order.status]}
                {order.isTest && <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">{text.test}</span>}
            </>,
        ],
        [text.reference, order.reference],
        [text.buyerName, order.buyerName],
        [text.email, order.buyerEmail],
        [text.phone, order.buyerPhone],
        [text.address, address || null],
        [text.deliveryLabel, `${order.deliveryLabel} (${formatNok(order.deliveryPriceInOre)})`],
        [text.withinDistance, order.deliveryMethod === 'HomeDelivery' ? (order.withinDistanceConfirmed ? dict.common.yes : dict.common.no) : null],
        [text.pickupNote, order.pickupNote],
        [text.columns.build, order.buildTitle],
        [text.columns.total, formatNok(order.totalInOre)],
        [text.captured, order.capturedInOre > 0 ? formatNok(order.capturedInOre) : null],
        [text.refunded, order.refundedInOre > 0 ? formatNok(order.refundedInOre) : null],
        [text.columns.deadline, date(order.captureGuaranteedUntil) ?? text.unknown],
        [text.created, date(order.createdAt)],
        [text.termsAccepted, date(order.termsAcceptedAt)],
        [text.reserved, date(order.authorizedAt)],
        [text.paid, date(order.capturedAt)],
        [text.cancelled, date(order.cancelledAt)],
        [text.refundedAt, date(order.refundedAt)],
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href={localeHref(locale, '/admin/shop')} className="text-sm font-semibold text-gray-900 underline">
                    {text.backToOrders}
                </Link>
                {order.buildSlug && (
                    <Link href={localeHref(locale, `/builds/${order.buildSlug}`)} className="text-sm font-semibold text-gray-900 underline">
                        {text.buildLink}
                    </Link>
                )}
            </div>

            <section aria-labelledby="order-heading" className="space-y-4 rounded-2xl border border-gray-200 p-5">
                <h2 id="order-heading" className="font-bold text-gray-900">{text.order}</h2>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    {fields.filter(([, value]) => value !== null && value !== '').map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
                            <dd className="text-gray-900">{value}</dd>
                        </div>
                    ))}
                </dl>
                {actions.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                        {actions.map(a => (
                            <button key={a.action} type="button" disabled={busy} onClick={() => setConfirming(a.action)} className={`${BUTTON} ${a.style}`}>
                                {a.label}
                            </button>
                        ))}
                    </div>
                )}
            </section>

            <section aria-labelledby="invoice-heading" className="space-y-3 rounded-2xl border border-gray-200 p-5">
                <h2 id="invoice-heading" className="font-bold text-gray-900">{text.invoiceDetails}</h2>
                <p className="text-sm text-gray-600">{text.invoiceNote}</p>
                <div className="divide-y divide-gray-100">
                    {invoiceDetails(order, dict).map(detail => (
                        <CopyField key={detail.key} label={detail.label} value={detail.value} />
                    ))}
                </div>
                <form
                    className="flex flex-wrap items-end gap-3 pt-2"
                    onSubmit={e => {
                        e.preventDefault();
                        void saveInvoiceNumber();
                    }}
                >
                    <div className="min-w-48 flex-1">
                        <TextInput label={text.invoiceNumber} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                    </div>
                    <button type="submit" disabled={savingInvoice} className={`${BUTTON} ${PRIMARY}`}>
                        {savingInvoice ? dict.common.saving : dict.common.save}
                    </button>
                </form>
            </section>

            {pending && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div role="dialog" aria-modal="true" aria-labelledby="confirm-heading" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
                        <h2 id="confirm-heading" className="font-bold text-gray-900">{pending.label}</h2>
                        <p className="text-sm text-gray-700">{pending.confirm}</p>
                        <div className="flex justify-end gap-3">
                            <button type="button" disabled={busy} onClick={() => setConfirming(null)} className={`${BUTTON} ${SECONDARY}`}>
                                {dict.common.cancel}
                            </button>
                            <button type="button" disabled={busy} onClick={() => void run(pending.action)} className={`${BUTTON} ${PRIMARY}`}>
                                {pending.label}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
