"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@sjolystinnovation/app-kit/toast';
import { Alert } from '@sjolystinnovation/app-kit/ui';
import ShopService, { type AdminOrderSummary } from '@/services/shopService';
import { localeHref } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { formatOre } from '@/lib/format';
import { captureWarning, isPartlyRefunded, osloDate } from '@/lib/shop';

export default function AdminOrdersPage() {
    const { locale, dict } = useDictionary();
    const text = dict.admin.shop;
    const [orders, setOrders] = useState<AdminOrderSummary[] | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        let current = true;
        ShopService.getOrders()
            .then(loaded => {
                if (current) setOrders([...loaded].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
            })
            .catch(err => {
                if (!current) return;
                setLoadFailed(true);
                toast.error(err instanceof Error ? err.message : text.ordersLoadFailed);
            });
        return () => { current = false; };
    }, [text.ordersLoadFailed]);

    if (!orders && loadFailed) return <Alert variant="error">{text.ordersLoadFailed}</Alert>;

    if (!orders) {
        return <div className="py-10 text-center text-gray-500">{dict.common.loading}</div>;
    }

    if (orders.length === 0) {
        return <div className="py-10 text-center text-gray-500">{text.noOrders}</div>;
    }

    const now = new Date();
    const cell = 'px-3 py-3 align-top';

    return (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-sm text-gray-900">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                        <th className={cell}>{text.columns.status}</th>
                        <th className={cell}>{text.columns.buyer}</th>
                        <th className={cell}>{text.columns.build}</th>
                        <th className={cell}>{text.columns.delivery}</th>
                        <th className={cell}>{text.columns.total}</th>
                        <th className={cell}>{text.columns.deadline}</th>
                        <th className={cell}>{text.columns.invoice}</th>
                        <th className={cell}><span className="sr-only">{text.openOrder}</span></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {orders.map(order => {
                        const warning = captureWarning(order.captureGuaranteedUntil, now);
                        return (
                            <tr key={order.id}>
                                <td className={cell}>
                                    <span>{text.statuses[order.status]}</span>
                                    {isPartlyRefunded(order) && (
                                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{text.partlyRefunded}</span>
                                    )}
                                    {order.isTest && (
                                        <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">{text.test}</span>
                                    )}
                                </td>
                                <td className={cell}>{order.buyerName}</td>
                                <td className={cell}>{order.buildTitle}</td>
                                <td className={cell}>{text.methods[order.deliveryMethod]}</td>
                                <td className={cell}>{formatOre(order.totalInOre, locale)}</td>
                                <td className={cell}>
                                    {order.captureGuaranteedUntil === null ? text.unknown : osloDate(order.captureGuaranteedUntil)}
                                    {order.status === 'Reserved' && warning === 'soon' && (
                                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{text.soon}</span>
                                    )}
                                </td>
                                <td className={cell}>{order.invoiceNumber}</td>
                                <td className={cell}>
                                    <Link href={localeHref(locale, `/admin/shop/orders/${order.id}`)} className="font-semibold text-gray-900 underline">
                                        {text.openOrder}
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
