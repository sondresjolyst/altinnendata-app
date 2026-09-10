"use client";

import React, { useEffect, useRef } from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    error?: string;
    autoGrow?: boolean;
    maxRows?: number;
}

export default function TextArea({
    label,
    error,
    id,
    required,
    autoGrow = true,
    rows = 3,
    maxRows = 12,
    value,
    ...props
}: TextAreaProps) {
    const inputId = id ?? props.name;
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || !autoGrow) return;

        const style = getComputedStyle(el);
        const lineHeight = parseFloat(style.lineHeight) || 20;
        const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        // scrollHeight covers content + padding only; border-box height needs the border on top.
        const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
        const boxFor = (lines: number) => lineHeight * lines + padding + border;

        el.style.height = 'auto';
        const wanted = el.scrollHeight + border;
        el.style.height = `${Math.min(Math.max(wanted, boxFor(Number(rows))), boxFor(maxRows))}px`;
    }, [value, autoGrow, rows, maxRows]);

    return (
        <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-600"> *</span>}
            </label>
            <textarea
                ref={ref}
                id={inputId}
                rows={rows}
                value={value}
                aria-required={required || undefined}
                // Auto-growing boxes drop the resize handle: the next keystroke would undo the drag.
                className={`w-full rounded-lg border px-3 py-2 text-sm leading-relaxed text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary ${
                    autoGrow ? 'resize-none' : 'resize-y'
                } ${error ? 'border-red-400' : 'border-gray-300'}`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
