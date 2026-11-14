import { getConsent } from '@sjolystinnovation/app-kit/consent';
import { COMPANY } from '@/lib/company';
import { CONSENT_OPTIONS } from '@/lib/consent';
import { readCookie } from '@/lib/cookies';

/**
 * The ad identifiers sent with a checkout, so the API can report the purchase to Meta and TikTok from the server.
 * Every field but consentId is left out when it is missing or would break the API's rules, since the API drops the
 * whole object over one bad field.
 */
export interface CheckoutMarketing {
    consentId: string;
    fbp?: string;
    fbc?: string;
    ttp?: string;
    ttclid?: string;
    pageUrl?: string;
}

const MAX_COOKIE_LENGTH = 256;
const MAX_TTCLID_LENGTH = 1000;
const MAX_PAGE_URL_LENGTH = 2048;

/** Printable ASCII without spaces, the API's rule for every identifier. */
const PRINTABLE = /^[\x21-\x7e]+$/;

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The value when it meets the API's rule for an identifier of at most `max` characters, otherwise undefined. */
export function adToken(value: string | undefined, max: number): string | undefined {
    return value !== undefined && value.length <= max && PRINTABLE.test(value) ? value : undefined;
}

/**
 * The page without its query and hash, so a click ID or the buyer's email in the query never leaves the browser.
 * Undefined unless it is https on the site's own host with the default port, as the API demands.
 */
export function checkoutPageUrl(href: string): string | undefined {
    let url: URL;
    try {
        url = new URL(href);
    } catch {
        return undefined;
    }
    if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.port !== '') return undefined;
    if (url.hostname !== new URL(COMPANY.url).hostname) return undefined;
    const page = `${url.origin}${url.pathname}`;
    return page.length <= MAX_PAGE_URL_LENGTH ? page : undefined;
}

/**
 * What the checkout sends for marketing, or undefined when the visitor has not accepted marketing under the current
 * notice. The API checks the consent log for the same consentId before it uses any of it.
 *
 * fbc is only the `_fbc` cookie that the Meta Pixel sets. When it is missing, fbc is left out, even when the landing
 * page had an fbclid, so the site never builds the value itself.
 */
export function checkoutMarketing(): CheckoutMarketing | undefined {
    const consent = getConsent(CONSENT_OPTIONS);
    const consentId = consent.record?.consentId;
    if (consent.marketing !== true || typeof consentId !== 'string' || !GUID.test(consentId) || /^[0-]+$/.test(consentId)) {
        return undefined;
    }

    const fbp = adToken(readCookie('_fbp'), MAX_COOKIE_LENGTH);
    const fbc = adToken(readCookie('_fbc'), MAX_COOKIE_LENGTH);
    const ttp = adToken(readCookie('_ttp'), MAX_COOKIE_LENGTH);
    const ttclid = adToken(readCookie('ttclid'), MAX_TTCLID_LENGTH);
    const pageUrl = checkoutPageUrl(window.location.href);

    return {
        consentId,
        ...(fbp !== undefined && { fbp }),
        ...(fbc !== undefined && { fbc }),
        ...(ttp !== undefined && { ttp }),
        ...(ttclid !== undefined && { ttclid }),
        ...(pageUrl !== undefined && { pageUrl }),
    };
}
