import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export default function TextInput({ label, error, id, ...props }: TextInputProps) {
    const inputId = id ?? props.name;
    return (
        <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <input
                id={inputId}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary ${
                    error ? 'border-red-400' : 'border-gray-300'
                }`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
