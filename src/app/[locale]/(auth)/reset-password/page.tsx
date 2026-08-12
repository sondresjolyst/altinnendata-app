"use client";

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import TextInput from '@/components/TextInput';
import PasswordInput from '@/components/PasswordInput';
import Alert from '@/components/Alert';
import UserService from '@/services/userService';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
    );
}

function ResetPasswordForm() {
    const params = useSearchParams();
    const { locale, dict } = useDictionary();

    const invitedEmail = params.get('email') ?? '';
    const invitedCode = params.get('code') ?? '';

    const [step, setStep] = useState<1 | 2>(invitedCode ? 2 : 1);
    const [email, setEmail] = useState(invitedEmail);
    const [code, setCode] = useState(invitedCode);
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const loginHref = localeHref(locale, '/login');

    const sendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await UserService.requestPasswordReset({ email });
            setStep(2);
        } catch (err) {
            setError(err instanceof Error ? err.message : dict.common.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    const reset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await UserService.resetPassword({ email, code, newPassword });
            setSuccess(dict.auth.resetDone);
        } catch (err) {
            setError(err instanceof Error ? err.message : dict.common.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto px-4 py-16">
            <h1 className="text-2xl font-black text-gray-900 mb-1">{dict.auth.resetTitle}</h1>
            <p className="text-sm text-gray-600 mb-6">
                <Link href={loginHref} className="font-semibold text-gray-900">{dict.auth.signIn}</Link>
            </p>

            {success ? (
                <Alert variant="success">
                    {success}
                    <Link href={loginHref} className="block mt-3 font-semibold text-gray-900">{dict.auth.signIn} →</Link>
                </Alert>
            ) : step === 1 ? (
                <form onSubmit={sendCode} className="space-y-4">
                    {error && <Alert variant="error">{error}</Alert>}
                    <p className="text-sm text-gray-600">{dict.auth.resetIntro}</p>
                    <TextInput label={dict.auth.email} name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-2.5 hover:brightness-95 disabled:opacity-60 transition"
                    >
                        {loading ? dict.common.saving : dict.auth.requestCode}
                    </button>
                </form>
            ) : (
                <form onSubmit={reset} className="space-y-4">
                    {error && <Alert variant="error">{error}</Alert>}
                    <TextInput label={dict.auth.email} name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    <TextInput label={dict.auth.resetCode} name="code" value={code} onChange={e => setCode(e.target.value)} required />
                    <PasswordInput label={dict.auth.newPassword} name="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    <p className="text-xs text-gray-500">{dict.validation.password}</p>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-2.5 hover:brightness-95 disabled:opacity-60 transition"
                    >
                        {loading ? dict.common.saving : dict.auth.setPassword}
                    </button>
                </form>
            )}
        </div>
    );
}
