"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function AdminShopLayout({ children }: { children: React.ReactNode }) {
    const { locale, dict } = useDictionary();
    const pathname = usePathname();

    const ordersHref = localeHref(locale, '/admin/shop');
    const settingsHref = localeHref(locale, '/admin/shop/settings');
    const onSettings = pathname === settingsHref || pathname.startsWith(`${settingsHref}/`);

    const links = [
        { href: ordersHref, label: dict.admin.shop.orders, current: !onSettings },
        { href: settingsHref, label: dict.admin.shop.settings, current: onSettings },
    ];

    return (
        <div className="space-y-6">
            <nav aria-label={dict.admin.shop.subNavigation} className="flex gap-1 border-b border-gray-200">
                {links.map(link => (
                    <Link
                        key={link.href}
                        href={link.href}
                        aria-current={link.current ? 'page' : undefined}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                            link.current ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
            {children}
        </div>
    );
}
