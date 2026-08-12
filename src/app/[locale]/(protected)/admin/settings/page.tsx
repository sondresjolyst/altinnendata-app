"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import TextInput from '@/components/TextInput';
import Toggle from '@/components/Toggle';
import SettingsService, { Settings } from '@/services/settingsService';
import BrandingManager from '@/components/BrandingManager';
import { useDictionary } from '@/i18n/DictionaryProvider';

const EMPTY: Settings = {
    contactRecipientEmail: '',
    companyName: '',
    companyLegalName: '',
    orgNumber: '',
    vatRegistered: false,
    address: '',
    publicEmail: '',
    publicPhone: '',
};

export default function AdminSettingsPage() {
    const { dict } = useDictionary();
    const [settings, setSettings] = useState<Settings>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        SettingsService.get()
            .then(setSettings)
            .catch(() => toast.error(dict.admin.settingsLoadFailed))
            .finally(() => setLoading(false));
    }, []);

    const patch = (changes: Partial<Settings>) => setSettings(prev => ({ ...prev, ...changes }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            setSettings(await SettingsService.update(settings));
            toast.success(dict.admin.settingsSaved);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : dict.admin.settingsSaveFailed);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="text-gray-500">{dict.common.loading}</p>;

    return (
        <div className="space-y-8">
            <form onSubmit={handleSubmit} className="max-w-md space-y-4">
                <TextInput
                    label={dict.admin.contactRecipient}
                    name="contactRecipientEmail"
                    type="email"
                    value={settings.contactRecipientEmail}
                    onChange={e => patch({ contactRecipientEmail: e.target.value })}
                    required
                />
                <p className="text-xs text-gray-500">{dict.admin.contactRecipientHint}</p>

                <TextInput
                    label={dict.admin.companyName}
                    name="companyName"
                    value={settings.companyName}
                    onChange={e => patch({ companyName: e.target.value })}
                    required
                />
                <TextInput
                    label={dict.admin.legalName}
                    name="companyLegalName"
                    value={settings.companyLegalName}
                    onChange={e => patch({ companyLegalName: e.target.value })}
                />
                <p className="text-xs text-gray-500">{dict.admin.legalNameHint}</p>

                <TextInput
                    label={dict.admin.orgNumber}
                    name="orgNumber"
                    value={settings.orgNumber}
                    onChange={e => patch({ orgNumber: e.target.value })}
                />
                <Toggle label={dict.admin.vatRegistered} checked={settings.vatRegistered} onChange={v => patch({ vatRegistered: v })} />
                <p className="text-xs text-gray-500">{dict.admin.vatHint}</p>

                <TextInput
                    label={dict.admin.address}
                    name="address"
                    value={settings.address}
                    onChange={e => patch({ address: e.target.value })}
                    required
                />
                <TextInput
                    label={dict.admin.publicEmail}
                    name="publicEmail"
                    type="email"
                    value={settings.publicEmail}
                    onChange={e => patch({ publicEmail: e.target.value })}
                    required
                />
                <TextInput
                    label={dict.admin.publicPhone}
                    name="publicPhone"
                    value={settings.publicPhone}
                    onChange={e => patch({ publicPhone: e.target.value })}
                    required
                />

                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2.5 hover:brightness-95 disabled:opacity-60 transition"
                >
                    {saving ? dict.common.saving : dict.common.save}
                </button>
            </form>

            <BrandingManager />
        </div>
    );
}
