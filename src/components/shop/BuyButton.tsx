"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { localeHref, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { canBuy, isBuyable } from '@/lib/shop';
import type { BuildDetail } from '@/services/buildService';
import type { BuyButtonMode } from '@/services/shopService';

interface BuyButtonProps {
    build: BuildDetail;
    mode: BuyButtonMode | undefined;
    /** Whether the shop offers at least one delivery option. Without one the checkout cannot be completed. */
    hasDelivery: boolean;
    locale: Locale;
}

/** The link to the checkout page. It shows only when the build can be sold and the shop is open to this visitor. */
export default function BuyButton({ build, mode, hasDelivery, locale }: BuyButtonProps) {
    const { data: session } = useSession();
    const roles = session?.user?.roles ?? [];

    if (!hasDelivery || !isBuyable(build) || !canBuy(mode, roles)) return null;

    return (
        <Link
            href={localeHref(locale, `/builds/${build.slug}/buy`)}
            className="rounded-lg border border-gray-900 bg-gray-900 text-white font-semibold px-6 py-3 hover:bg-gray-800 transition"
        >
            {getDictionary(locale).shop.buy}
        </Link>
    );
}
