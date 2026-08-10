"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ArrowRightStartOnRectangleIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useBranding } from '@/components/BrandingProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { ADMIN_ROLE } from '@/lib/roles';
import { COMPANY } from '@/lib/company';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function Navbar() {
    const { data: session, status } = useSession();
    const isAuthenticated = status === 'authenticated';
    const isAdmin = (session?.user?.roles ?? []).includes(ADMIN_ROLE);
    const { logoUrl } = useBranding();
    const { locale, dict } = useDictionary();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const close = () => setOpen(false);
    const href = (path: string) => localeHref(locale, path);

    const links = [
        { href: href('/builds'), label: dict.nav.builds },
        { href: href('/contact'), label: dict.nav.contact },
        ...(isAdmin ? [{ href: href('/admin'), label: dict.nav.admin }] : []),
    ];

    const linkClass = (target: string) =>
        `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            pathname === target
                ? 'text-gray-900 bg-gray-100'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        }`;

    return (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-2 max-w-7xl mx-auto">

                <Link href={href('/')} onClick={close} className="flex items-center gap-2.5 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl ?? '/logo.png'} alt={COMPANY.name} className="h-9 w-9 rounded-lg object-cover" />
                    <span className="text-sm font-bold tracking-wide text-gray-900">
                        {COMPANY.name}
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1">
                    {links.map(l => (
                        <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                            {l.label}
                        </Link>
                    ))}
                    <LocaleSwitcher />
                    {isAuthenticated ? (
                        <button
                            onClick={() => signOut({ callbackUrl: href('/') })}
                            title={dict.nav.signOut}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                            <span>{dict.nav.signOut}</span>
                        </button>
                    ) : null}
                </nav>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setOpen(o => !o)}
                    aria-label={open ? dict.nav.closeMenu : dict.nav.openMenu}
                    aria-expanded={open}
                    className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                >
                    {open ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile menu */}
            {open && (
                <nav className="md:hidden border-t border-gray-200 bg-white px-4 py-2 flex flex-col gap-1">
                    {links.map(l => (
                        <Link key={l.href} href={l.href} onClick={close} className={`${linkClass(l.href)} w-full`}>
                            {l.label}
                        </Link>
                    ))}
                    <div className="px-3 py-1.5">
                        <LocaleSwitcher />
                    </div>
                    {isAuthenticated ? (
                        <button
                            onClick={() => {
                                close();
                                signOut({ callbackUrl: href('/') });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors w-full"
                        >
                            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                            <span>{dict.nav.signOut}</span>
                        </button>
                    ) : null}
                </nav>
            )}
        </header>
    );
}
