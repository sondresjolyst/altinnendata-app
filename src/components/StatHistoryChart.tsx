"use client";

import { DailyStat } from '@/services/adminService';

type SeriesKey = 'totalUsers' | 'publishedBuilds' | 'draftBuilds' | 'contentImages';

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
    { key: 'totalUsers', label: 'Users', color: '#2563eb' },
    { key: 'publishedBuilds', label: 'Published', color: '#16a34a' },
    { key: 'draftBuilds', label: 'Drafts', color: '#d97706' },
    { key: 'contentImages', label: 'Images', color: '#9333ea' },
];

const W = 720;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 32 };

export default function StatHistoryChart({ data }: { data: DailyStat[] }) {
    if (data.length === 0) {
        return <p className="text-sm text-gray-500">No history yet — check back tomorrow.</p>;
    }

    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const maxVal = Math.max(1, ...data.flatMap(d => SERIES.map(s => d[s.key])));
    const n = data.length;

    const x = (i: number) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;

    const path = (key: SeriesKey) =>
        data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(' ');

    const ticks = [0, Math.round(maxVal / 2), maxVal];
    const labelIdx = n === 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

    return (
        <div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Stats over time">
                {ticks.map(t => (
                    <g key={t}>
                        <line x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} stroke="#e5e7eb" strokeWidth={1} />
                        <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#9ca3af">{t}</text>
                    </g>
                ))}
                {labelIdx.map(i => (
                    <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="#9ca3af">{data[i].date.slice(5)}</text>
                ))}
                {SERIES.map(s => (
                    <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                ))}
            </svg>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {SERIES.map(s => (
                    <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
