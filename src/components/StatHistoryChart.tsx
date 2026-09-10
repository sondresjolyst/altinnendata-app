"use client";

import { useState } from 'react';
import { DailyStat } from '@/services/adminService';
import { useDictionary } from '@/i18n/DictionaryProvider';
import type { Dictionary } from '@/i18n/dictionaries';

type SeriesKey = 'totalUsers' | 'publishedBuilds' | 'draftBuilds' | 'soldBuilds' | 'contentImages';

const SERIES: { key: SeriesKey; label: (dict: Dictionary) => string; color: string }[] = [
    { key: 'totalUsers', label: dict => dict.stats.users, color: '#2563eb' },
    { key: 'publishedBuilds', label: dict => dict.admin.published, color: '#16a34a' },
    { key: 'draftBuilds', label: dict => dict.admin.drafts, color: '#d97706' },
    { key: 'soldBuilds', label: dict => dict.builds.availability.sold, color: '#0d9488' },
    { key: 'contentImages', label: dict => dict.stats.images, color: '#9333ea' },
];

const W = 720;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 32 };

export default function StatHistoryChart({ data }: { data: DailyStat[] }) {
    const { dict } = useDictionary();
    const [hidden, setHidden] = useState<SeriesKey[]>([]);

    const toggle = (key: SeriesKey) =>
        setHidden(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));

    if (data.length === 0) {
        return <p className="text-sm text-gray-500">{dict.admin.noHistory}</p>;
    }

    const shown = SERIES.filter(s => !hidden.includes(s.key));
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    // An API without a given series sends no value; treat it as zero rather than poisoning
    // the whole scale with NaN.
    const value = (d: DailyStat, key: SeriesKey) => Number(d[key]) || 0;
    const maxVal = Math.max(1, ...data.flatMap(d => shown.map(s => value(d, s.key))));
    const n = data.length;

    const x = (i: number) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;

    const path = (key: SeriesKey) =>
        data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(value(d, key)).toFixed(1)}`).join(' ');

    const ticks = [...new Set([0, Math.round(maxVal / 2), maxVal])];
    const labelIdx = n === 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

    return (
        <div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={dict.admin.overTime}>
                {ticks.map(t => (
                    <g key={t}>
                        <line x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} stroke="#e5e7eb" strokeWidth={1} />
                        <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#9ca3af">{t}</text>
                    </g>
                ))}
                {labelIdx.map(i => (
                    <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="#9ca3af">{data[i].date.slice(5)}</text>
                ))}
                {shown.map(s => (
                    <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                ))}
            </svg>
            <div className="mt-3 flex flex-wrap gap-2">
                {SERIES.map(s => {
                    const off = hidden.includes(s.key);
                    return (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => toggle(s.key)}
                            aria-pressed={!off}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                                off
                                    ? 'border-gray-200 bg-white text-gray-400'
                                    : 'border-gray-300 bg-gray-50 text-gray-700'
                            }`}
                        >
                            <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: off ? '#d1d5db' : s.color }}
                            />
                            {s.label(dict)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
