"use client";

import { useEffect, useState } from 'react';
import { apiFieldErrors } from '@sjolystinnovation/app-kit/api';
import { toast } from '@sjolystinnovation/app-kit/toast';
import { Alert, TextInput } from '@sjolystinnovation/app-kit/ui';
import ShopService, { type VatThreshold } from '@/services/shopService';
import { useDictionary } from '@/i18n/DictionaryProvider';
import type { Locale } from '@/i18n/config';
import { fillTemplate, formatOre } from '@/lib/format';
import { kroner, parseKroner } from '@/lib/shop';

// The API takes at most 10 000 000 kr for one month.
const MAX_OUTSIDE_IN_ORE = 1_000_000_000;

/** The current month in Norwegian time, as yyyy-MM. */
function currentMonth(now: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit' }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}`;
}

/** The stored sales outside the shop for the month as the amount field shows them, empty when none. */
function storedAmount(status: VatThreshold, month: string): string {
    const stored = status.months.find(row => row.month === month)?.outsideInOre ?? 0;
    return stored > 0 ? kroner(stored) : '';
}

function monthName(month: string, locale: Locale): string {
    const [year, number] = month.split('-').map(Number);
    return new Intl.DateTimeFormat(locale === 'no' ? 'nb-NO' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(year, number - 1, 1)));
}

/** Turnover over the last 12 months against the VAT threshold, and the sales outside the shop per month. */
export default function VatThresholdPanel() {
    const { dict, locale } = useDictionary();
    const text = dict.admin.vat;
    const [status, setStatus] = useState<VatThreshold | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [month, setMonth] = useState(() => currentMonth(new Date()));
    const [amount, setAmount] = useState('');
    const [errors, setErrors] = useState<{ month?: string; amount?: string }>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let current = true;
        ShopService.getVatThreshold()
            .then(loaded => {
                if (!current) return;
                setStatus(loaded);
                setAmount(storedAmount(loaded, currentMonth(new Date())));
            })
            .catch(() => {
                if (current) setLoadFailed(true);
            });
        return () => { current = false; };
    }, []);

    const save = async () => {
        const found: { month?: string; amount?: string } = {};
        if (!/^\d{4}-\d{2}$/.test(month)) found.month = text.validation.month;
        const typed = amount.trim() === '' ? 0 : parseKroner(amount);
        if (typed === null) found.amount = text.validation.amount;
        else if (typed > MAX_OUTSIDE_IN_ORE) found.amount = fillTemplate(text.validation.tooHigh, { max: formatOre(MAX_OUTSIDE_IN_ORE, locale) });
        setErrors(found);
        if (found.month || found.amount || typed === null) return;

        setSaving(true);
        try {
            setStatus(await ShopService.setOutsideSales(month, typed));
            toast.success(text.saved);
        } catch (err) {
            const fields = apiFieldErrors(err) ?? {};
            if (fields.month || fields.amountInOre) {
                setErrors({ month: fields.month ? text.validation.month : undefined, amount: fields.amountInOre ? text.validation.amount : undefined });
            } else {
                toast.error(text.saveFailed);
            }
        } finally {
            setSaving(false);
        }
    };

    const share = status && status.thresholdInOre > 0 ? Math.min(100, (status.turnoverInOre / status.thresholdInOre) * 100) : 0;
    const threshold = status ? formatOre(status.thresholdInOre, locale) : '';

    return (
        <section aria-labelledby="vat-heading" className="space-y-4 rounded-2xl border border-gray-200 p-5">
            <h2 id="vat-heading" className="font-bold text-gray-900">{text.title}</h2>
            {loadFailed && <Alert variant="error">{text.loadFailed}</Alert>}
            {!status && !loadFailed && <p className="text-sm text-gray-500">{dict.common.loading}</p>}
            {status && (
                <>
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                            <span className="text-gray-500">{text.turnover}</span>
                            <span className="tabular-nums font-semibold text-gray-900">
                                {fillTemplate(text.ofThreshold, { turnover: formatOre(status.turnoverInOre, locale), threshold })}
                            </span>
                        </div>
                        <div
                            role="meter"
                            aria-label={text.turnover}
                            aria-valuemin={0}
                            aria-valuemax={status.thresholdInOre / 100}
                            aria-valuenow={Math.min(status.turnoverInOre, status.thresholdInOre) / 100}
                            className="h-2 overflow-hidden rounded-full bg-gray-100"
                        >
                            <div className={`h-full ${status.warning || status.crossedMonth ? 'bg-amber-500' : 'bg-gray-900'}`} style={{ width: `${share}%` }} />
                        </div>
                    </div>
                    {status.crossedMonth ? (
                        <Alert variant="warning" role="status">
                            {fillTemplate(text.crossed, { threshold, month: monthName(status.crossedMonth, locale) })}
                            {status.crossingOrderReference && ` ${fillTemplate(text.crossedBy, { reference: status.crossingOrderReference })}`}
                        </Alert>
                    ) : status.warning && (
                        <Alert variant="warning" role="status">
                            {fillTemplate(text.warning, { warnFrom: formatOre(status.warnFromInOre, locale), threshold })}
                        </Alert>
                    )}

                    <form
                        className="space-y-3 border-t border-gray-100 pt-4"
                        aria-labelledby="vat-outside-heading"
                        noValidate
                        onSubmit={e => {
                            e.preventDefault();
                            void save();
                        }}
                    >
                        <h3 id="vat-outside-heading" className="text-sm font-bold text-gray-900">{text.outsideTitle}</h3>
                        <p className="text-sm text-gray-600">{text.outsideHint}</p>
                        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                            <TextInput label={text.month} type="month" value={month} error={errors.month} onChange={e => {
                                // The amount field shows what is stored for the chosen month, so the owner edits rather than adds.
                                setMonth(e.target.value);
                                setAmount(storedAmount(status, e.target.value));
                            }} />
                            <TextInput label={text.amount} inputMode="decimal" autoComplete="off" value={amount} error={errors.amount} onChange={e => setAmount(e.target.value)} />
                            <button type="submit" disabled={saving} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
                                {saving ? dict.common.saving : dict.common.save}
                            </button>
                        </div>
                    </form>

                    <table className="w-full text-sm">
                        <caption className="sr-only">{text.monthsCaption}</caption>
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <th scope="col" className="py-1 pr-2 font-semibold">{text.month}</th>
                                <th scope="col" className="py-1 pr-2 text-right font-semibold">{text.shop}</th>
                                <th scope="col" className="py-1 text-right font-semibold">{text.outside}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {status.months.map(row => (
                                <tr key={row.month}>
                                    <th scope="row" className="py-1 pr-2 text-left font-normal text-gray-700">{monthName(row.month, locale)}</th>
                                    <td className="py-1 pr-2 text-right tabular-nums">{formatOre(row.shopInOre, locale)}</td>
                                    <td className="py-1 text-right tabular-nums">{formatOre(row.outsideInOre, locale)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </section>
    );
}
