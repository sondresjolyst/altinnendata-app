"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import TextInput from './TextInput';
import ContactService from '@/services/contactService';
import { contactSchema, fieldErrors, ContactInput } from '@/lib/validation';
import { useDictionary } from '@/i18n/DictionaryProvider';

export default function ContactForm({ build }: { build?: { slug: string; title: string } | null }) {
    const { dict } = useDictionary();

    const empty: ContactInput = {
        name: '',
        email: '',
        phone: '',
        useCase: '',
        budgetNok: null,
        buildSlug: build?.slug ?? '',
        message: '',
    };

    const [form, setForm] = useState<ContactInput>(empty);
    const [errors, setErrors] = useState<Partial<Record<keyof ContactInput, string>>>({});
    const [submitting, setSubmitting] = useState(false);

    const update = (field: keyof ContactInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [field]: e.target.value }));

    const updateBudget = (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, budgetNok: e.target.value === '' ? null : Number(e.target.value) }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = contactSchema.safeParse(form);
        if (!parsed.success) {
            setErrors(fieldErrors(parsed.error, dict));
            return;
        }
        setErrors({});
        setSubmitting(true);
        try {
            await ContactService.send(parsed.data);
            toast.success(dict.contact.sent);
            setForm(empty);
        } catch {
            toast.error(dict.contact.failed);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {build && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="block text-sm font-medium text-gray-700">{dict.contact.build}</span>
                    <span className="text-sm text-gray-900">{build.title}</span>
                </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
                <TextInput label={dict.contact.name} name="name" value={form.name} onChange={update('name')} error={errors.name} required />
                <TextInput label={dict.contact.email} name="email" type="email" value={form.email} onChange={update('email')} error={errors.email} required />
                <TextInput label={dict.contact.phone} name="phone" value={form.phone ?? ''} onChange={update('phone')} error={errors.phone} />
                {!build && (
                    <>
                        <TextInput
                            label={dict.contact.useCase}
                            name="useCase"
                            value={form.useCase ?? ''}
                            onChange={update('useCase')}
                            error={errors.useCase}
                            placeholder={dict.contact.useCasePlaceholder}
                        />
                        <TextInput
                            label={dict.contact.budget}
                            name="budgetNok"
                            type="number"
                            value={form.budgetNok?.toString() ?? ''}
                            onChange={updateBudget}
                            error={errors.budgetNok}
                        />
                    </>
                )}
            </div>
            <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    {dict.contact.message}
                    <span className="text-red-600"> *</span>
                </label>
                <textarea
                    id="message"
                    name="message"
                    rows={5}
                    aria-required
                    value={form.message}
                    onChange={update('message')}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary ${errors.message ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message}</p>}
            </div>
            <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2.5 hover:brightness-95 disabled:opacity-60 transition"
            >
                {submitting ? dict.contact.sending : dict.contact.send}
            </button>
        </form>
    );
}
