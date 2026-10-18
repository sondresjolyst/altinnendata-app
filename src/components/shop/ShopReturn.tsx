"use client";

import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentReturn, formatNok, usePollUntilFinal, type PaymentReturnState } from '@sjolystinnovation/app-kit/payments';
import { localeHref, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
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
    if (loadFailed || (loading && !order)) state = 'pending';
    else if (!order) state = 'failed';
    else if (order.status === 'Reserved' || order.status === 'Paid') state = 'success';
    else if (order.status === 'Pending') state = 'pending';
    else state = 'failed';

    const builds = localeHref(locale, '/builds');
    return (
        <PaymentReturn
            state={state}
            success={{
                title: text.success.title,
                body: text.success.body.replace('{total}', formatNok(order?.totalInOre ?? 0)).replace('{build}', order?.buildTitle ?? ''),
                note: text.success.note.replace('{reference}', order?.reference ?? ''),
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
