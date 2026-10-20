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
    termsVersion: z.string().min(1).max(40),
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

/** The form fields the checkout API reports errors for, in the form's own names. */
export type CheckoutField = 'name' | 'email' | 'phone' | 'streetAddress' | 'postalCode' | 'city' | 'pickupNote' | 'withinDistance' | 'acceptTerms';

const CHECKOUT_FIELD_BY_API_KEY = new Map<string, CheckoutField>(
    (['name', 'email', 'phone', 'streetAddress', 'postalCode', 'city', 'pickupNote', 'withinDistance', 'acceptTerms'] as const).map(field => [field.toLowerCase(), field]),
);

/** The form field behind a key of the API's field errors, or undefined for a key the form has no field for. */
export function checkoutFieldOfApiKey(key: string): CheckoutField | undefined {
    return CHECKOUT_FIELD_BY_API_KEY.get(key.toLowerCase());
}

const CHECKOUT_MAX_LENGTH: Partial<Record<CheckoutField, number>> = { name: 120, email: 200, streetAddress: 200, city: 100, pickupNote: 500 };

/**
 * The Norwegian text for a field the API refused. The API words its messages in English, so the rule is
 * read from the field and its value, the way `checkoutSchema` words it. `value` is what the buyer typed.
 */
export function checkoutApiFieldMessage(field: CheckoutField, value: string, name: string, dict: Dictionary, km = 0): string {
    const text = dict.shop.validation;
    switch (field) {
        case 'phone': return value.trim() === '' ? text.required.replace('{field}', name) : text.phone;
        case 'acceptTerms': return text.terms;
        case 'withinDistance': return text.distance.replace('{km}', String(km));
        case 'email': if (value.trim() !== '' && value.trim().length <= CHECKOUT_MAX_LENGTH.email!) return text.email; break;
        case 'postalCode': if (value.trim() !== '') return text.postalCode; break;
    }

    const max = CHECKOUT_MAX_LENGTH[field];
    if (value.trim() !== '' && max !== undefined) return text.tooLong.replace('{max}', String(max));
    return text.required.replace('{field}', name);
}

/** The contact form's text for a field `contactSchema` refused, worded the way Altinn words it. */
export function issueMessage(issue: z.core.$ZodIssue, dict: Dictionary): string {
    const text = dict.validation;
    if (issue.code === 'invalid_format' && issue.format === 'email') return text.email;
    if (issue.code === 'too_big') return text.tooLong.replace('{max}', String(issue.maximum));
    const field = String(issue.path[0] ?? '');
    const name = Object.hasOwn(text.fieldNames, field) ? text.fieldNames[field as keyof typeof text.fieldNames] : field;
    return text.required.replace('{field}', name);
}

