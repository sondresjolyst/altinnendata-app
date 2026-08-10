"use client";

import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export default function PasswordInput({ label, error, id, ...props }: PasswordInputProps) {
    const [visible, setVisible] = useState(false);
    const inputId = id ?? props.name;
    return (
        <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <div className="relative">
                <input
                    id={inputId}
                    type={visible ? 'text' : 'password'}
                    className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary ${
                        error ? 'border-red-400' : 'border-gray-300'
                    }`}
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setVisible(v => !v)}
                    className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                >
                    {visible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
