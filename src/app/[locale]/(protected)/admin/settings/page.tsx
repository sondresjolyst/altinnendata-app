"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import TextInput from '@/components/TextInput';
import Toggle from '@/components/Toggle';
import SettingsService, { Settings } from '@/services/settingsService';
import BrandingManager from '@/components/BrandingManager';

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
    const [settings, setSettings] = useState<Settings>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        SettingsService.get()
            .then(setSettings)
            .catch(() => toast.error('Kunne ikke laste innstillingene'))
            .finally(() => setLoading(false));
    }, []);

    const patch = (changes: Partial<Settings>) => setSettings(prev => ({ ...prev, ...changes }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            setSettings(await SettingsService.update(settings));
            toast.success('Innstillingene er lagret');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Kunne ikke lagre');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="text-gray-500">Laster…</p>;

    return (
        <div className="space-y-8">
            <form onSubmit={handleSubmit} className="max-w-md space-y-4">
                <TextInput
                    label="Mottaker for henvendelser"
                    name="contactRecipientEmail"
                    type="email"
                    value={settings.contactRecipientEmail}
                    onChange={e => patch({ contactRecipientEmail: e.target.value })}
                    required
                />
                <p className="text-xs text-gray-500">Meldinger fra kontaktskjemaet sendes hit.</p>

                <TextInput
                    label="Firmanavn"
                    name="companyName"
                    value={settings.companyName}
                    onChange={e => patch({ companyName: e.target.value })}
                    required
                />
                <TextInput
                    label="Registrert navn"
                    name="companyLegalName"
                    value={settings.companyLegalName}
                    onChange={e => patch({ companyLegalName: e.target.value })}
                />
                <p className="text-xs text-gray-500">Navnet i Enhetsregisteret. La stå tomt til firmaet er registrert.</p>

                <TextInput
                    label="Organisasjonsnummer"
                    name="orgNumber"
                    value={settings.orgNumber}
                    onChange={e => patch({ orgNumber: e.target.value })}
                />
                <Toggle label="Registrert i Merverdiavgiftsregisteret" checked={settings.vatRegistered} onChange={v => patch({ vatRegistered: v })} />
                <p className="text-xs text-gray-500">Krever organisasjonsnummer. Slått på vises nummeret med «MVA».</p>

                <TextInput
                    label="Adresse"
                    name="address"
                    value={settings.address}
                    onChange={e => patch({ address: e.target.value })}
                    required
                />
                <TextInput
                    label="E-post som vises på nettsiden"
                    name="publicEmail"
                    type="email"
                    value={settings.publicEmail}
                    onChange={e => patch({ publicEmail: e.target.value })}
                    required
                />
                <TextInput
                    label="Telefon som vises på nettsiden"
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
                    {saving ? 'Lagrer…' : 'Lagre'}
                </button>
            </form>

            <BrandingManager />
        </div>
    );
}
