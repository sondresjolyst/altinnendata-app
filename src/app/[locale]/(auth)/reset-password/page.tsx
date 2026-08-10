"use client";

import { useState } from 'react';
import Link from 'next/link';
import TextInput from '@/components/TextInput';
import PasswordInput from '@/components/PasswordInput';
import Alert from '@/components/Alert';
import UserService from '@/services/userService';

export default function ResetPasswordPage() {
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const sendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await UserService.requestPasswordReset({ email });
            setStep(2);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const reset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await UserService.resetPassword({ email, code, newPassword });
            setSuccess(res.message);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto px-4 py-16">
            <h1 className="text-2xl font-black text-gray-900 mb-1">Reset password</h1>
            <p className="text-sm text-gray-600 mb-6">
                Remembered it? <Link href="/login" className="font-semibold text-gray-900">Sign in</Link>
            </p>

            {success ? (
                <Alert variant="success">
                    {success}
                    <Link href="/login" className="block mt-3 font-semibold text-gray-900">Back to sign in →</Link>
                </Alert>
            ) : step === 1 ? (
                <form onSubmit={sendCode} className="space-y-4">
                    {error && <Alert variant="error">{error}</Alert>}
                    <TextInput label="Email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-2.5 hover:brightness-95 disabled:opacity-60 transition"
                    >
                        {loading ? 'Sending…' : 'Send reset code'}
                    </button>
                </form>
            ) : (
                <form onSubmit={reset} className="space-y-4">
                    <p className="text-sm text-gray-600">Check your email for the reset code.</p>
                    {error && <Alert variant="error">{error}</Alert>}
                    <TextInput label="Email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    <TextInput label="Reset code" name="code" value={code} onChange={e => setCode(e.target.value)} required />
                    <PasswordInput label="New password" name="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-2.5 hover:brightness-95 disabled:opacity-60 transition"
                    >
                        {loading ? 'Resetting…' : 'Reset password'}
                    </button>
                </form>
            )}
        </div>
    );
}
