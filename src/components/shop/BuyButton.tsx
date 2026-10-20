"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { localeHref, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { canBuy, isBuyable, lacksConditions } from '@/lib/shop';
import type { BuildDetail } from '@/services/buildService';
import type { BuyButtonMode } from '@/services/shopService';

interface BuyButtonProps {
    build: BuildDetail;
    mode: BuyButtonMode | undefined;
    /** Whether the shop offers at least one delivery option. Without one the checkout cannot be completed. */
    hasDelivery: boolean;
    locale: Locale;
}

const BUTTON = 'rounded-lg border border-gray-900 bg-gray-900 text-white font-semibold px-6 py-3 transition';

/**
 * The link to the checkout page. It shows when the build can be sold and the shop is open to this visitor.
 * A reserved or sold build, or one with a part without a condition, keeps the button in its place, disabled, with a note under
 * the button row, so the page does not move.
 * A build that can never be bought, without a price or unpublished, shows nothing.
 */
export default function BuyButton({ build, mode, hasDelivery, locale }: BuyButtonProps) {
    const { data: session } = useSession();
    const roles = session?.user?.roles ?? [];

    if (!hasDelivery || !canBuy(mode, roles) || !build.published || build.priceNok == null) return null;

    const text = getDictionary(locale).shop;

    if (isBuyable(build)) {
        return (
            <Link href={localeHref(locale, `/builds/${build.slug}/buy`)} className={`${BUTTON} hover:bg-gray-800`}>
                {text.buy}
            </Link>
        );
    }

    const note = lacksConditions(build) ? text.missingConditions : build.availability === 'Reserved' ? text.reserved : text.sold;

    return (
        <>
            <button type="button" disabled className={`${BUTTON} opacity-50 cursor-not-allowed`}>
                {text.buy}
            </button>
            {/* order-last with a full basis puts the note on its own line under the row of buttons. */}
            <p className="order-last basis-full text-sm text-gray-700">{note}</p>
        </>
    );
}
