"use client";

import { useEffect, useState } from 'react';
import { apiFieldErrors } from '@sjolystinnovation/app-kit/api';
import { toast } from '@sjolystinnovation/app-kit/toast';
import { Alert, TextInput, fillTemplate } from '@sjolystinnovation/app-kit/ui';
import MarketingService, { type MarketingSettings, type MarketingSettingsUpdate } from '@/services/marketingService';
import { useDictionary } from '@/i18n/DictionaryProvider';

/** The API's rule for the Meta Pixel ID: 5 to 20 digits, or empty to turn the pixel off. */
const PIXEL_ID = /^[0-9]{5,20}$/;

/** The API's rule for the TikTok Pixel ID: 10 to 32 capital letters and digits, or empty to turn the pixel off. */
const TIKTOK_PIXEL_ID = /^[A-Z0-9]{10,32}$/;

/** The API's rule for a server token after trimming: 20 to 512 printable ASCII characters with no spaces. */
const SERVER_TOKEN = /^[\x21-\x7e]{20,512}$/;

type TokenField = 'metaCapiToken' | 'tikTokEventsToken';

interface FieldErrors {
    metaPixelId?: string;
    tikTokPixelId?: string;
    metaCapiToken?: string;
    tikTokEventsToken?: string;
}

const SECONDARY_BUTTON = 'shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60';

/**
 * The Meta and TikTok Pixel IDs and the server tokens in the admin settings. A save sends both IDs, since the API
 * replaces them. A token is sent only when the admin typed one or removes it, and the API never sends one back.
 * Saving purges every page, since the layout reads the IDs.
 */
export default function MarketingSettingsForm() {
    const { dict } = useDictionary();
    const text = dict.admin.marketing;
    const [pixelId, setPixelId] = useState('');
    const [tikTokPixelId, setTikTokPixelId] = useState('');
    const [tokens, setTokens] = useState<Record<TokenField, string>>({ metaCapiToken: '', tikTokEventsToken: '' });
    const [tokenSet, setTokenSet] = useState<Record<TokenField, boolean>>({ metaCapiToken: false, tikTokEventsToken: false });
    const [confirmRemove, setConfirmRemove] = useState<TokenField | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    const showStored = (settings: MarketingSettings) => {
        setTokenSet({ metaCapiToken: settings.metaCapiTokenSet === true, tikTokEventsToken: settings.tikTokEventsTokenSet === true });
    };

    useEffect(() => {
        let current = true;
        MarketingService.getSettings()
            .then(settings => {
                if (!current) return;
                setPixelId(settings.metaPixelId ?? '');
                setTikTokPixelId(settings.tikTokPixelId ?? '');
                showStored(settings);
                setLoaded(true);
            })
            .catch(() => {
                if (current) setLoadFailed(true);
            });
        return () => { current = false; };
    }, []);

    /** Saves the form. `remove` names a token to clear with an empty value. */
    const save = async (remove?: TokenField) => {
        const meta = pixelId.trim();
        // Trimmed but not uppercased, so a lowercase ID shows the error instead of being changed without a word.
        const tikTok = tikTokPixelId.trim();
        const typed: Record<TokenField, string> = { metaCapiToken: tokens.metaCapiToken.trim(), tikTokEventsToken: tokens.tikTokEventsToken.trim() };
        const invalid: FieldErrors = {};
        if (meta !== '' && !PIXEL_ID.test(meta)) invalid.metaPixelId = text.invalid;
        if (tikTok !== '' && !TIKTOK_PIXEL_ID.test(tikTok)) invalid.tikTokPixelId = text.tikTokInvalid;
        for (const field of ['metaCapiToken', 'tikTokEventsToken'] as const) {
            if (field !== remove && typed[field] !== '' && !SERVER_TOKEN.test(typed[field])) invalid[field] = text.tokenInvalid;
        }
        setErrors(invalid);
        if (Object.keys(invalid).length > 0) return;

        const update: MarketingSettingsUpdate = { metaPixelId: meta, tikTokPixelId: tikTok };
        for (const field of ['metaCapiToken', 'tikTokEventsToken'] as const) {
            // An empty field sends nothing, so the API keeps the stored token.
            if (field === remove) update[field] = '';
            else if (typed[field] !== '') update[field] = typed[field];
        }

        setSaving(true);
        try {
            const saved = await MarketingService.updateSettings(update);
            setPixelId(saved.metaPixelId ?? '');
            setTikTokPixelId(saved.tikTokPixelId ?? '');
            showStored(saved);
            setTokens({ metaCapiToken: '', tikTokEventsToken: '' });
            setConfirmRemove(null);
            toast.success(text.saved);
        } catch (err) {
            const refused = Object.keys(apiFieldErrors(err) ?? {}).map(key => key.toLowerCase());
            const shown: FieldErrors = {};
            if (refused.includes('metapixelid')) shown.metaPixelId = text.invalid;
            if (refused.includes('tiktokpixelid')) shown.tikTokPixelId = text.tikTokInvalid;
            if (refused.includes('metacapitoken')) shown.metaCapiToken = text.tokenInvalid;
            if (refused.includes('tiktokeventstoken')) shown.tikTokEventsToken = text.tokenInvalid;
            if (Object.keys(shown).length > 0) setErrors(shown);
            else toast.error(text.saveFailed);
        } finally {
            setSaving(false);
        }
    };

    const tokenInput = (field: TokenField, label: string, hint: string) => {
        const status = tokenSet[field] ? text.tokenSet : text.tokenNotSet;
        return (
            <div className="space-y-2">
                <TextInput
                    label={label}
                    name={field}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={tokens[field]}
                    error={errors[field]}
                    disabled={!loaded}
                    aria-describedby={`${field}-status ${field}-hint marketing-server-note`}
                    onChange={e => {
                        const value = e.target.value;
                        setTokens(t => ({ ...t, [field]: value }));
                    }}
                />
                <div className="flex flex-wrap items-center gap-3">
                    <p id={`${field}-status`} className="text-xs font-semibold text-gray-700">{status}</p>
                    {tokenSet[field] && confirmRemove !== field && (
                        <button
                            type="button"
                            className={SECONDARY_BUTTON}
                            disabled={!loaded || saving}
                            aria-label={fillTemplate(text.removeTokenLabel, { name: label })}
                            onClick={() => setConfirmRemove(field)}
                        >
                            {text.removeToken}
                        </button>
                    )}
                </div>
                {confirmRemove === field && (
                    <div role="group" aria-labelledby={`${field}-confirm`} className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-3">
                        <p id={`${field}-confirm`} className="text-sm text-gray-900">{fillTemplate(text.removeTokenConfirm, { name: label })}</p>
                        <button type="button" className={SECONDARY_BUTTON} disabled={saving} onClick={() => void save(field)}>
                            {text.removeTokenYes}
                        </button>
                        <button type="button" className={SECONDARY_BUTTON} disabled={saving} onClick={() => setConfirmRemove(null)}>
                            {text.removeTokenCancel}
                        </button>
                    </div>
                )}
                <p id={`${field}-hint`} className="text-xs text-gray-500">{hint}</p>
            </div>
        );
    };

    return (
        <form
            className="max-w-md space-y-5 border-t border-gray-200 pt-6"
            aria-labelledby="marketing-settings"
            onSubmit={e => {
                e.preventDefault();
                void save();
            }}
        >
            <h2 id="marketing-settings" className="font-bold text-gray-900">{text.title}</h2>
            {loadFailed && <Alert variant="error">{text.loadFailed}</Alert>}
            <div className="space-y-2">
                <TextInput
                    label={text.pixelId}
                    name="metaPixelId"
                    inputMode="numeric"
                    autoComplete="off"
                    value={pixelId}
                    error={errors.metaPixelId}
                    disabled={!loaded}
                    aria-describedby="metaPixelId-hint marketing-consent"
                    onChange={e => setPixelId(e.target.value)}
                />
                <p id="metaPixelId-hint" className="text-xs text-gray-500">{text.pixelIdHint}</p>
            </div>
            <div className="space-y-2">
                <TextInput
                    label={text.tikTokPixelId}
                    name="tikTokPixelId"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={tikTokPixelId}
                    error={errors.tikTokPixelId}
                    disabled={!loaded}
                    aria-describedby="tikTokPixelId-hint marketing-consent"
                    onChange={e => setTikTokPixelId(e.target.value)}
                />
                <p id="tikTokPixelId-hint" className="text-xs text-gray-500">{text.tikTokPixelIdHint}</p>
            </div>
            <p id="marketing-consent" className="text-xs text-gray-500">{text.consentNote}</p>
            {tokenInput('metaCapiToken', text.metaCapiToken, text.metaCapiTokenHint)}
            {tokenInput('tikTokEventsToken', text.tikTokEventsToken, text.tikTokEventsTokenHint)}
            <p id="marketing-server-note" className="text-xs text-gray-500">{text.serverNote}</p>
            <button
                type="submit"
                disabled={!loaded || saving}
                className="rounded-button bg-button-primary-bg text-button-primary-text font-semibold px-5 py-2.5 hover:brightness-95 disabled:opacity-60 transition"
            >
                {saving ? dict.common.saving : text.save}
            </button>
        </form>
    );
}
