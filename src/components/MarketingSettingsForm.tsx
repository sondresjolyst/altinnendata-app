"use client";

import { useEffect, useState } from 'react';
import { apiFieldErrors } from '@sjolystinnovation/app-kit/api';
import { toast } from '@sjolystinnovation/app-kit/toast';
import { Alert, TextInput } from '@sjolystinnovation/app-kit/ui';
import MarketingService from '@/services/marketingService';
import { useDictionary } from '@/i18n/DictionaryProvider';

/** The API's rule: 5 to 20 digits, or empty to turn the pixel off. */
const PIXEL_ID = /^[0-9]{5,20}$/;

/** The Meta Pixel ID in the admin settings. Saving purges every page, since the layout reads it. */
export default function MarketingSettingsForm() {
    const { dict } = useDictionary();
    const text = dict.admin.marketing;
    const [pixelId, setPixelId] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | undefined>();

    useEffect(() => {
        let current = true;
        MarketingService.getSettings()
            .then(settings => {
                if (!current) return;
                setPixelId(settings.metaPixelId ?? '');
                setLoaded(true);
            })
            .catch(() => {
                if (current) setLoadFailed(true);
            });
        return () => { current = false; };
    }, []);

    const save = async () => {
        const value = pixelId.trim();
        if (value !== '' && !PIXEL_ID.test(value)) {
            setError(text.invalid);
            return;
        }
        setError(undefined);
        setSaving(true);
        try {
            const saved = await MarketingService.updateSettings({ metaPixelId: value });
            setPixelId(saved.metaPixelId ?? '');
            toast.success(text.saved);
        } catch (err) {
            const refused = Object.keys(apiFieldErrors(err) ?? {}).some(key => key.toLowerCase() === 'metapixelid');
            if (refused) setError(text.invalid);
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
            <TextInput
                label={text.pixelId}
                name="metaPixelId"
                inputMode="numeric"
                autoComplete="off"
                value={pixelId}
                error={error}
                disabled={!loaded}
                aria-describedby="metaPixelId-hint metaPixelId-consent"
                onChange={e => setPixelId(e.target.value)}
            />
            <p id="metaPixelId-hint" className="text-xs text-gray-500">{text.pixelIdHint}</p>
            <p id="metaPixelId-consent" className="text-xs text-gray-500">{text.consentNote}</p>
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
