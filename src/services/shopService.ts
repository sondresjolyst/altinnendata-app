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
    authorizedAt: string | null;
    capturedAt: string | null;
    cancelledAt: string | null;
    refundedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export type ShopSettingsInput = Omit<ShopSettings, 'termsUpdatedSinceShop' | 'shopCreatedAt'>;

// Each of these changes whether the build can be sold, so the public build pages are purged.
const act = async (id: number, action: 'capture' | 'cancel' | 'refund', fallback: string, body?: object) => {
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

    getOrders: () =>
        request(() => axiosInstance.get<AdminOrderSummary[]>('/admin/shop/orders'), 'Failed to load the orders'),

    getOrder: (id: number) =>
        request(() => axiosInstance.get<AdminOrder>(`/admin/shop/orders/${id}`), 'Failed to load the order'),

    capture: (id: number) => act(id, 'capture', 'Failed to capture the payment'),

    cancel: (id: number) => act(id, 'cancel', 'Failed to cancel the order'),

    /** `expectedRefundedInOre` is the refunded total the page loaded, so the API can refuse a refund made on a stale order. */
    refund: (id: number, amountInOre: number, expectedRefundedInOre: number) =>
        act(id, 'refund', 'Failed to refund the order', { amountInOre, expectedRefundedInOre }),

    setInvoiceNumber: (id: number, invoiceNumber: string | null) =>
        request(() => axiosInstance.put<AdminOrder>(`/admin/shop/orders/${id}/invoice-number`, { invoiceNumber }), 'Failed to save the invoice number'),

    /** Sends the admin's token when signed in and none otherwise. */
    checkout: async (req: CheckoutRequest) => {
        const started = await request(() => axiosInstance.post<CheckoutResponse>('/shop/checkout', req), 'Failed to start the payment');
        // The build is held now, so its pages must stop offering it before the buyer is sent to Vipps.
        await revalidateTarget(REVALIDATE_TARGETS.builds);
        return started;
    },

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
