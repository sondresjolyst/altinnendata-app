import { describe, it, expect } from 'vitest';
import { canBuy, captureWarning, invoiceDetails, missingInvoiceNumber, isBuyable, lacksConditions, osloDate, osloDateTime, osloTime, refundAmountIssue, remainingInOre } from '@/lib/shop';
import { getDictionary } from '@/i18n/dictionaries';
import type { AdminOrder } from '@/services/shopService';

const no = getDictionary('no');
const en = getDictionary('en');

const order: AdminOrder = {
    id: 7,
    reference: 'AID-000007-1A2B3C4D',
    status: 'Paid',
    locale: 'no',
    buyerName: 'Kari Nordmann',
    buyerEmail: 'kari@example.no',
    buyerPhone: '4791234567',
    streetAddress: 'Storgata 1',
    postalCode: '0155',
    city: 'Oslo',
    deliveryMethod: 'Shipping',
    deliveryLabel: 'Sending',
    deliveryPriceInOre: 30000,
    withinDistanceConfirmed: false,
    pickupNote: null,
    pcBuildId: 3,
    buildTitle: 'Spillmaskin',
    buildSlug: 'spillmaskin',
    buildPriceInOre: 999000,
    totalInOre: 1299000,
    capturedInOre: 1299000,
    refundedInOre: 0,
    isTest: false,
    captureGuaranteedUntil: '2026-10-25T10:00:00Z',
    invoiceNumber: null,
    termsVersion: null,
    termsAcceptedIp: null,
    confirmationSentAt: null,
    shippedAt: null,
    shippingNote: null,
    termsAcceptedAt: '2026-10-18T10:00:00Z',
    authorizedAt: '2026-10-18T10:05:00Z',
    capturedAt: '2026-10-20T08:00:00Z',
    cancelledAt: null,
    refundedAt: null,
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-20T08:00:00Z',
    refunds: [],
    deliveryDate: null,
    deliveryPlace: 'Storgata 1, 0155 Oslo',
    reservationEndedAt: null,
    holdsBuild: false,
    releaseBuildBlockedReason: 'wrongStatus',
    paymentLinkSentAt: null,
    paymentLinkExpiresAt: null,
    paymentLinkBlockedReason: 'wrongStatus',
    vippsReferences: [],
};

const pickupOrder: AdminOrder = {
    ...order,
    status: 'Reserved',
    deliveryMethod: 'Pickup',
    deliveryLabel: 'Henting',
    deliveryPriceInOre: 0,
    streetAddress: null,
    postalCode: null,
    city: null,
    totalInOre: 999000,
    capturedAt: null,
};

describe('osloDate', () => {
    it('gives dd.mm.yyyy in Oslo time', () => {
        expect(osloDate('2026-10-18T23:30:00Z')).toBe('19.10.2026');
        expect(osloDate('2026-01-05T10:00:00Z')).toBe('05.01.2026');
    });
});

describe('captureWarning', () => {
    const now = new Date('2026-10-18T12:00:00Z');

    it('is unknown without a date', () => {
        expect(captureWarning(null, now)).toBe('unknown');
    });

    it('is soon under 48 hours left and when past', () => {
        expect(captureWarning('2026-10-20T11:00:00Z', now)).toBe('soon');
        expect(captureWarning('2026-10-17T11:00:00Z', now)).toBe('soon');
    });

    it('is ok with 48 hours or more left', () => {
        expect(captureWarning('2026-10-20T13:00:00Z', now)).toBe('ok');
        expect(captureWarning('2026-10-20T12:00:00Z', now)).toBe('ok');
    });
});

describe('invoiceDetails', () => {
    it('leaves out the address and the captured date for a reserved pickup order', () => {
        expect(invoiceDetails(pickupOrder, no).map(d => d.key)).toEqual(['name', 'email', 'phone', 'line1', 'line1Amount', 'line2', 'line2Amount', 'total', 'orderDate', 'reservedDate', 'deliveryPlace', 'reference', 'vat']);
    });

    it('adds the address and the captured date for a paid shipping order', () => {
        const details = invoiceDetails(order, no);
        expect(details.map(d => d.key)).toEqual(['name', 'email', 'phone', 'address', 'line1', 'line1Amount', 'line2', 'line2Amount', 'total', 'orderDate', 'reservedDate', 'capturedDate', 'deliveryPlace', 'reference', 'vat']);
        expect(details.find(d => d.key === 'capturedDate')?.value).toBe('20.10.2026');
        expect(details.find(d => d.key === 'address')?.value).toBe('Storgata 1, 0155 Oslo');
        expect(details.find(d => d.key === 'line1')?.value).toBe('Spillmaskin');
        expect(details.find(d => d.key === 'line1Amount')?.value).toBe('9990,00');
        expect(details.find(d => d.key === 'line2')?.value).toBe('Sending');
        expect(details.find(d => d.key === 'line2Amount')?.value).toBe('300,00');
        expect(details.find(d => d.key === 'total')?.value).toBe('12990,00');
        expect(details.find(d => d.key === 'orderDate')?.value).toBe('18.10.2026');
        expect(details.find(d => d.key === 'reference')?.value).toBe('AID-000007-1A2B3C4D');
    });

    it('takes the order date from the creation', () => {
        const details = invoiceDetails({ ...order, authorizedAt: '2026-10-19T10:05:00Z' }, no);
        expect(details.find(d => d.key === 'orderDate')?.value).toBe('18.10.2026');
        expect(details.find(d => d.key === 'reservedDate')?.value).toBe('19.10.2026');
    });

    it('copies the phone as a plain eight digit number', () => {
        expect(invoiceDetails(order, no).find(d => d.key === 'phone')?.value).toBe('91234567');
        expect(invoiceDetails({ ...order, buyerPhone: '91234567' }, no).find(d => d.key === 'phone')?.value).toBe('91234567');
    });

    it('leaves out the reserved date when the payment was never reserved', () => {
        expect(invoiceDetails({ ...order, authorizedAt: null }, no).some(d => d.key === 'reservedDate')).toBe(false);
    });

    it('says the seller is not VAT registered in both languages', () => {
        expect(invoiceDetails(order, no).find(d => d.key === 'vat')?.value).toBe('Ikke registrert i Merverdiavgiftsregisteret.');
        expect(invoiceDetails(order, en).find(d => d.key === 'vat')?.value).toBe('Not registered in the VAT Register.');
    });

    it('shows the order number, and the latest Vipps reference as its own row when the API gives one', () => {
        const without = invoiceDetails(order, no);
        expect(without.find(d => d.key === 'reference')).toMatchObject({ label: 'Ordrenummer', value: order.reference });
        expect(without.some(d => d.key === 'vippsReference')).toBe(false);

        const vippsReferences = [
            { reference: `${order.reference}-1`, state: 'ABORTED', createdAt: '2026-10-18T10:00:00Z' },
            { reference: `${order.reference}-2`, state: 'AUTHORIZED', createdAt: '2026-10-19T10:00:00Z' },
        ];
        const keys = invoiceDetails({ ...order, vippsReferences }, no).map(d => d.key);
        expect(invoiceDetails({ ...order, vippsReferences }, no).find(d => d.key === 'vippsReference'))
            .toMatchObject({ label: 'Vipps-referanse', value: `${order.reference}-2` });
        expect(keys.indexOf('vippsReference')).toBe(keys.indexOf('reference') + 1);
    });
});

describe('canBuy', () => {
    it('follows the buy button mode and the visitor roles', () => {
        expect(canBuy('Off', ['Admin'])).toBe(false);
        expect(canBuy('AdminsOnly', [])).toBe(false);
        expect(canBuy('AdminsOnly', ['Admin'])).toBe(true);
        expect(canBuy('Everyone', [])).toBe(true);
        expect(canBuy(undefined, ['Admin'])).toBe(false);
    });
});

describe('isBuyable', () => {
    const build = { availability: 'Available', priceNok: 9990, published: true, allPartsHaveCondition: true };

    it('needs an available, priced and published build with a condition on every part', () => {
        expect(isBuyable({ ...build, allPartsHaveCondition: false } as never)).toBe(false);
        expect(isBuyable(build as never)).toBe(true);
        expect(isBuyable({ ...build, availability: 'Reserved' } as never)).toBe(false);
        expect(isBuyable({ ...build, availability: 'Sold' } as never)).toBe(false);
        expect(isBuyable({ ...build, priceNok: null } as never)).toBe(false);
        expect(isBuyable({ ...build, published: false } as never)).toBe(false);
    });
});

describe('lacksConditions', () => {
    const build = { availability: 'Available', priceNok: 9990, published: true, allPartsHaveCondition: false };

    it('is true only for a build that would be for sale but for a part without a condition', () => {
        expect(lacksConditions(build as never)).toBe(true);
        expect(lacksConditions({ ...build, allPartsHaveCondition: true } as never)).toBe(false);
        expect(lacksConditions({ ...build, availability: 'Reserved' } as never)).toBe(false);
        expect(lacksConditions({ ...build, priceNok: null } as never)).toBe(false);
        expect(lacksConditions({ ...build, published: false } as never)).toBe(false);
    });
});

describe('remainingInOre', () => {
    it('is what was captured less what was refunded', () => {
        expect(remainingInOre({ capturedInOre: 1299000, refundedInOre: 300000 })).toBe(999000);
        expect(remainingInOre({ capturedInOre: 0, refundedInOre: 0 })).toBe(0);
    });
});

describe('refundAmountIssue', () => {
    it('names what is wrong with the typed amount', () => {
        expect(refundAmountIssue('', 1000)).toBe('required');
        expect(refundAmountIssue('  ', 1000)).toBe('required');
        expect(refundAmountIssue('x', 1000)).toBe('invalid');
        expect(refundAmountIssue('0', 1000)).toBe('tooLow');
        expect(refundAmountIssue('0,00', 1000)).toBe('tooLow');
        expect(refundAmountIssue('10,01', 1000)).toBe('tooHigh');
        expect(refundAmountIssue('10', 1000)).toBeNull();
        expect(refundAmountIssue('0,01', 1000)).toBeNull();
    });
});

describe('invoiceDetails after a refund', () => {
    it('adds the refunded total after the captured date, with no single refund date', () => {
        const details = invoiceDetails({ ...order, status: 'Refunded', refundedInOre: 1299000, refundedAt: '2026-10-21T08:00:00Z' }, no);
        const keys = details.map(d => d.key);
        expect(keys.slice(keys.indexOf('capturedDate'), keys.indexOf('deliveryPlace'))).toEqual(['capturedDate', 'refunded']);
        expect(details.find(d => d.key === 'refunded')).toMatchObject({ label: 'Totalt tilbakebetalt', value: '12990,00' });
        expect(keys).not.toContain('refundedDate');
        expect(invoiceDetails({ ...order, refundedInOre: 1299000 }, en).find(d => d.key === 'refunded')?.label).toBe('Total refunded');
    });

    it('adds the amount for a partial refund and nothing before any refund', () => {
        expect(invoiceDetails({ ...order, refundedInOre: 300000 }, no).map(d => d.key)).toContain('refunded');
        expect(invoiceDetails(order, no).some(d => d.key === 'refunded')).toBe(false);
    });
});

describe('invoiceDetails delivery', () => {
    it('gives Leveringsdato on the Oslo calendar and Leveringssted before the reference', () => {
        const details = invoiceDetails({ ...order, deliveryDate: '2026-10-21T22:30:00Z' }, no);
        const keys = details.map(d => d.key);
        expect(keys.slice(keys.indexOf('deliveryDate'), keys.indexOf('reference'))).toEqual(['deliveryDate', 'deliveryPlace']);
        expect(details.find(d => d.key === 'deliveryDate')).toMatchObject({ label: 'Leveringsdato', value: '22.10.2026' });
        expect(details.find(d => d.key === 'deliveryPlace')).toMatchObject({ label: 'Leveringssted', value: 'Storgata 1, 0155 Oslo' });
        expect(invoiceDetails({ ...order, deliveryDate: '2026-10-21T08:00:00Z' }, en).find(d => d.key === 'deliveryDate')?.label).toBe('Delivery date');
    });

    it('leaves out the delivery date until the order is sent, and an empty place', () => {
        const keys = invoiceDetails({ ...order, deliveryPlace: '' }, no).map(d => d.key);
        expect(keys).not.toContain('deliveryDate');
        expect(keys).not.toContain('deliveryPlace');
    });
});

describe('missingInvoiceNumber', () => {
    const now = new Date('2026-11-04T08:00:00Z');
    const paid = { status: 'Paid' as const, invoiceNumber: null, capturedAt: '2026-10-21T08:00:00Z' };

    it('flags a paid order with no invoice number from 14 days after the capture', () => {
        expect(missingInvoiceNumber(paid, now)).toBe(true);
        expect(missingInvoiceNumber({ ...paid, capturedAt: '2026-10-21T08:00:01Z' }, now)).toBe(false);
    });

    it('does not flag an order with an invoice number, another status or no capture date', () => {
        expect(missingInvoiceNumber({ ...paid, invoiceNumber: '1001' }, now)).toBe(false);
        expect(missingInvoiceNumber({ ...paid, status: 'Refunded' }, now)).toBe(false);
        expect(missingInvoiceNumber({ ...paid, capturedAt: null }, now)).toBe(false);
    });
});

describe('osloTime', () => {
    it('shows an instant as hours and minutes on the Oslo clock, summer and winter', () => {
        expect(osloTime('2026-10-20T14:32:08Z')).toBe('16:32');
        expect(osloTime('2026-12-31T23:05:00Z')).toBe('00:05');
    });
});

describe('osloDateTime', () => {
    it('shows an instant as date and time on the Oslo clock, summer and winter', () => {
        expect(osloDateTime('2026-10-20T14:32:08.678406Z')).toBe('20.10.2026 16:32:08');
        expect(osloDateTime('2026-12-31T23:30:00Z')).toBe('01.01.2027 00:30:00');
    });

    it('returns anything that is not a date as it is', () => {
        expect(osloDateTime('v2')).toBe('v2');
    });
});
