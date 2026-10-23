import { kroner, parseKroner } from '@sjolystinnovation/app-kit/payments';
import type { Dictionary } from '@/i18n/dictionaries';
import { ADMIN_ROLE } from '@/lib/roles';
import type { BuildDetail } from '@/services/buildService';
import type { AdminOrder, AdminOrderSummary, BuyButtonMode } from '@/services/shopService';

const HOUR = 60 * 60 * 1000;
const SOON_HOURS = 48;

/** Whether the buy button shows for a visitor with `roles`. A missing mode, such as a failed config fetch, means no. */
export function canBuy(mode: BuyButtonMode | undefined, roles: readonly string[]): boolean {
    if (mode === 'Everyone') return true;
    return mode === 'AdminsOnly' && roles.includes(ADMIN_ROLE);
}

/** Whether the build can be sold now. The API checks the same again when the buyer pays. */
export function isBuyable(build: BuildDetail): boolean {
    return build.availability === 'Available' && build.priceNok != null && build.published && build.allPartsHaveCondition;
}

/** Whether the build would be for sale but for a part without a condition. */
export function lacksConditions(build: BuildDetail): boolean {
    return build.availability === 'Available' && build.priceNok != null && build.published && !build.allPartsHaveCondition;
}

const osloFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', day: '2-digit', month: '2-digit', year: 'numeric' });

/** An ISO instant as dd.mm.yyyy on the Oslo calendar. */
export function osloDate(iso: string): string {
    const part = (type: Intl.DateTimeFormatPartTypes) => osloFormat.formatToParts(new Date(iso)).find(p => p.type === type)?.value ?? '';
    return `${part('day')}.${part('month')}.${part('year')}`;
}

const osloTimeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

/** An ISO instant as dd.mm.yyyy HH:mm:ss on the Oslo clock. Anything that is not a date comes back as it is. */
export function osloDateTime(iso: string): string {
    if (Number.isNaN(new Date(iso).getTime())) return iso;
    return `${osloDate(iso)} ${osloTimeFormat.format(new Date(iso))}`;
}

const osloClockFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** An ISO instant as HH:mm on the Oslo clock. */
export function osloTime(iso: string): string {
    return osloClockFormat.format(new Date(iso));
}

/** How near the date is that Vipps guarantees a capture until. Under 48 hours left, or past, is soon. */
export function captureWarning(until: string | null, now: Date): 'unknown' | 'soon' | 'ok' {
    if (until === null) return 'unknown';
    return new Date(until).getTime() - now.getTime() < SOON_HOURS * HOUR ? 'soon' : 'ok';
}

/** What is left to refund on a paid order, in øre. */
export function remainingInOre(order: Pick<AdminOrder, 'capturedInOre' | 'refundedInOre'>): number {
    return order.capturedInOre - order.refundedInOre;
}

/** Whether part of the captured amount, but not all of it, has been paid back. */
export function isPartlyRefunded(order: Pick<AdminOrder, 'capturedInOre' | 'refundedInOre'>): boolean {
    return order.refundedInOre > 0 && order.refundedInOre < order.capturedInOre;
}

export type RefundAmountIssue = 'required' | 'invalid' | 'tooLow' | 'tooHigh';

/** What is wrong with a typed refund amount, the way the API checks it: more than 0 and at most what is left. */
export function refundAmountIssue(typed: string, remaining: number): RefundAmountIssue | null {
    if (typed.trim() === '') return 'required';
    const ore = parseKroner(typed);
    if (ore === null) return 'invalid';
    if (ore < 1) return 'tooLow';
    return ore > remaining ? 'tooHigh' : null;
}

export interface InvoiceDetail {
    key: string;
    label: string;
    value: string;
}

/** Street, then postal code and city, on one line. Empty parts are left out. */
export function formatAddress(order: Pick<AdminOrder, 'streetAddress' | 'postalCode' | 'city'>): string {
    const place = [order.postalCode, order.city].filter(Boolean).join(' ');
    return [order.streetAddress, place].filter(Boolean).join(', ');
}

/** The phone as an invoice form wants it: the stored 10 digit number without the 47 country code. */
export function plainPhone(stored: string): string {
    return /^47\d{8}$/.test(stored) ? stored.slice(2) : stored;
}

const INVOICE_DUE_DAYS = 14;

/** Whether a paid order still has no invoice number 14 days after the capture. */
export function missingInvoiceNumber(order: Pick<AdminOrderSummary, 'status' | 'invoiceNumber' | 'capturedAt'>, now: Date): boolean {
    if (order.status !== 'Paid' || order.invoiceNumber || !order.capturedAt) return false;
    return now.getTime() - new Date(order.capturedAt).getTime() >= INVOICE_DUE_DAYS * 24 * HOUR;
}

/** The facts to type into an invoice for the order, in the order an invoice asks for them. */
export function invoiceDetails(order: AdminOrder, dict: Dictionary): InvoiceDetail[] {
    const text = dict.admin.shop;
    const labels = text.invoiceFields;
    const details: InvoiceDetail[] = [
        { key: 'name', label: labels.name, value: order.buyerName },
        { key: 'email', label: labels.email, value: order.buyerEmail },
        { key: 'phone', label: labels.phone, value: plainPhone(order.buyerPhone) },
    ];

    if (order.deliveryMethod !== 'Pickup') {
        details.push({ key: 'address', label: labels.address, value: formatAddress(order) });
    }

    details.push(
        { key: 'line1', label: labels.line1, value: order.buildTitle },
        { key: 'line1Amount', label: labels.line1Amount, value: kroner(order.buildPriceInOre) },
        { key: 'line2', label: labels.line2, value: order.deliveryLabel },
        { key: 'line2Amount', label: labels.line2Amount, value: kroner(order.deliveryPriceInOre) },
        { key: 'total', label: labels.total, value: kroner(order.totalInOre) },
        { key: 'orderDate', label: labels.orderDate, value: osloDate(order.createdAt) },
    );

    if (order.authorizedAt) details.push({ key: 'reservedDate', label: labels.reservedDate, value: osloDate(order.authorizedAt) });

    if (order.capturedAt) details.push({ key: 'capturedDate', label: labels.capturedDate, value: osloDate(order.capturedAt) });

    if (order.refundedInOre > 0) details.push({ key: 'refunded', label: labels.refunded, value: kroner(order.refundedInOre) });

    if (order.deliveryDate) details.push({ key: 'deliveryDate', label: labels.deliveryDate, value: osloDate(order.deliveryDate) });

    if (order.deliveryPlace) details.push({ key: 'deliveryPlace', label: labels.deliveryPlace, value: order.deliveryPlace });

    details.push(
        { key: 'reference', label: labels.reference, value: order.reference },
    );

    const vippsReference = order.vippsReferences?.at(-1)?.reference;
    if (vippsReference) details.push({ key: 'vippsReference', label: labels.vippsReference, value: vippsReference });

    details.push({ key: 'vat', label: dict.admin.shop.vatLabel, value: text.vatNote });
    return details;
}
