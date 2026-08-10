import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ContactForm from '@/components/ContactForm';
import { COMPANY } from '@/lib/company';
import { isLocale, LOCALES, LOCALE_TAGS } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    const dict = getDictionary(locale);

    return {
        title: dict.contact.title,
        description: dict.contact.intro,
        alternates: {
            canonical: `/${locale}/contact`,
            languages: Object.fromEntries(LOCALES.map(l => [LOCALE_TAGS[l], `/${l}/contact`])),
        },
    };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();
    const dict = getDictionary(locale);

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
            <h1 className="text-3xl font-black text-gray-900">{dict.contact.title}</h1>
            <p className="mt-1 text-gray-600 mb-8">{dict.contact.intro}</p>

            <Suspense fallback={null}>
                <ContactForm />
            </Suspense>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-600">
                <a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} className="hover:text-gray-900">
                    {dict.contact.callUs}: {COMPANY.phone}
                </a>
                <a href={`mailto:${COMPANY.email}`} className="hover:text-gray-900">
                    {dict.contact.emailUs}: {COMPANY.email}
                </a>
            </div>
        </div>
    );
}
