"use client";

import { use, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { apiErrorCode, apiFieldErrors, errorText } from '@sjolystinnovation/app-kit/api';
import { toast } from '@sjolystinnovation/app-kit/toast';
import { Alert, TextArea, TextInput } from '@sjolystinnovation/app-kit/ui';
import ShopService, { type AdminOrder } from '@/services/shopService';
import ConfirmDialog from '@/components/shop/ConfirmDialog';
import CopyField from '@/components/shop/CopyField';
import { localeHref } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { fillTemplate, formatOre } from '@/lib/format';
import { formatAddress, invoiceDetails, kroner, osloDate, osloDateTime, osloTime, parseKroner, plainPhone, refundAmountIssue, remainingInOre } from '@/lib/shop';

type Action = 'capture' | 'cancel' | 'refund' | 'release' | 'paymentLink' | 'ship';

// The API caps the invoice number at this many characters.
const MAX_INVOICE_NUMBER = 50;
// The API caps the note to the buyer at this many characters.
const MAX_SHIPPING_NOTE = 500;
const BUTTON = 'rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';
const PRIMARY = 'bg-gray-900 text-white hover:bg-gray-800';
const SECONDARY = 'border border-gray-300 text-gray-900 hover:bg-gray-50';

export default function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: rawId } = use(params);
    const id = Number(rawId);
    const { locale, dict } = useDictionary();
    const text = dict.admin.shop;
    const [order, setOrder] = useState<AdminOrder | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [confirming, setConfirming] = useState<Action | null>(null);
    const [busy, setBusy] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [savingInvoice, setSavingInvoice] = useState(false);
    const [acted, setActed] = useState(0);
    const [refundAmount, setRefundAmount] = useState('');
    const [apiRefusedAmount, setApiRefusedAmount] = useState(false);
    const [shippingNote, setShippingNote] = useState('');
    const [apiRefusedNote, setApiRefusedNote] = useState(false);
    const heading = useRef<HTMLHeadingElement>(null);

    // The action buttons change with the status, so the one that opened the dialog may be gone.
    useEffect(() => {
        if (acted > 0) heading.current?.focus();
    }, [acted]);

    useEffect(() => {
        let current = true;
        ShopService.getOrder(id)
            .then(loaded => {
                if (!current) return;
                setOrder(loaded);
                setInvoiceNumber(loaded.invoiceNumber ?? '');
            })
            .catch(err => {
                if (!current) return;
                setLoadFailed(true);
                toast.error(err instanceof Error ? err.message : text.orderLoadFailed);
            });
        return () => { current = false; };
    }, [id, text.orderLoadFailed]);

    if (!order && loadFailed) return <Alert variant="error">{text.orderLoadFailed}</Alert>;

    if (!order) {
        return <div className="py-10 text-center text-gray-500">{dict.common.loading}</div>;
    }

    const failureText = (err: unknown, fallback: string) => errorText(err, text.apiErrors, fallback);

    const remaining = remainingInOre(order);
    // The API refusing the amount counts as too high until the amount is edited.
    const refundIssue = refundAmountIssue(refundAmount, remaining) ?? (apiRefusedAmount ? 'tooHigh' : null);

    const pickup = order.deliveryMethod === 'Pickup';
    // The API refusing the note counts as too long until the note is edited.
    const noteTooLong = shippingNote.trim().length > MAX_SHIPPING_NOTE || apiRefusedNote;
    const shipReason = order.shippedAt
        ? (pickup ? text.alreadyReadyReason : text.alreadyShippedReason)
        : order.status === 'Reserved' || order.status === 'Paid' ? null : text.shipStatusReason;

    const openAction = (action: Action) => {
        setRefundAmount(kroner(remaining));
        setApiRefusedAmount(false);
        setShippingNote('');
        setApiRefusedNote(false);
        setConfirming(action);
    };

    const ship = async () => {
        if (noteTooLong) return;
        setBusy(true);
        try {
            const updated = await ShopService.markShipped(order.id, shippingNote.trim() || null);
            setOrder(updated);
            setConfirming(null);
            toast.success(pickup ? text.readyDone : text.shippedDone);
        } catch (err) {
            if (apiFieldErrors(err)?.note) {
                // The dialog stays open so the note can be shortened.
                setApiRefusedNote(true);
            } else {
                setConfirming(null);
                const code = apiErrorCode(err);
                toast.error(code !== undefined && Object.hasOwn(text.apiErrors, code) ? text.apiErrors[code as keyof typeof text.apiErrors] : text.shipFailed);
            }
        } finally {
            setBusy(false);
        }
    };

    const run = async (action: Exclude<Action, 'ship'>) => {
        let amountInOre = 0;
        if (action === 'refund') {
            if (refundIssue) return;
            amountInOre = parseKroner(refundAmount) ?? 0;
        }
        setBusy(true);
        try {
            const updated = action === 'refund'
                ? await ShopService.refund(order.id, amountInOre, order.refundedInOre)
                : action === 'release'
                    ? await ShopService.releaseBuild(order.id)
                    : action === 'paymentLink'
                        ? await ShopService.sendPaymentLink(order.id)
                        : await ShopService[action](order.id);
            setOrder(updated);
            setConfirming(null);
            setActed(n => n + 1);
            toast.success({ capture: text.captureDone, cancel: text.cancelDone, refund: text.refundDone, release: text.releaseDone, paymentLink: text.paymentLinkDone }[action]);
        } catch (err) {
            if (action === 'refund' && apiFieldErrors(err)?.amountInOre) {
                // The dialog stays open so the amount can be fixed.
                setApiRefusedAmount(true);
            } else {
                setConfirming(null);
                toast.error(failureText(err, text.actionFailed));
                // A refused release or link means the order or the build changed, so the buttons show why from fresh data.
                if (action === 'release' || action === 'paymentLink') ShopService.getOrder(order.id).then(setOrder).catch(() => undefined);
            }
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

    const actions: { action: Action; label: string; title: string; confirm: string; style: string }[] = [];
    if (order.status === 'Reserved') {
        actions.push(
            { action: 'capture', label: text.capture, title: fillTemplate(text.captureTitle, { amount: formatOre(order.totalInOre, locale) }), confirm: text.confirmCapture, style: PRIMARY },
            { action: 'cancel', label: text.cancel, title: text.cancel, confirm: text.confirmCancel, style: SECONDARY },
        );
    } else if (order.status === 'Paid' && remaining > 0) {
        // The confirm text names the typed amount only when it can be refunded.
        const confirm = refundIssue ? text.refundInvalidAmount : fillTemplate(text.confirmRefund, { amount: formatOre(parseKroner(refundAmount) ?? 0, locale) });
        actions.push({ action: 'refund', label: text.refund, title: text.refund, confirm, style: SECONDARY });
    }
    const shipLabel = pickup ? text.markReady : text.markShipped;
    const releaseReason = order.releaseBuildBlockedReason ? text.releaseReasons[order.releaseBuildBlockedReason] : null;
    const paymentLinkReason = order.paymentLinkBlockedReason ? text.paymentLinkReasons[order.paymentLinkBlockedReason] : null;
    const paymentLinkSent = order.paymentLinkSentAt && order.paymentLinkExpiresAt
        ? fillTemplate(text.paymentLinkSent, { sent: osloDate(order.paymentLinkSentAt), date: osloDate(order.paymentLinkExpiresAt), time: osloTime(order.paymentLinkExpiresAt) })
        : null;
    const pending = confirming === 'ship'
        ? { action: 'ship' as const, label: shipLabel, title: shipLabel, confirm: pickup ? text.confirmReady : text.confirmShipped }
        : confirming === 'release'
            ? { action: 'release' as const, label: text.releaseBuild, title: text.releaseBuild, confirm: text.confirmRelease }
            : confirming === 'paymentLink'
                ? { action: 'paymentLink' as const, label: text.sendPaymentLink, title: text.sendPaymentLink, confirm: text.confirmPaymentLink }
                : actions.find(a => a.action === confirming);
    const vippsState = (state: string) => (Object.hasOwn(text.vippsStates, state) ? text.vippsStates[state as keyof typeof text.vippsStates] : state);

    const address = formatAddress(order);
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
        [text.phone, plainPhone(order.buyerPhone)],
        [text.address, address || null],
        [text.deliveryLabel, `${order.deliveryLabel} (${formatOre(order.deliveryPriceInOre, locale)})`],
        [text.withinDistance, order.deliveryMethod === 'HomeDelivery' ? (order.withinDistanceConfirmed ? dict.common.yes : dict.common.no) : null],
        [text.pickupNote, order.pickupNote],
        [text.columns.build, order.buildTitle],
        [text.buildPrice, formatOre(order.buildPriceInOre, locale)],
        [text.columns.total, formatOre(order.totalInOre, locale)],
        [text.captured, order.capturedInOre > 0 ? formatOre(order.capturedInOre, locale) : null],
        [text.columns.deadline, date(order.captureGuaranteedUntil) ?? text.unknown],
        [text.created, date(order.createdAt)],
        [
            text.vippsPayments,
            order.vippsReferences.length > 0
                ? (
                    <ul className="space-y-0.5">
                        {order.vippsReferences.map(payment => (
                            <li key={payment.reference} className="break-all">
                                {payment.reference} <span className="text-gray-600">({vippsState(payment.state)})</span>
                            </li>
                        ))}
                    </ul>
                )
                : null,
        ],
        [
            text.termsAccepted,
            order.termsVersion === 'none'
                ? fillTemplate(text.termsNoPage, { date: osloDate(order.termsAcceptedAt) })
                : order.termsVersion
                    ? fillTemplate(text.termsAcceptedValue, { date: osloDate(order.termsAcceptedAt), version: osloDateTime(order.termsVersion) })
                    : date(order.termsAcceptedAt),
        ],
        [text.termsIp, order.termsAcceptedIp],
        [text.confirmation, order.confirmationSentAt ? fillTemplate(text.confirmationSent, { date: osloDate(order.confirmationSentAt) }) : text.confirmationNotSent],
        [pickup ? text.readyAt : text.shippedAt, date(order.shippedAt)],
        [text.shippingNote, order.shippingNote ? <span className="whitespace-pre-line break-words">{order.shippingNote}</span> : null],
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
                <h2 id="order-heading" ref={heading} tabIndex={-1} className="font-bold text-gray-900 outline-none">{text.order}</h2>
                {order.reservationEndedAt && (
                    <Alert variant="warning">
                        <p className="font-semibold">{fillTemplate(text.reservationEnded, { date: osloDate(order.reservationEndedAt) })}</p>
                        {order.holdsBuild && <p className="mt-1">{text.reservationEndedHint}</p>}
                    </Alert>
                )}
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    {fields.filter(([, value]) => value !== null && value !== '').map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
                            <dd className="text-gray-900">{value}</dd>
                        </div>
                    ))}
                </dl>
                {order.refundedInOre > 0 && (
                    <p className="text-sm font-semibold text-gray-900">
                        {fillTemplate(text.refundedOf, { refunded: formatOre(order.refundedInOre, locale), captured: formatOre(order.capturedInOre, locale) })}
                    </p>
                )}
                {actions.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                        {actions.map(a => (
                            <button key={a.action} type="button" disabled={busy} onClick={() => openAction(a.action)} className={`${BUTTON} ${a.style}`}>
                                {a.label}
                            </button>
                        ))}
                    </div>
                )}
                {/* The button stays in place in every state, with the reason when it is off. */}
                <div className="space-y-1 border-t border-gray-100 pt-4">
                    <button
                        type="button"
                        disabled={busy || shipReason !== null}
                        aria-describedby="ship-note"
                        onClick={() => openAction('ship')}
                        className={`${BUTTON} ${SECONDARY} disabled:cursor-not-allowed`}
                    >
                        {shipLabel}
                    </button>
                    <p id="ship-note" className="text-sm text-gray-600">{shipReason ?? text.shipHint}</p>
                </div>
                {/* The actions for a reservation Vipps ended. Each button keeps its own reason under it, so more fit in the row. */}
                <div className="flex flex-wrap gap-x-6 gap-y-4 border-t border-gray-100 pt-4">
                    <div className="max-w-sm space-y-1">
                        <button
                            type="button"
                            disabled={busy || releaseReason !== null}
                            aria-describedby="release-note"
                            onClick={() => openAction('release')}
                            className={`${BUTTON} ${SECONDARY} disabled:cursor-not-allowed`}
                        >
                            {text.releaseBuild}
                        </button>
                        <p id="release-note" className="text-sm text-gray-600">{releaseReason ?? text.releaseHint}</p>
                    </div>
                    <div className="max-w-sm space-y-1">
                        <button
                            type="button"
                            disabled={busy || paymentLinkReason !== null}
                            aria-describedby="payment-link-note"
                            onClick={() => openAction('paymentLink')}
                            className={`${BUTTON} ${SECONDARY} disabled:cursor-not-allowed`}
                        >
                            {text.sendPaymentLink}
                        </button>
                        <p id="payment-link-note" className="text-sm text-gray-600">{paymentLinkReason ?? text.paymentLinkHint}</p>
                        {paymentLinkSent && <p className="text-sm font-semibold text-gray-900">{paymentLinkSent}</p>}
                    </div>
                </div>
            </section>

            <section aria-labelledby="invoice-heading" className="space-y-3 rounded-2xl border border-gray-200 p-5">
                <h2 id="invoice-heading" className="font-bold text-gray-900">{text.invoiceDetails}</h2>
                <p className="text-sm text-gray-600">{text.invoiceNote}</p>
                <p className="text-sm text-gray-600">{text.settlementNote}</p>
                <div className="divide-y divide-gray-100">
                    {invoiceDetails(order, dict).map(detail => (
                        <CopyField key={detail.key} label={detail.label} value={detail.value} />
                    ))}
                </div>
                {order.refunds.length > 0 && (
                    <div className="space-y-1 border-t border-gray-100 pt-3">
                        <h3 className="text-sm font-semibold text-gray-900">{text.refunds}</h3>
                        <p className="text-sm text-gray-600">{text.creditNoteNote}</p>
                        <div className="divide-y divide-gray-100">
                            {order.refunds.map((refund, index) => (
                                <CopyField
                                    key={`${refund.refundedAt}-${index}`}
                                    label={fillTemplate(text.refundRow, { number: String(index + 1), date: osloDate(refund.refundedAt) })}
                                    value={kroner(refund.amountInOre)}
                                />
                            ))}
                        </div>
                    </div>
                )}
                <form
                    className="flex flex-wrap items-end gap-3 pt-2"
                    onSubmit={e => {
                        e.preventDefault();
                        void saveInvoiceNumber();
                    }}
                >
                    <div className="min-w-48 flex-1">
                        <TextInput label={text.invoiceNumber} maxLength={MAX_INVOICE_NUMBER} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                    </div>
                    <button type="submit" disabled={savingInvoice} className={`${BUTTON} ${PRIMARY}`}>
                        {savingInvoice ? dict.common.saving : dict.common.save}
                    </button>
                </form>
            </section>

            {pending && (
                <ConfirmDialog
                    title={pending.title}
                    message={pending.confirm}
                    confirmLabel={pending.label}
                    cancelLabel={dict.common.cancel}
                    busy={busy}
                    confirmDisabled={(pending.action === 'refund' && refundIssue !== null) || (pending.action === 'ship' && noteTooLong)}
                    onConfirm={() => void (pending.action === 'ship' ? ship() : run(pending.action))}
                    onClose={() => setConfirming(null)}
                >
                    {pending.action === 'refund' && (
                        <TextInput
                            label={text.refundAmount}
                            inputMode="decimal"
                            autoComplete="off"
                            value={refundAmount}
                            onChange={e => {
                                setRefundAmount(e.target.value);
                                setApiRefusedAmount(false);
                            }}
                            error={refundIssue ? fillTemplate(text.refundValidation[refundIssue], { max: formatOre(remaining, locale) }) : undefined}
                        />
                    )}
                    {pending.action === 'ship' && (
                        <TextArea
                            label={text.shippingNote}
                            value={shippingNote}
                            onChange={e => {
                                setShippingNote(e.target.value);
                                setApiRefusedNote(false);
                            }}
                            error={noteTooLong ? fillTemplate(text.validation.tooLong, { max: String(MAX_SHIPPING_NOTE) }) : undefined}
                        />
                    )}
                </ConfirmDialog>
            )}
        </div>
    );
}
