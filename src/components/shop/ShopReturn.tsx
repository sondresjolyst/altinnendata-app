"use client";

import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentReturn, usePollUntilFinal, type PaymentReturnState } from '@sjolystinnovation/app-kit/payments';
import { localeHref, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { fillTemplate, formatOre } from '@/lib/format';
import ShopService, { type OrderStatusInfo } from '@/services/shopService';

const isFinal = (order: OrderStatusInfo | null) => order === null || order.status !== 'Pending';

/** What the buyer sees on coming back from Vipps. It polls the order until Vipps has answered. */
export default function ShopReturn({ locale }: { locale: Locale }) {
    const token = useSearchParams().get('token');
    const text = getDictionary(locale).shop.return;
    const [loadFailed, setLoadFailed] = useState(false);

    const fetcher = useCallback(async () => {
        if (!token) return null;
        try {
            const order = await ShopService.orderStatus(token);
            setLoadFailed(false);
            return order;
        } catch (error) {
            setLoadFailed(true);
            throw error;
        }
    }, [token]);
    const { data: order, loading, refresh } = usePollUntilFinal(fetcher, isFinal);

    let state: PaymentReturnState;
    if (!token) state = 'failed';
    else if (loadFailed || (loading && !order)) state = 'pending';
    else if (!order) state = 'failed';
    else if (order.status === 'Reserved' || order.status === 'Paid') state = 'success';
    else if (order.status === 'Pending') state = 'pending';
    else state = 'failed';

    const builds = localeHref(locale, '/builds');
    const done = order?.status === 'Paid' ? text.paid : text.success;
    const values = { total: formatOre(order?.totalInOre ?? 0, locale), build: order?.buildTitle ?? '', reference: order?.reference ?? '' };
    return (
        <PaymentReturn
            state={state}
            success={{
                title: done.title,
                body: fillTemplate(done.body, values),
                note: fillTemplate(done.note, values),
                href: builds,
                cta: text.toBuilds,
            }}
            pending={{ title: text.pending.title, body: text.pending.body, href: localeHref(locale, '/contact'), cta: text.pending.cta }}
            failed={{ title: text.failed.title, body: text.failed.body, href: builds, cta: text.toBuilds }}
            onRefresh={refresh}
            refreshLabel={text.pending.refresh}
        />
    );
}
