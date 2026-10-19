"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useBranding } from '@sjolystinnovation/app-kit/branding';
import { brregUrl, formatOrgNumber, type CompanyInfo } from '@/lib/companyInfo';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function Footer({ company }: { company: CompanyInfo }) {
    const year = new Date().getFullYear();
    const { logoUrl } = useBranding();
    const { locale, dict } = useDictionary();
    const { status } = useSession();
    const href = (path: string) => localeHref(locale, path);
    const legalName = company.legalName || company.name;

    return (
        <footer className="border-t border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl ?? '/logo.png'} alt="" className="h-7 w-7 rounded-md object-cover" />
                    <span className="text-sm font-semibold text-gray-900">{company.name}</span>
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

                <div className="space-y-0.5 text-center text-xs text-gray-600 sm:text-right">
                    <p>© {year} {legalName}</p>
                    {/* Foretaksregisterloven § 10-2 wants the register next to the org number. */}
                    {company.orgNumber && (
                        <p>
                            {dict.footer.orgNumber}{' '}
                            <a
                                href={brregUrl(company.orgNumber)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-4 hover:text-gray-900"
                            >
                                {formatOrgNumber(company)}
                            </a>{' '}
                            {dict.footer.register}
                        </p>
                    )}
                    {company.address && <p>{company.address}</p>}
                    <p>
                        {dict.footer.createdBy}{' '}
                        <a
                            href="https://www.sjolystinnovation.no/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-4 hover:text-gray-900"
                        >
                            Sjølyst Innovation AS
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}
