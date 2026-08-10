interface AlertProps {
    variant?: 'error' | 'success' | 'info';
    children: React.ReactNode;
}

const styles: Record<NonNullable<AlertProps['variant']>, string> = {
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info: 'bg-gray-50 border-gray-200 text-gray-700',
};

export default function Alert({ variant = 'info', children }: AlertProps) {
    return (
        <div className={`rounded-lg border px-3 py-2 text-sm ${styles[variant]}`} role="alert">
            {children}
        </div>
    );
}
