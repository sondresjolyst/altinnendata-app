"use client";

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    busy: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/** A modal confirmation. The native dialog traps focus, closes on Escape and gives focus back to the opener. */
export default function ConfirmDialog({ title, message, confirmLabel, cancelLabel, busy, onConfirm, onClose }: ConfirmDialogProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        dialog?.showModal();
        return () => {
            if (dialog?.open) dialog.close();
        };
    }, []);

    const button = 'rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';

    return (
        <dialog
            ref={ref}
            aria-labelledby="confirm-heading"
            onCancel={e => {
                // Escape does nothing while the request runs.
                if (busy) e.preventDefault();
            }}
            onClose={onClose}
            className="m-auto w-full max-w-md rounded-2xl p-6 shadow-xl backdrop:bg-black/40"
        >
            <div className="space-y-4">
                <h2 id="confirm-heading" className="font-bold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-700">{message}</p>
                <div className="flex justify-end gap-3">
                    <button type="button" disabled={busy} onClick={onClose} className={`${button} border border-gray-300 text-gray-900 hover:bg-gray-50`}>
                        {cancelLabel}
                    </button>
                    <button type="button" disabled={busy} onClick={onConfirm} className={`${button} bg-gray-900 text-white hover:bg-gray-800`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
