"use client";

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import BrandingService, { toDataUrl } from '@/services/brandingService';
import { useBranding } from '@/components/BrandingProvider';

function Slot({
    label, currentUrl, file, onPick, onClear, hint,
}: {
    label: string;
    currentUrl: string | null;
    file: File | null;
    onPick: (f: File | null) => void;
    onClear: () => void;
    hint: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setObjectUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const preview = objectUrl ?? currentUrl;
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt={label} className="max-h-full max-w-full object-contain" />
                    ) : (
                        <span className="text-xs text-gray-400">none</span>
                    )}
                </div>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => onPick(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-3 py-2 text-sm hover:bg-gray-200">
                    <ArrowUpTrayIcon className="h-4 w-4" /> Choose
                </button>
                {(currentUrl || file) && (
                    <button type="button" onClick={onClear} className="p-2 rounded-lg text-red-500 hover:bg-red-50" title="Remove">
                        <TrashIcon className="h-4 w-4" />
                    </button>
                )}
            </div>
            <p className="mt-1 text-xs text-gray-500">{hint}</p>
        </div>
    );
}

export default function BrandingManager() {
    const { branding, refresh } = useBranding();
    const [logo, setLogo] = useState<File | null>(null);
    const [icon, setIcon] = useState<File | null>(null);
    const [removeLogo, setRemoveLogo] = useState(false);
    const [removeIcon, setRemoveIcon] = useState(false);
    const [saving, setSaving] = useState(false);

    const currentLogo = removeLogo ? null : toDataUrl(branding.logoData, branding.logoContentType);
    const currentIcon = removeIcon ? null : toDataUrl(branding.iconData, branding.iconContentType);

    const save = async () => {
        setSaving(true);
        try {
            const form = new FormData();
            if (logo) form.append('logo', logo);
            if (icon) form.append('icon', icon);
            if (removeLogo) form.append('removeLogo', 'true');
            if (removeIcon) form.append('removeIcon', 'true');
            await BrandingService.update(form);
            setLogo(null); setIcon(null); setRemoveLogo(false); setRemoveIcon(false);
            refresh();
            toast.success('Branding saved');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save branding');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-md space-y-5 border-t border-gray-200 pt-6">
            <h2 className="font-bold text-gray-900">Branding</h2>
            <Slot
                label="Logo"
                currentUrl={currentLogo}
                file={logo}
                onPick={f => { setLogo(f); setRemoveLogo(false); }}
                onClear={() => { setLogo(null); setRemoveLogo(true); }}
                hint="Shown in the navbar and footer. PNG/SVG, max 2 MB."
            />
            <Slot
                label="Icon (favicon)"
                currentUrl={currentIcon}
                file={icon}
                onPick={f => { setIcon(f); setRemoveIcon(false); }}
                onClear={() => { setIcon(null); setRemoveIcon(true); }}
                hint="Browser tab icon. Square PNG/ICO, max 2 MB."
            />
            <button
                onClick={save}
                disabled={saving || (!logo && !icon && !removeLogo && !removeIcon)}
                className="rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2.5 hover:brightness-95 disabled:opacity-60 transition"
            >
                {saving ? 'Saving…' : 'Save branding'}
            </button>
        </div>
    );
}
