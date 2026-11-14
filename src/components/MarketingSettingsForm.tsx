"use client";

import { useEffect, useState } from 'react';
import { apiFieldErrors } from '@sjolystinnovation/app-kit/api';
import { toast } from '@sjolystinnovation/app-kit/toast';
import { Alert, TextInput } from '@sjolystinnovation/app-kit/ui';
import MarketingService from '@/services/marketingService';
import { useDictionary } from '@/i18n/DictionaryProvider';

/** The API's rule for the Meta Pixel ID: 5 to 20 digits, or empty to turn the pixel off. */
const PIXEL_ID = /^[0-9]{5,20}$/;

/** The API's rule for the TikTok Pixel ID: 10 to 32 capital letters and digits, or empty to turn the pixel off. */
const TIKTOK_PIXEL_ID = /^[A-Z0-9]{10,32}$/;

interface FieldErrors {
    metaPixelId?: string;
    tikTokPixelId?: string;
}

/**
 * The Meta and TikTok Pixel IDs in the admin settings. The API replaces the whole setting, so a save sends both.
 * Saving purges every page, since the layout reads them.
 */
export default function MarketingSettingsForm() {
    const { dict } = useDictionary();
    const text = dict.admin.marketing;
    const [pixelId, setPixelId] = useState('');
    const [tikTokPixelId, setTikTokPixelId] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        let current = true;
        MarketingService.getSettings()
            .then(settings => {
                if (!current) return;
                setPixelId(settings.metaPixelId ?? '');
                setTikTokPixelId(settings.tikTokPixelId ?? '');
                setLoaded(true);
            })
            .catch(() => {
                if (current) setLoadFailed(true);
            });
        return () => { current = false; };
    }, []);

    const save = async () => {
        const meta = pixelId.trim();
        // Trimmed but not uppercased, so a lowercase ID shows the error instead of being changed without a word.
        const tikTok = tikTokPixelId.trim();
        const invalid: FieldErrors = {};
        if (meta !== '' && !PIXEL_ID.test(meta)) invalid.metaPixelId = text.invalid;
        if (tikTok !== '' && !TIKTOK_PIXEL_ID.test(tikTok)) invalid.tikTokPixelId = text.tikTokInvalid;
        setErrors(invalid);
        if (invalid.metaPixelId || invalid.tikTokPixelId) return;
        setSaving(true);
        try {
            const saved = await MarketingService.updateSettings({ metaPixelId: meta, tikTokPixelId: tikTok });
            setPixelId(saved.metaPixelId ?? '');
            setTikTokPixelId(saved.tikTokPixelId ?? '');
            toast.success(text.saved);
        } catch (err) {
            const refused = Object.keys(apiFieldErrors(err) ?? {}).map(key => key.toLowerCase());
            const shown: FieldErrors = {};
            if (refused.includes('metapixelid')) shown.metaPixelId = text.invalid;
            if (refused.includes('tiktokpixelid')) shown.tikTokPixelId = text.tikTokInvalid;
            if (shown.metaPixelId || shown.tikTokPixelId) setErrors(shown);
            else toast.error(text.saveFailed);
        } finally {
            setSaving(false);
        }
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
