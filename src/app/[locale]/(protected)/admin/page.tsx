"use client";

import Link from 'next/link';
import { CpuChipIcon, Cog6ToothIcon, Squares2X2Icon, PresentationChartLineIcon, UsersIcon, ScaleIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';

export default function AdminOverview() {
    const { locale, dict } = useDictionary();

    const cards = [
        { href: '/admin/content', icon: Squares2X2Icon, title: dict.admin.content, text: 'Sett sammen forsiden av seksjoner, per språk.' },
        { href: '/admin/builds', icon: CpuChipIcon, title: dict.admin.builds, text: 'Opprett, rediger og publiser datamaskiner.' },
        { href: '/admin/components', icon: WrenchScrewdriverIcon, title: dict.admin.components, text: 'Kategorier, produsenter og deler.' },
        { href: '/admin/legal', icon: ScaleIcon, title: dict.admin.legal, text: 'Vilkår, personvern og informasjonskapsler.' },
        { href: '/admin/stats', icon: PresentationChartLineIcon, title: dict.admin.stats, text: 'Totaler, trender, lagring og e-post.' },
        { href: '/admin/users', icon: UsersIcon, title: dict.admin.users, text: 'Inviter brukere og styr roller.' },
        { href: '/admin/settings', icon: Cog6ToothIcon, title: dict.admin.settings, text: 'Firmaopplysninger og kontaktmottaker.' },
    ];

    return (
        <div className="grid sm:grid-cols-2 gap-6">
            {cards.map(card => (
                <Link key={card.href} href={localeHref(locale, card.href)} className="rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition">
                    <card.icon className="h-8 w-8 text-gray-900" />
                    <h2 className="mt-4 font-bold text-gray-900">{card.title}</h2>
                    <p className="mt-1 text-sm text-gray-600">{card.text}</p>
                </Link>
            ))}
        </div>
    );
}
