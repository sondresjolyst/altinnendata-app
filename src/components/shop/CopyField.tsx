"use client";

import { toast } from '@sjolystinnovation/app-kit/toast';
import { useDictionary } from '@/i18n/DictionaryProvider';

/** A value with a button that copies it to the clipboard. */
export default function CopyField({ label, value }: { label: string; value: string }) {
    const { dict } = useDictionary();
    const text = dict.admin.shop;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(text.copied);
        } catch {
            toast.error(text.actionFailed);
        }
    };

    return (
        <div className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
                <div className="break-words text-sm text-gray-900">{value}</div>
            </div>
            <button
                type="button"
                onClick={() => void copy()}
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50"
            >
                {text.copy.replace('{label}', label)}
            </button>
        </div>
    );
}
