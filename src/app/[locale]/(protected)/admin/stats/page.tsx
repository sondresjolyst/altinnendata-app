"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdminService, { AdminStats, DailyStat, EmailStats } from '@/services/adminService';
import StatHistoryChart from '@/components/StatHistoryChart';
import { useDictionary } from '@/i18n/DictionaryProvider';

function formatBytes(n: number): string {
    if (n <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
    return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function AdminStatsPage() {
    const { dict } = useDictionary();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [history, setHistory] = useState<DailyStat[]>([]);
    const [email, setEmail] = useState<EmailStats | null>(null);

    useEffect(() => {
        AdminService.getStats().then(setStats).catch(err => toast.error(err instanceof Error ? err.message : dict.admin.statsLoadFailed));
        AdminService.getStatsHistory().then(setHistory).catch(() => { });
        AdminService.getEmailStats().then(setEmail).catch(() => { });
    }, []);

    const tiles = stats ? [
        { label: dict.stats.users, value: stats.totalUsers },
        { label: dict.stats.builds, value: stats.publishedBuilds },
        { label: dict.admin.drafts, value: stats.draftBuilds },
        { label: dict.stats.parts, value: stats.catalogParts },
        { label: dict.stats.images, value: stats.contentImages },
    ] : [];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {tiles.map(t => (
                    <div key={t.label} className="rounded-2xl border border-gray-200 p-5">
                        <div className="text-3xl font-black text-gray-900 tabular-nums">{t.value}</div>
                        <div className="mt-1 text-sm text-gray-600">{t.label}</div>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-gray-200 p-5">
                <h2 className="font-bold text-gray-900 mb-4">{dict.admin.overTime}</h2>
                <StatHistoryChart data={history} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="font-bold text-gray-900 mb-3">{dict.admin.storage}</h2>
                    {stats ? (
                        <div className="space-y-1.5 text-sm text-gray-700">
                            <div className="flex justify-between"><span className="text-gray-500">{dict.admin.uploads}</span><span className="tabular-nums">{formatBytes(stats.storageUsedBytes)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">{dict.admin.diskFree}</span><span className="tabular-nums">{formatBytes(stats.diskFreeBytes)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">{dict.admin.diskTotal}</span><span className="tabular-nums">{formatBytes(stats.diskTotalBytes)}</span></div>
                            {stats.diskTotalBytes > 0 && (
                                <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div className="h-full bg-gray-900" style={{ width: `${Math.min(100, ((stats.diskTotalBytes - stats.diskFreeBytes) / stats.diskTotalBytes) * 100)}%` }} />
                                </div>
                            )}
                        </div>
                    ) : <p className="text-sm text-gray-500">{dict.common.loading}</p>}
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="font-bold text-gray-900 mb-3">{dict.admin.emailLast.replace('{days}', String(email?.days ?? 30))}</h2>
                    {email ? (
                        <div className="space-y-1.5 text-sm text-gray-700">
                            <div className="flex justify-between"><span className="text-gray-500">{dict.admin.emailSent}</span><span className="tabular-nums">{email.requests}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">{dict.admin.emailDelivered}</span><span className="tabular-nums">{email.delivered}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">{dict.admin.emailBounces}</span><span className="tabular-nums">{email.hardBounces + email.softBounces}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">{dict.admin.emailBlocked}</span><span className="tabular-nums">{email.blocked + email.spamReports}</span></div>
                        </div>
                    ) : <p className="text-sm text-gray-500">{dict.admin.unavailable}</p>}
                </div>
            </div>
        </div>
    );
}
