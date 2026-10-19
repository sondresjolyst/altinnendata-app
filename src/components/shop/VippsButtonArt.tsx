import type { Locale } from '@/i18n/config';

export type VippsVerb = 'pay';

// The official Vipps buttons from the Vipps MobilePay brand portal (Vipps MobilePay_Buttons_2026.zip), unaltered.
const ART: Record<VippsVerb, Record<Locale, string>> = {
    pay: { no: '/vipps/betal-med-vipps.svg', en: '/vipps/pay-with-vipps.svg' },
};

/**
 * Classes for the link or button that wraps the artwork. The guidelines allow no hover effect and no stroke,
 * so the only extra is the keyboard focus outline, drawn outside the button.
 */
export const VIPPS_BUTTON = 'inline-flex shrink-0 rounded-[5px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900';

/** Dims a Vipps button that cannot be used now. The guidelines give no disabled design. */
export const VIPPS_DISABLED = 'opacity-50 cursor-not-allowed';

/** The official Vipps button artwork. Its alt text is the button's accessible name, the same words the artwork shows. */
export default function VippsButtonArt({ verb, locale, alt }: { verb: VippsVerb; locale: Locale; alt: string }) {
    // 48 px high, like the site's other buttons. The guidelines forbid a Vipps button smaller than the rest.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={ART[verb][locale]} alt={alt} width={300} height={44} className="block h-12 w-auto" />;
}
