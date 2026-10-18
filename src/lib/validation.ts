import { z } from 'zod';
import type { Dictionary } from '@/i18n/dictionaries';

export const budgetRanges = ['5000-10000', '10000-15000', '15000-25000', '25000+'] as const;
export type BudgetRange = (typeof budgetRanges)[number];

export const contactSchema = z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().max(30).optional().or(z.literal('')),
    useCase: z.string().max(160).optional().or(z.literal('')),
    budgetNok: z.enum(budgetRanges).nullable().optional(),
    buildSlug: z.string().max(160).optional().or(z.literal('')),
    message: z.string().min(1).max(4000),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** The digits of a Norwegian mobile number as Vipps takes them, or null. Mirrors AppKit.Vipps `VippsPhoneNumber.TryNormalize`. */
function normalizeMobile(raw: string): string | null {
    let digits = raw.replace(/[^0-9]/g, '');
    if (digits.length === 8) digits = `47${digits}`;
    return digits.length === 10 && digits.startsWith('47') ? digits : null;
}

const deliveryMethods = ['Shipping', 'HomeDelivery', 'Pickup'] as const;

/** Mirrors the API's `CheckoutRequestValidator`. A custom issue carries the key of its message in `message`. */
export const checkoutSchema = z.object({
    buildSlug: z.string().min(1).max(160),
    deliveryMethod: z.enum(deliveryMethods),
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().min(1).max(200).email(),
    phone: z.string().superRefine((value, ctx) => {
        if (value.trim() === '') ctx.addIssue({ code: 'custom', message: 'required' });
        else if (normalizeMobile(value) === null) ctx.addIssue({ code: 'custom', message: 'phone' });
    }),
    streetAddress: z.string().trim().max(200).nullable(),
    postalCode: z.string().trim().nullable(),
    city: z.string().trim().max(100).nullable(),
    withinDistance: z.boolean(),
    pickupNote: z.string().trim().max(500).nullable(),
    acceptTerms: z.boolean().refine(accepted => accepted, { message: 'terms' }),
    locale: z.string().min(1),
}).superRefine((order, ctx) => {
    if (order.deliveryMethod !== 'Pickup') {
        if (!order.streetAddress) ctx.addIssue({ code: 'custom', path: ['streetAddress'], message: 'required' });
        if (!order.postalCode) ctx.addIssue({ code: 'custom', path: ['postalCode'], message: 'required' });
        else if (!/^[0-9]{4}$/.test(order.postalCode)) ctx.addIssue({ code: 'custom', path: ['postalCode'], message: 'postalCode' });
        if (!order.city) ctx.addIssue({ code: 'custom', path: ['city'], message: 'required' });
    }

    if (order.deliveryMethod === 'HomeDelivery' && !order.withinDistance) {
        ctx.addIssue({ code: 'custom', path: ['withinDistance'], message: 'distance' });
    }
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** The text for one checkout issue. `field` is the field's name in running text and `km` the home delivery distance. */
export function checkoutIssueMessage(issue: z.core.$ZodIssue, field: string, dict: Dictionary, km = 0): string {
    const text = dict.shop.validation;
    if (issue.code === 'invalid_format' && issue.format === 'email') return text.email;
    if (issue.code === 'too_big') return text.tooLong.replace('{max}', String(issue.maximum));
    if (issue.code === 'custom') {
        switch (issue.message) {
            case 'phone': return text.phone;
            case 'postalCode': return text.postalCode;
            case 'terms': return text.terms;
            case 'distance': return text.distance.replace('{km}', String(km));
        }
    }
    return text.required.replace('{field}', field);
}

export function issueMessage(issue: z.core.$ZodIssue, dict: Dictionary): string {
    if (issue.code === 'invalid_format' && issue.format === 'email') return dict.validation.email;
    if (issue.code === 'too_big') return dict.validation.tooLong;
    return dict.validation.required;
}

