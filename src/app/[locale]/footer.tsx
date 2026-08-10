"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useBranding } from '@/components/BrandingProvider';
import { COMPANY } from '@/lib/company';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function Footer() {
    const year = new Date().getFullYear();
    const { logoUrl } = useBranding();
    const { locale, dict } = useDictionary();
    const { status } = useSession();
    const href = (path: string) => localeHref(locale, path);

    return (
        <footer className="border-t border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl ?? '/logo.png'} alt="" className="h-7 w-7 rounded-md object-cover" />
                    <span className="text-sm font-semibold text-gray-900">{COMPANY.name}</span>
                    {COMPANY.orgNumber && (
                        <span className="text-xs text-gray-500">{dict.footer.orgNumber} {COMPANY.orgNumber}</span>
                    )}
                </div>

                <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-600">
                    <Link href={href('/contact')} className="hover:text-gray-900">{dict.nav.contact}</Link>
                    <Link href={href('/terms')} className="hover:text-gray-900">{dict.footer.terms}</Link>
                    <Link href={href('/privacy')} className="hover:text-gray-900">{dict.footer.privacy}</Link>
                    <Link href={href('/cookies')} className="hover:text-gray-900">{dict.footer.cookies}</Link>
                    {status !== 'authenticated' && (
                        <Link href={href('/login')} className="hover:text-gray-900">{dict.nav.signIn}</Link>
                    )}
                </nav>

                <p className="text-xs text-gray-400">
                    © {year} {COMPANY.name} · {dict.footer.rights}
                </p>
            </div>
        </footer>
    );
}
