"use client";

import { useEffect, useState } from 'react';
import { apiErrorCode } from '@sjolystinnovation/app-kit/api';
import { toast } from '@sjolystinnovation/app-kit/toast';
import { Alert, TextArea, TextInput, Toggle } from '@sjolystinnovation/app-kit/ui';
import ShopService, { type BuyButtonMode, type DeliveryMethod, type ShopSettings } from '@/services/shopService';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/config';
import { useDictionary } from '@/i18n/DictionaryProvider';

interface DeliveryDraft {
    method: DeliveryMethod;
    enabled: boolean;
    price: string;
    labelNo: string;
    labelEn: string;
    descriptionNo: string;
    descriptionEn: string;
    maxDistance: string;
}

interface Draft {
    buyButton: BuyButtonMode;
    vippsTestMode: boolean;
    delivery: DeliveryDraft[];
}

const BUY_BUTTON_MODES: BuyButtonMode[] = ['Off', 'AdminsOnly', 'Everyone'];

const toDraft = (settings: ShopSettings): Draft => ({
    buyButton: settings.buyButton,
    vippsTestMode: settings.vippsTestMode,
    delivery: settings.delivery.map(o => ({
        method: o.method,
        enabled: o.enabled,
        price: String(o.priceNok),
        labelNo: o.labelNo,
        labelEn: o.labelEn,
        descriptionNo: o.descriptionNo ?? '',
        descriptionEn: o.descriptionEn ?? '',
        maxDistance: o.maxDistanceKm == null ? '' : String(o.maxDistanceKm),
    })),
});

const orNull = (value: string) => value.trim() || null;

interface FieldDetail {
    message: string;
    code?: string;
    limit?: number;
}

/** The field errors that `request` keeps on the Error it throws, keyed by lower case field name. */
function fieldDetails(error: unknown): Map<string, FieldDetail[]> {
    const kept = (error as { fieldErrorDetails?: Record<string, FieldDetail[]> } | null)?.fieldErrorDetails;
    return new Map(Object.entries(kept ?? {}).map(([field, list]) => [field.toLowerCase(), list]));
}

export default function AdminShopSettingsPage() {
    const { dict } = useDictionary();
    const text = dict.admin.shop;
    const [settings, setSettings] = useState<ShopSettings | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [saving, setSaving] = useState(false);
    const [termsRefused, setTermsRefused] = useState(false);
    const [errors, setErrors] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        let current = true;
        ShopService.getSettings()
            .then(loaded => {
                if (!current) return;
                setSettings(loaded);
                setDraft(toDraft(loaded));
            })
            .catch(err => toast.error(err instanceof Error ? err.message : text.loadFailed));
        return () => { current = false; };
    }, [text.loadFailed]);

    if (!settings || !draft) {
        return <div className="py-10 text-center text-gray-500">{dict.common.loading}</div>;
    }

    const termsMissing = !settings.termsUpdatedSinceShop || termsRefused;

    const patchOption = (index: number, changes: Partial<DeliveryDraft>) =>
        setDraft({ ...draft, delivery: draft.delivery.map((o, i) => (i === index ? { ...o, ...changes } : o)) });

    const errorText = (error: FieldDetail, fieldName: string) => {
        const template = Object.hasOwn(text.validation, error.code ?? '') ? text.validation[error.code as keyof typeof text.validation] : undefined;
        if (template === undefined) return error.message;
        if (!template.includes('{max}')) return template.replace('{field}', fieldName.toLowerCase());
        return error.limit === undefined ? error.message : template.replace('{max}', String(error.limit));
    };

    const save = async () => {
        const delivery = draft.delivery.map(o => ({
            method: o.method,
            enabled: o.enabled,
            priceNok: Number(o.price),
            labelNo: o.labelNo.trim(),
            labelEn: o.labelEn.trim(),
            descriptionNo: orNull(o.descriptionNo),
            descriptionEn: orNull(o.descriptionEn),
            maxDistanceKm: o.method === 'HomeDelivery' && o.maxDistance.trim() !== '' ? Number(o.maxDistance) : null,
        }));

        const missing = new Map<string, string>();
        draft.delivery.forEach((o, index) => {
            if (o.price.trim() === '') missing.set(`${index}.price`, text.validation.required.replace('{field}', text.price.toLowerCase()));
        });
        setErrors(missing);
        if (missing.size > 0) return;

        setSaving(true);
        try {
            const saved = await ShopService.updateSettings({ buyButton: draft.buyButton, vippsTestMode: draft.vippsTestMode, delivery });
            setSettings(saved);
            setDraft(toDraft(saved));
            setTermsRefused(false);
            toast.success(text.saved);
        } catch (err) {
            if (apiErrorCode(err) === 'termsNotUpdated') {
                setTermsRefused(true);
                return;
            }

            const details = fieldDetails(err);
            const shown = new Map<string, string>();
            draft.delivery.forEach((_, index) => {
                const fields = [
                    ['price', 'priceNok', text.price],
                    ['labelNo', 'labelNo', `${text.label} (${LOCALE_LABELS.no})`],
                    ['labelEn', 'labelEn', `${text.label} (${LOCALE_LABELS.en})`],
                    ['descriptionNo', 'descriptionNo', `${text.description} (${LOCALE_LABELS.no})`],
                    ['descriptionEn', 'descriptionEn', `${text.description} (${LOCALE_LABELS.en})`],
                    ['maxDistance', 'maxDistanceKm', text.maxDistance],
                ] as const;
                for (const [field, apiField, name] of fields) {
                    const list = details.get(`delivery[${index}].${apiField}`.toLowerCase());
                    if (list?.length) shown.set(`${index}.${field}`, list.map(e => errorText(e, name)).join(' '));
                }
            });
            setErrors(shown);
            toast.error(shown.size === 0 && err instanceof Error && err.message ? err.message : text.saveFailed);
        } finally {
            setSaving(false);
        }
    };

    const radio = (name: string, label: string, checked: boolean, onSelect: () => void, disabled = false) => (
        <label className={`flex items-center gap-2 text-sm text-gray-900 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
            <input type="radio" name={name} checked={checked} onChange={onSelect} disabled={disabled} className="h-4 w-4" />
            {label}
        </label>
    );

    const buyLabels: Record<BuyButtonMode, string> = { Off: text.buyOff, AdminsOnly: text.buyAdmins, Everyone: text.buyEveryone };

    return (
        <form
            className="space-y-8"
            onSubmit={e => {
                e.preventDefault();
                void save();
            }}
        >
            <fieldset className="space-y-3 rounded-2xl border border-gray-200 p-5">
                <legend className="px-2 text-sm font-bold text-gray-900">{text.buyButton}</legend>
                {BUY_BUTTON_MODES.map(mode =>
                    <div key={mode}>
                        {radio('buyButton', buyLabels[mode], draft.buyButton === mode, () => setDraft({ ...draft, buyButton: mode }), mode === 'Everyone' && termsMissing)}
                    </div>,
                )}
                {termsMissing && <Alert variant="warning">{text.termsWarning}</Alert>}
            </fieldset>

            <fieldset className="space-y-3 rounded-2xl border border-gray-200 p-5">
                <legend className="px-2 text-sm font-bold text-gray-900">{text.vipps}</legend>
                {radio('vipps', text.vippsTest, draft.vippsTestMode, () => setDraft({ ...draft, vippsTestMode: true }))}
                {radio('vipps', text.vippsLive, !draft.vippsTestMode, () => setDraft({ ...draft, vippsTestMode: false }))}
            </fieldset>

            <section className="space-y-4" aria-labelledby="shop-delivery">
                <h2 id="shop-delivery" className="font-bold text-gray-900">{text.delivery}</h2>
                {draft.delivery.map((option, index) => {
                    const error = (field: string) => errors.get(`${index}.${field}`);
                    const fieldLabel = (kind: 'label' | 'description', locale: Locale) => `${text[kind]} (${LOCALE_LABELS[locale]})`;

                    return (
                        <fieldset key={option.method} className="space-y-4 rounded-2xl border border-gray-200 p-5">
                            <legend className="px-2 text-sm font-bold text-gray-900">{text.methods[option.method]}</legend>
                            <Toggle checked={option.enabled} onChange={enabled => patchOption(index, { enabled })} label={text.offered} />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <TextInput
                                    label={text.price}
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={option.price}
                                    error={error('price')}
                                    onChange={e => patchOption(index, { price: e.target.value })}
                                />
                                {option.method === 'HomeDelivery' && (
                                    <TextInput
                                        label={text.maxDistance}
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={option.maxDistance}
                                        error={error('maxDistance')}
                                        onChange={e => patchOption(index, { maxDistance: e.target.value })}
                                    />
                                )}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {LOCALES.map(locale => {
                                    const suffix = locale === 'no' ? 'No' : 'En';
                                    const labelKey = `label${suffix}` as 'labelNo' | 'labelEn';
                                    const descriptionKey = `description${suffix}` as 'descriptionNo' | 'descriptionEn';
                                    return (
                                        <div key={locale} className="space-y-3">
                                            <TextInput
                                                label={fieldLabel('label', locale)}
                                                value={option[labelKey]}
                                                error={error(labelKey)}
                                                onChange={e => patchOption(index, { [labelKey]: e.target.value })}
                                            />
                                            <TextArea
                                                label={fieldLabel('description', locale)}
                                                rows={2}
                                                value={option[descriptionKey]}
                                                error={error(descriptionKey)}
                                                onChange={e => patchOption(index, { [descriptionKey]: e.target.value })}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </fieldset>
                    );
                })}
            </section>

            <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
                {saving ? dict.common.saving : dict.common.save}
            </button>
        </form>
    );
}
