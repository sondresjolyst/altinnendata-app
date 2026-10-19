"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { apiErrorCode, apiFieldErrors } from '@sjolystinnovation/app-kit/api';
import { Alert, TextArea, TextInput } from '@sjolystinnovation/app-kit/ui';
import { zodFieldErrors } from '@sjolystinnovation/app-kit/validation';
import ShopService, { type BuyButtonMode, type DeliveryMethod, type PublicDeliveryOption } from '@/services/shopService';
import type { BuildDetail } from '@/services/buildService';
import { localeHref, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { fillTemplate, formatPrice } from '@/lib/format';
import { canBuy } from '@/lib/shop';
import VippsButtonArt, { VIPPS_BUTTON, VIPPS_DISABLED } from './VippsButtonArt';
import { checkoutApiFieldMessage, checkoutFieldOfApiKey, checkoutIssueMessage, checkoutSchema, type CheckoutField } from '@/lib/validation';

interface CheckoutFormProps {
    build: BuildDetail;
    delivery: PublicDeliveryOption[];
    mode: BuyButtonMode | undefined;
    locale: Locale;
}

interface FormState {
    name: string;
    email: string;
    phone: string;
    streetAddress: string;
    postalCode: string;
    city: string;
    pickupNote: string;
    withinDistance: boolean;
    acceptTerms: boolean;
}

const EMPTY: FormState = {
    name: '',
    email: '',
    phone: '',
    streetAddress: '',
    postalCode: '',
    city: '',
    pickupNote: '',
    withinDistance: false,
    acceptTerms: false,
};

const CHECKBOX = 'mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300';

export default function CheckoutForm({ build, delivery, mode, locale }: CheckoutFormProps) {
    const dict = getDictionary(locale);
    const text = dict.shop;
    const { data: session, status } = useSession();
    const [method, setMethod] = useState<DeliveryMethod | undefined>(delivery[0]?.method);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
    const [failure, setFailure] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [failedSubmits, setFailedSubmits] = useState(0);
    const formRef = useRef<HTMLFormElement>(null);

    // Back from the Vipps page can restore this page from the bfcache with the form still waiting.
    useEffect(() => {
        const reset = (event: PageTransitionEvent) => {
            if (event.persisted) setSubmitting(false);
        };
        window.addEventListener('pageshow', reset);
        return () => window.removeEventListener('pageshow', reset);
    }, []);

    // A failed submit puts the keyboard on the first field with an error.
    useEffect(() => {
        if (failedSubmits > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }, [failedSubmits]);

    // Until the session is known, an admin would flash the closed notice.
    if (mode === 'AdminsOnly' && status === 'loading') return null;

    if (!canBuy(mode, session?.user?.roles ?? [])) return <Alert variant="info">{text.notOpen}</Alert>;

    const selected = delivery.find(option => option.method === method);
    const withAddress = method === 'Shipping' || method === 'HomeDelivery';
    const km = selected?.maxDistanceKm ?? 0;
    const total = (build.priceNok ?? 0) + (selected?.priceNok ?? 0);

    const set = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm(f => ({ ...f, [field]: value }));
    const onText = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(field, e.target.value);

    const failureText = (err: unknown) => {
        const code = apiErrorCode(err);
        if (code !== undefined && Object.hasOwn(text.apiErrors, code)) return text.apiErrors[code as keyof typeof text.apiErrors];
        return text.failed;
    };

    /** The Norwegian texts for the API's field errors that have a field on screen. */
    const apiFieldMessages = (err: unknown): Partial<Record<string, string>> => {
        const visible = new Set<CheckoutField>(['name', 'email', 'phone', 'acceptTerms']);
        if (withAddress) ['streetAddress', 'postalCode', 'city'].forEach(field => visible.add(field as CheckoutField));
        if (method === 'HomeDelivery') visible.add('withinDistance');
        if (method === 'Pickup') visible.add('pickupNote');

        const shown: Partial<Record<string, string>> = {};
        for (const key of Object.keys(apiFieldErrors(err) ?? {})) {
            const field = checkoutFieldOfApiKey(key);
            if (field === undefined || !visible.has(field)) continue;
            const value = typeof form[field] === 'string' ? form[field] : '';
            const name = Object.hasOwn(text.fieldNames, field) ? text.fieldNames[field as keyof typeof text.fieldNames] : field;
            shown[field] = checkoutApiFieldMessage(field, value, name, dict, km);
        }
        return shown;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected) return;

        const parsed = checkoutSchema.safeParse({
            buildSlug: build.slug,
            deliveryMethod: selected.method,
            name: form.name,
            email: form.email,
            phone: form.phone,
            streetAddress: withAddress ? form.streetAddress : null,
            postalCode: withAddress ? form.postalCode : null,
            city: withAddress ? form.city : null,
            withinDistance: selected.method === 'HomeDelivery' && form.withinDistance,
            pickupNote: selected.method === 'Pickup' && form.pickupNote.trim() !== '' ? form.pickupNote : null,
            acceptTerms: form.acceptTerms,
            locale,
        });

        if (!parsed.success) {
            setFailure(null);
            setErrors(zodFieldErrors(parsed.error, {
                message: issue => {
                    const field = String(issue.path[0]);
                    const name = Object.hasOwn(text.fieldNames, field) ? text.fieldNames[field as keyof typeof text.fieldNames] : field;
                    return checkoutIssueMessage(issue, name, dict, km);
                },
            }));
            setFailedSubmits(n => n + 1);
            return;
        }

        setErrors({});
        setFailure(null);
        setSubmitting(true);
        try {
            const { redirectUrl } = await ShopService.checkout(parsed.data);
            window.location.assign(redirectUrl);
        } catch (err) {
            const shown = apiFieldMessages(err);
            if (Object.keys(shown).length > 0) {
                setErrors(shown);
                setFailedSubmits(n => n + 1);
            } else {
                setFailure(failureText(err));
            }
            setSubmitting(false);
        }
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit} noValidate>
            <fieldset disabled={submitting} className="min-w-0 space-y-6">
                <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm font-medium text-gray-700">{text.delivery}</legend>
                    {delivery.map(option => (
                        <label
                            key={option.method}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${option.method === method ? 'border-gray-900 bg-gray-50' : 'border-gray-300'}`}
                        >
                            <input
                                type="radio"
                                name="deliveryMethod"
                                value={option.method}
                                checked={option.method === method}
                                onChange={() => setMethod(option.method)}
                                className={CHECKBOX}
                            />
                            <span className="flex-1">
                                <span className="block font-semibold text-gray-900">{option.label}</span>
                                {option.description && <span className="block text-sm text-gray-600">{option.description}</span>}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                                {option.priceNok > 0 ? formatPrice(option.priceNok, locale) : text.free}
                            </span>
                        </label>
                    ))}
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                    <TextInput label={text.name} name="name" autoComplete="name" value={form.name} onChange={onText('name')} error={errors.name} required />
                    <TextInput label={text.email} name="email" type="email" autoComplete="email" value={form.email} onChange={onText('email')} error={errors.email} required />
                    <TextInput label={text.phone} name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={onText('phone')} error={errors.phone} required />
                </div>

                {withAddress && (
                    <div className="grid gap-4 sm:grid-cols-3">
                        <TextInput className="sm:col-span-3" label={text.streetAddress} name="streetAddress" autoComplete="street-address" value={form.streetAddress} onChange={onText('streetAddress')} error={errors.streetAddress} required />
                        <TextInput label={text.postalCode} name="postalCode" inputMode="numeric" autoComplete="postal-code" value={form.postalCode} onChange={onText('postalCode')} error={errors.postalCode} required />
                        <TextInput className="sm:col-span-2" label={text.city} name="city" autoComplete="address-level2" value={form.city} onChange={onText('city')} error={errors.city} required />
                    </div>
                )}

                {method === 'HomeDelivery' && (
                    <div>
                        <label className="flex items-start gap-2 text-sm text-gray-900">
                            <input
                                type="checkbox"
                                checked={form.withinDistance}
                                onChange={e => set('withinDistance', e.target.checked)}
                                aria-invalid={errors.withinDistance ? true : undefined}
                                aria-describedby={errors.withinDistance ? 'withinDistance-error' : undefined}
                                className={CHECKBOX}
                            />
                            {fillTemplate(text.withinDistance, { km: String(km) })}
                        </label>
                        {errors.withinDistance && <p id="withinDistance-error" className="mt-1 text-xs text-red-600">{errors.withinDistance}</p>}
                    </div>
                )}

                {method === 'Pickup' && (
                    <div>
                        <TextArea label={text.pickupNote} name="pickupNote" value={form.pickupNote} onChange={onText('pickupNote')} error={errors.pickupNote} />
                        <p className="mt-1 text-xs text-gray-500">{text.pickupHint}</p>
                    </div>
                )}

                <div>
                    <label className="flex items-start gap-2 text-sm text-gray-900">
                        <input
                            type="checkbox"
                            checked={form.acceptTerms}
                            onChange={e => set('acceptTerms', e.target.checked)}
                            aria-invalid={errors.acceptTerms ? true : undefined}
                            aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
                            className={CHECKBOX}
                        />
                        <span>
                            {text.acceptTerms}{' '}
                            <Link href={localeHref(locale, '/terms')} target="_blank" className="font-semibold underline">{text.termsLink}</Link>
                        </span>
                    </label>
                    {errors.acceptTerms && <p id="acceptTerms-error" className="mt-1 text-xs text-red-600">{errors.acceptTerms}</p>}
                    {/* Angrerettloven § 17 wants delivery limits before the order, GDPR art. 13 the privacy notice. */}
                    <p className="mt-2 text-sm text-gray-600">
                        {text.deliveryNote}{' '}
                        <Link href={localeHref(locale, '/privacy')} target="_blank" className="font-semibold underline">{text.privacyLink}</Link>.
                    </p>
                </div>

                {failure && <Alert variant="error">{failure}</Alert>}

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-4">
                    <p className="text-lg font-extrabold text-gray-900">
                        {text.total}: <span data-testid="total">{formatPrice(total, locale)}</span>
                    </p>
                    {/* The artwork keeps its words while the payment starts, so the status says it instead. */}
                    <button type="submit" disabled={submitting} aria-busy={submitting} className={`${VIPPS_BUTTON} ${submitting ? VIPPS_DISABLED : ''}`}>
                        <VippsButtonArt verb="pay" locale={locale} alt={text.pay} />
                    </button>
                    <p role="status" className="sr-only">{submitting ? text.paying : ''}</p>
                </div>
            </fieldset>
        </form>
    );
}
