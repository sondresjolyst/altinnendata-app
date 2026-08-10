"use client";

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ADMIN_ROLE } from '@/lib/roles';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const { locale, dict } = useDictionary();
    const isAdmin = (session?.user?.roles ?? []).includes(ADMIN_ROLE);

    const tabs = [
        { href: localeHref(locale, '/admin'), label: dict.admin.dashboard },
        { href: localeHref(locale, '/admin/content'), label: dict.admin.content },
        { href: localeHref(locale, '/admin/builds'), label: dict.admin.builds },
        { href: localeHref(locale, '/admin/components'), label: dict.admin.components },
        { href: localeHref(locale, '/admin/legal'), label: dict.admin.legal },
        { href: localeHref(locale, '/admin/stats'), label: dict.admin.stats },
        { href: localeHref(locale, '/admin/users'), label: dict.admin.users },
        { href: localeHref(locale, '/admin/settings'), label: dict.admin.settings },
    ];

    useEffect(() => {
        if (status === 'authenticated' && !isAdmin) {
            router.push(localeHref(locale, '/'));
        }
    }, [status, isAdmin, router, locale]);

    if (status !== 'authenticated' || !isAdmin) {
        return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center text-gray-500">{dict.common.loading}</div>;
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
            <h1 className="text-2xl font-black text-gray-900 mb-4">{dict.admin.title}</h1>
            <nav className="flex gap-1 border-b border-gray-200 mb-8 overflow-x-auto overflow-y-hidden no-scrollbar">
                {tabs.map(tab => {
                    const active = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors shrink-0 whitespace-nowrap ${
                                active ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
            {children}
        </div>
    );
}
