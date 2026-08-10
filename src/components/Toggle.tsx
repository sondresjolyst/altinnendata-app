"use client";

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
}

export default function Toggle({ checked, onChange, label }: ToggleProps) {
    return (
        <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700 cursor-pointer select-none">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    checked ? 'bg-primary' : 'bg-gray-200'
                }`}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        checked ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                />
            </button>
            {label}
        </label>
    );
}
