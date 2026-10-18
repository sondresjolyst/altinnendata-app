import type { Dictionary } from '@/i18n/dictionaries';
import { ADMIN_ROLE } from '@/lib/roles';
import type { BuildDetail } from '@/services/buildService';
import type { AdminOrder, BuyButtonMode } from '@/services/shopService';

const HOUR = 60 * 60 * 1000;
const SOON_HOURS = 48;

/** Whether the buy button shows for a visitor with `roles`. A missing mode, such as a failed config fetch, means no. */
export function canBuy(mode: BuyButtonMode | undefined, roles: readonly string[]): boolean {
    if (mode === 'Everyone') return true;
    return mode === 'AdminsOnly' && roles.includes(ADMIN_ROLE);
}

/** Whether the build can be sold now. The API checks the same again when the buyer pays. */
export function isBuyable(build: BuildDetail): boolean {
    return build.availability === 'Available' && build.priceNok != null && build.published;
}

/** Øre as kroner the way an accounting system takes them: no grouping and a comma decimal. */
export function kroner(ore: number): string {
    return (ore / 100).toFixed(2).replace('.', ',');
}

const osloFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', day: '2-digit', month: '2-digit', year: 'numeric' });

/** An ISO instant as dd.mm.yyyy on the Oslo calendar. */
export function osloDate(iso: string): string {
    const part = (type: Intl.DateTimeFormatPartTypes) => osloFormat.formatToParts(new Date(iso)).find(p => p.type === type)?.value ?? '';
    return `${part('day')}.${part('month')}.${part('year')}`;
}

/** How near the date is that Vipps guarantees a capture until. Under 48 hours left, or past, is soon. */
export function captureWarning(until: string | null, now: Date): 'unknown' | 'soon' | 'ok' {
    if (until === null) return 'unknown';
    return new Date(until).getTime() - now.getTime() < SOON_HOURS * HOUR ? 'soon' : 'ok';
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

    details.push(
        { key: 'reference', label: labels.reference, value: order.reference },
        { key: 'vat', label: dict.admin.shop.vatLabel, value: text.vatNote },
    );
    return details;
}
