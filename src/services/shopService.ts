import { request } from '@sjolystinnovation/app-kit/api';
import axiosInstance from './axiosInstance';
import publicClient from './publicClient';
import { REVALIDATE_TARGETS, revalidateTarget } from '@/lib/cacheTags';

export type BuyButtonMode = 'Off' | 'AdminsOnly' | 'Everyone';
export type DeliveryMethod = 'Shipping' | 'HomeDelivery' | 'Pickup';
export type OrderStatus = 'Pending' | 'Reserved' | 'Paid' | 'Failed' | 'Cancelled' | 'Refunded';

export interface DeliveryOption {
    method: DeliveryMethod;
    enabled: boolean;
    priceNok: number;
    labelNo: string;
    labelEn: string;
    descriptionNo: string | null;
    descriptionEn: string | null;
    maxDistanceKm: number | null;
}

export interface ShopSettings {
    buyButton: BuyButtonMode;
    vippsTestMode: boolean;
    delivery: DeliveryOption[];
    termsUpdatedSinceShop: boolean;
    shopCreatedAt: string;
}

export interface PublicDeliveryOption {
    method: DeliveryMethod;
    priceNok: number;
    label: string;
    description: string | null;
    maxDistanceKm: number | null;
}

export interface ShopConfig {
    buyButton: BuyButtonMode;
    delivery: PublicDeliveryOption[];
    /** The version of the terms the buyer accepts. Checkout sends it back, and the API refuses a stale one. */
    termsVersion: string;
}

export interface CheckoutRequest {
    buildSlug: string;
    deliveryMethod: DeliveryMethod;
    name: string;
    email: string;
    phone: string;
    streetAddress: string | null;
    postalCode: string | null;
    city: string | null;
    withinDistance: boolean;
    pickupNote: string | null;
    acceptTerms: boolean;
    termsVersion: string;
    locale: string;
}

export interface CheckoutResponse {
    redirectUrl: string;
    token: string;
}

export interface OrderStatusInfo {
    status: OrderStatus;
    reference: string;
    buildTitle: string;
    totalInOre: number;
    deliveryMethod: DeliveryMethod;
}

export interface AdminOrderSummary {
    id: number;
    reference: string;
    status: OrderStatus;
    buyerName: string;
    buildTitle: string;
    pcBuildId: number | null;
    deliveryMethod: DeliveryMethod;
    totalInOre: number;
    isTest: boolean;
    captureGuaranteedUntil: string | null;
    invoiceNumber: string | null;
    capturedInOre: number;
    refundedInOre: number;
    createdAt: string;
    /** When the payment was captured. */
    capturedAt: string | null;
}

export interface VippsReferenceInfo {
    reference: string;
    state: string;
    createdAt: string;
}

export interface AdminOrder {
    id: number;
    reference: string;
    status: OrderStatus;
    locale: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    streetAddress: string | null;
    postalCode: string | null;
    city: string | null;
    deliveryMethod: DeliveryMethod;
    deliveryLabel: string;
    deliveryPriceInOre: number;
    withinDistanceConfirmed: boolean;
    pickupNote: string | null;
    pcBuildId: number | null;
    buildTitle: string;
    buildSlug: string;
    buildPriceInOre: number;
    totalInOre: number;
    capturedInOre: number;
    refundedInOre: number;
    isTest: boolean;
    captureGuaranteedUntil: string | null;
    invoiceNumber: string | null;
    termsAcceptedAt: string;
    /** The terms version the buyer accepted, or "none" when no terms page was published. */
    termsVersion: string | null;
    /** The buyer's IP address with the host part cut off, or null when unknown. */
    termsAcceptedIp: string | null;
    confirmationSentAt: string | null;
    shippedAt: string | null;
    shippingNote: string | null;
    authorizedAt: string | null;
    capturedAt: string | null;
    cancelledAt: string | null;
    refundedAt: string | null;
    createdAt: string;
    updatedAt: string;
    /** Each refund, oldest first. Each one needs a credit note in the accounts. */
    refunds: OrderRefund[];
    /** When the order was sent or made ready for pickup, the delivery date on the invoice. */
    deliveryDate: string | null;
    /** The buyer's address, or the seller's for pickup, as one line. */
    deliveryPlace: string;
    /** When Vipps ended the reservation itself, so the build stays held until the admin releases it. */
    reservationEndedAt: string | null;
    /** Whether the build is still reserved for this order. */
    holdsBuild: boolean;
    /** Why the build cannot be released from this order now, or null when it can. */
    releaseBuildBlockedReason: ReleaseBuildBlockedReason | null;
    /** When the last payment link went out to the buyer. It stays after the buyer pays. */
    paymentLinkSentAt: string | null;
    /** When the last payment link stops working. */
    paymentLinkExpiresAt: string | null;
    /** Why the admin cannot send a payment link now, or null when it can. */
    paymentLinkBlockedReason: PaymentLinkBlockedReason | null;
    /** Every Vipps payment of the order, oldest first. */
    vippsReferences: VippsReferenceInfo[];
}

export interface OrderRefund {
    amountInOre: number;
    refundedAt: string;
    source: 'Admin' | 'Webhook' | 'Polling' | 'Migrated';
}

export type ReleaseBuildBlockedReason = 'wrongStatus' | 'buildNotHeld';

export type PaymentLinkBlockedReason = 'wrongStatus' | 'buildNotHeld' | 'anonymised';

/** The order a payment link pays for, as the public pay page shows it. */
export interface PayLinkInfo {
    reference: string;
    buildTitle: string;
    totalInOre: number;
    /** When the link stops working. */
    expiresAt: string;
    locale: string;
}

export interface VatMonth {
    /** yyyy-MM */
    month: string;
    shopInOre: number;
    outsideInOre: number;
}

/** Turnover over the 12 months up to today against the VAT registration threshold. */
export interface VatThreshold {
    turnoverInOre: number;
    thresholdInOre: number;
    warnFromInOre: number;
    warning: boolean;
    /** The first day where the 12 months up to it passed the threshold, as yyyy-MM-dd. */
    crossedOn: string | null;
    /** The month of crossedOn, as yyyy-MM. */
    crossedMonth: string | null;
    /** The shop sale that passed it, or null when sales outside the shop did. */
    crossingOrderReference: string | null;
    crossedAt: string | null;
    /** Every month the current 12 month period touches, oldest first. The oldest is usually only partly counted. */
    months: VatMonth[];
}

export type ShopSettingsInput = Omit<ShopSettings, 'termsUpdatedSinceShop' | 'shopCreatedAt'>;

// Each of these changes whether the build can be sold, so the public build pages are purged.
const act = async (id: number, action: 'capture' | 'cancel' | 'refund' | 'release-build', fallback: string, body?: object) => {
    const order = await request(() => (body ? axiosInstance.post<AdminOrder>(`/admin/shop/orders/${id}/${action}`, body) : axiosInstance.post<AdminOrder>(`/admin/shop/orders/${id}/${action}`)), fallback);
    await revalidateTarget(REVALIDATE_TARGETS.builds);
    return order;
};

const ShopService = {
    getSettings: () =>
        request(() => axiosInstance.get<ShopSettings>('/admin/shop/settings'), 'Failed to load the shop settings'),

    updateSettings: async (settings: ShopSettingsInput) => {
        const saved = await request(() => axiosInstance.put<ShopSettings>('/admin/shop/settings', settings), 'Failed to save the shop settings');
        await revalidateTarget(REVALIDATE_TARGETS.shop);
        return saved;
    },

    getVatThreshold: () =>
        request(() => axiosInstance.get<VatThreshold>('/admin/shop/vat-threshold'), 'Failed to load the turnover'),

    /** Sets the sales outside the shop for one yyyy-MM month. Zero removes the month. */
    setOutsideSales: (month: string, amountInOre: number) =>
        request(() => axiosInstance.put<VatThreshold>('/admin/shop/vat-threshold/outside-sales', { month, amountInOre }), 'Failed to save the sales'),

    getOrders: () =>
        request(() => axiosInstance.get<AdminOrderSummary[]>('/admin/shop/orders'), 'Failed to load the orders'),

    getOrder: (id: number) =>
        request(() => axiosInstance.get<AdminOrder>(`/admin/shop/orders/${id}`), 'Failed to load the order'),

    capture: (id: number) => act(id, 'capture', 'Failed to capture the payment'),

    cancel: (id: number) => act(id, 'cancel', 'Failed to cancel the order'),

    /** `expectedRefundedInOre` is the refunded total the page loaded, so the API can refuse a refund made on a stale order. */
    refund: (id: number, amountInOre: number, expectedRefundedInOre: number) =>
        act(id, 'refund', 'Failed to refund the order', { amountInOre, expectedRefundedInOre }),

    /** Makes the build the order still holds available again, after Vipps ended the reservation. */
    releaseBuild: (id: number) => act(id, 'release-build', 'Failed to release the build'),

    /** Emails the buyer a link to the shop's pay page, after Vipps ended the reservation. The build stays held. */
    sendPaymentLink: (id: number) =>
        request(() => axiosInstance.post<AdminOrder>(`/admin/shop/orders/${id}/payment-link`), 'Failed to send the payment link'),

    /** Marks the order as sent, or ready for pickup, and emails the buyer with the note. */
    markShipped: (id: number, note: string | null) =>
        request(() => axiosInstance.post<AdminOrder>(`/admin/shop/orders/${id}/shipped`, { note }), 'Failed to mark the order'),

    setInvoiceNumber: (id: number, invoiceNumber: string | null) =>
        request(() => axiosInstance.put<AdminOrder>(`/admin/shop/orders/${id}/invoice-number`, { invoiceNumber }), 'Failed to save the invoice number'),

    /** Sends the admin's token when signed in and none otherwise. */
    checkout: async (req: CheckoutRequest) => {
        const started = await request(() => axiosInstance.post<CheckoutResponse>('/shop/checkout', req), 'Failed to start the payment');
        // The build is held now. The open route purges its pages when the live build is no longer Available.
        // It is not awaited, so the redirect to Vipps never waits for it, and keepalive lets it finish after the page leaves.
        void fetch('/api/shop/held', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: req.buildSlug }),
            keepalive: true,
        }).catch(() => undefined);
        return started;
    },

    /** Starts a new Vipps payment from a payment link. The answer is the Vipps page to send the buyer to. */
    payWithLink: (token: string) =>
        request(() => publicClient.post<CheckoutResponse>(`/shop/pay/${encodeURIComponent(token)}`), 'Failed to start the payment'),

    /** The public shop settings, read fresh for the current terms version. */
    config: (locale: string) =>
        request(() => publicClient.get<ShopConfig>(`/shop/config?locale=${encodeURIComponent(locale)}`), 'Failed to load the shop'),

    /** The public status of an order by its token, or null when no order has it. */
    orderStatus: async (token: string) => {
        const response = await request(
            () => publicClient.get<OrderStatusInfo>(`/shop/orders/${encodeURIComponent(token)}/status`, { validateStatus: status => status < 400 || status === 404 }).then(data => ({ data })),
            'Failed to load the order status',
        );
        return response.status === 404 ? null : response.data;
    },
};

export default ShopService;
