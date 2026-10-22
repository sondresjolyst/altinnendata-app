"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CpuChipIcon, Cog6ToothIcon, Squares2X2Icon, PresentationChartLineIcon, CheckBadgeIcon, TagIcon, UsersIcon, ScaleIcon, WrenchScrewdriverIcon, ShoppingBagIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';
import { fillTemplate } from '@/lib/format';
import EnquiryService from '@/services/enquiryService';

export default function AdminOverview() {
    const { locale, dict } = useDictionary();
    const [newEnquiries, setNewEnquiries] = useState(0);

    useEffect(() => {
        let current = true;
        EnquiryService.count()
            .then(count => { if (current) setNewEnquiries(count); })
            .catch(() => { /* The card still works without the number. */ });
        return () => { current = false; };
    }, []);

    const cards: { href: string, icon: typeof CpuChipIcon, title: string, text: string, badge?: string }[] = [
        { href: '/admin/content', icon: Squares2X2Icon, title: dict.admin.content, text: dict.admin.cardContent },
        { href: '/admin/builds', icon: CpuChipIcon, title: dict.admin.builds, text: dict.admin.cardBuilds },
        { href: '/admin/shop', icon: ShoppingBagIcon, title: dict.admin.shop.title, text: dict.admin.shop.card },
        { href: '/admin/enquiries', icon: ChatBubbleLeftRightIcon, title: dict.admin.enquiries.title, text: dict.admin.enquiries.card, badge: newEnquiries > 0 ? fillTemplate(dict.admin.enquiries.cardNew, { n: String(newEnquiries) }) : undefined },
        { href: '/admin/components', icon: WrenchScrewdriverIcon, title: dict.admin.components, text: dict.admin.cardComponents },
        { href: '/admin/classes', icon: TagIcon, title: dict.admin.classes, text: dict.admin.cardClasses },
        { href: '/admin/conditions', icon: CheckBadgeIcon, title: dict.admin.conditions, text: dict.admin.cardConditions },
        { href: '/admin/legal', icon: ScaleIcon, title: dict.admin.legal, text: dict.admin.cardLegal },
        { href: '/admin/stats', icon: PresentationChartLineIcon, title: dict.admin.stats, text: dict.admin.cardStats },
        { href: '/admin/users', icon: UsersIcon, title: dict.admin.users, text: dict.admin.cardUsers },
        { href: '/admin/settings', icon: Cog6ToothIcon, title: dict.admin.settings, text: dict.admin.cardSettings },
    ];

    return (
        <div className="grid sm:grid-cols-2 gap-6">
            {cards.map(card => (
                <Link key={card.href} href={localeHref(locale, card.href)} className="rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition">
                    <card.icon className="h-8 w-8 text-gray-900" />
                    <h2 className="mt-4 font-bold text-gray-900">
                        {card.title}
                        {card.badge && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{card.badge}</span>}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">{card.text}</p>
                </Link>
            ))}
        </div>
    );
}
