"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TextInput from '@/components/TextInput';
import PasswordInput from '@/components/PasswordInput';
import Alert from '@/components/Alert';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function LoginPage() {
    const router = useRouter();
    const { locale, dict } = useDictionary();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        const result = await signIn('credentials', { email, password, redirect: false });
        setSubmitting(false);
        if (result?.error) {
            setError(dict.auth.invalidCredentials);
            return;
        }
        router.push(localeHref(locale, '/admin'));
        router.refresh();
    };

    return (
        <div className="max-w-md mx-auto px-4 py-16">
            <h1 className="text-2xl font-black text-gray-900 mb-6">{dict.auth.signInTitle}</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}
                <TextInput label={dict.auth.email} name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                <PasswordInput label={dict.auth.password} name="password" value={password} onChange={e => setPassword(e.target.value)} required />
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-2.5 hover:brightness-95 disabled:opacity-60 transition"
                >
                    {submitting ? dict.auth.signingIn : dict.auth.signIn}
                </button>
            </form>
            <p className="mt-6 text-sm text-gray-600">
                <Link href={localeHref(locale, '/reset-password')} className="font-semibold text-gray-900">
                    {dict.auth.forgotPassword}
                </Link>
            </p>
        </div>
    );
}
