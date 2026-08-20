import Link from 'next/link';
import { BuildSummary } from '@/services/buildService';
import ContentImage from '@/components/ContentImage';
import { localeHref, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { formatPrice } from '@/lib/format';

export default function BuildCard({ build, locale }: { build: BuildSummary; locale: Locale }) {
    const dict = getDictionary(locale);
    const availability = dict.builds.availability[build.availability.toLowerCase() as 'available' | 'reserved' | 'sold'];
    const badgeTone = build.availability === 'Sold'
        ? 'bg-gray-200 text-gray-700'
        : build.availability === 'Reserved'
            ? 'bg-amber-100 text-amber-800'
            : 'bg-emerald-100 text-emerald-800';

    return (
        <Link
            href={localeHref(locale, `/builds/${build.slug}`)}
            className="group block rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition"
        >
            <div className="aspect-video bg-gray-100 relative overflow-hidden">
                {build.coverImageId ? (
                    <ContentImage
                        imageId={build.coverImageId}
                        alt={build.title}
                        sizes="(max-width: 768px) 100vw, 400px"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl font-black">
                        {build.title.slice(0, 2).toUpperCase()}
                    </div>
                )}
                {!build.published && (
                    <span className="absolute top-2 left-2 rounded bg-gray-900/80 text-white text-xs px-2 py-0.5">
                        {dict.builds.draft}
                    </span>
                )}
            </div>
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-gray-900 group-hover:text-gray-700">{build.title}</h3>
                    <span className={`shrink-0 rounded-full text-xs font-semibold px-2 py-0.5 ${badgeTone}`}>
                        {availability}
                    </span>
                </div>
                {build.summary && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{build.summary}</p>}
                {build.priceNok != null && (
                    <p className="mt-3 text-xl font-extrabold text-gray-900">{formatPrice(build.priceNok, locale)}</p>
                )}
            </div>
        </Link>
    );
}
