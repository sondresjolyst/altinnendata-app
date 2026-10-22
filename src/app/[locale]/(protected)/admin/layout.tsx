"use client";

import { ADMIN_ROLE } from '@/lib/roles';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';
import { AdminShell } from '@sjolystinnovation/app-kit/admin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { locale, dict } = useDictionary();

    const tabs = [
        { href: localeHref(locale, '/admin'), label: dict.admin.dashboard },
        { href: localeHref(locale, '/admin/content'), label: dict.admin.content },
        { href: localeHref(locale, '/admin/builds'), label: dict.admin.builds },
        { href: localeHref(locale, '/admin/shop'), label: dict.admin.shop.title },
        { href: localeHref(locale, '/admin/enquiries'), label: dict.admin.enquiries.title },
        { href: localeHref(locale, '/admin/components'), label: dict.admin.components },
        { href: localeHref(locale, '/admin/classes'), label: dict.admin.classes },
        { href: localeHref(locale, '/admin/conditions'), label: dict.admin.conditions },
        { href: localeHref(locale, '/admin/legal'), label: dict.admin.legal },
        { href: localeHref(locale, '/admin/stats'), label: dict.admin.stats },
        { href: localeHref(locale, '/admin/users'), label: dict.admin.users },
        { href: localeHref(locale, '/admin/settings'), label: dict.admin.settings },
    ];

    return (
        <AdminShell
            role={ADMIN_ROLE}
            title={dict.admin.title}
            strings={{ breadcrumb: dict.admin.breadcrumb }}
            tabs={tabs}
            fallback={<div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center text-gray-500">{dict.common.loading}</div>}
            deniedHref={localeHref(locale, '/')}
        >
            {children}
        </AdminShell>
    );
}
