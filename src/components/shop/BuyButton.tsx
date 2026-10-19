"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { localeHref, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { canBuy, isBuyable } from '@/lib/shop';
import type { BuildDetail } from '@/services/buildService';
import type { BuyButtonMode } from '@/services/shopService';
import VippsButtonArt, { VIPPS_BUTTON, VIPPS_DISABLED } from './VippsButtonArt';

interface BuyButtonProps {
    build: BuildDetail;
    mode: BuyButtonMode | undefined;
    /** Whether the shop offers at least one delivery option. Without one the checkout cannot be completed. */
    hasDelivery: boolean;
    locale: Locale;
}

/**
 * The link to the checkout page. It shows when the build can be sold and the shop is open to this visitor.
 * A reserved or sold build keeps the button in its place, disabled, with a note under the button row, so the page does not move.
 * A build that can never be bought, without a price or unpublished, shows nothing.
 */
export default function BuyButton({ build, mode, hasDelivery, locale }: BuyButtonProps) {
    const { data: session } = useSession();
    const roles = session?.user?.roles ?? [];

    if (!hasDelivery || !canBuy(mode, roles) || !build.published || build.priceNok == null) return null;

    const text = getDictionary(locale).shop;

    if (isBuyable(build)) {
        return (
            <Link href={localeHref(locale, `/builds/${build.slug}/buy`)} className={VIPPS_BUTTON}>
                <VippsButtonArt verb="buyNow" locale={locale} alt={text.buy} />
            </Link>
        );
    }

    if (build.availability === 'Available') return null;

    return (
        <>
            <button type="button" disabled className={`${VIPPS_BUTTON} ${VIPPS_DISABLED}`}>
                <VippsButtonArt verb="buyNow" locale={locale} alt={text.buy} />
            </button>
            {/* order-last with a full basis puts the note on its own line under the row of buttons. */}
            <p className="order-last basis-full text-sm text-gray-700">{build.availability === 'Reserved' ? text.reserved : text.sold}</p>
        </>
    );
}
