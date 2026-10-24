"use client";

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentReturn, usePollUntilFinal, type PaymentReturnState } from '@sjolystinnovation/app-kit/payments';
import { localeHref, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { formatOre } from '@/lib/format';
import { fillTemplate } from '@sjolystinnovation/app-kit/ui';
import { useConsent } from '@sjolystinnovation/app-kit/consent';
import { trackPurchaseOnce } from '@/lib/pixelEvents';
import { CONSENT_OPTIONS } from '@/lib/consent';
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
    const { marketing } = useConsent(CONSENT_OPTIONS);

    // A Meta Pixel Purchase once the payment is reserved or taken, once per order in this browser.
    useEffect(() => {
        if (!marketing || !order || (order.status !== 'Reserved' && order.status !== 'Paid')) return;
        // The layout's MetaPixel loads the pixel in an effect of the same commit, which runs after this one.
        const timer = setTimeout(() => trackPurchaseOnce(order), 0);
        return () => clearTimeout(timer);
    }, [marketing, order]);

    let state: PaymentReturnState;
    if (!token) state = 'failed';
    else if (loadFailed || (loading && !order)) state = 'pending';
    else if (!order) state = 'failed';
    else if (order.status === 'Reserved' || order.status === 'Paid') state = 'success';
    else if (order.status === 'Pending') state = 'pending';
    else state = 'failed';
    const ended = order?.status === 'Refunded' ? text.refunded : text.failed;

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
            failed={{ title: ended.title, body: ended.body, href: builds, cta: text.toBuilds }}
            onRefresh={refresh}
            refreshLabel={text.pending.refresh}
        />
    );
}
