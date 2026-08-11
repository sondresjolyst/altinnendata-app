import Link from 'next/link';
import Markdown from '@/components/Markdown';
import { LegalPage } from '@/services/legalService';
import { formatDate } from '@/lib/format';
import { getDictionary } from '@/i18n/dictionaries';
import { localeHref, type Locale } from '@/i18n/config';

export default function LegalPageView({ page, locale, title }: { page: LegalPage | null; locale: Locale; title: string }) {
    const dict = getDictionary(locale);

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-6">
            <h1 className="text-3xl font-black text-gray-900">{page?.title ?? title}</h1>
            {page && (
                <p className="text-xs text-gray-500">
                    {dict.legal.updated}: {formatDate(page.updatedAt, locale)}
                </p>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 text-sm text-gray-600">
                {page ? <Markdown>{page.bodyMarkdown}</Markdown> : <p>{dict.legal.missing}</p>}
            </div>

            <p className="text-xs text-gray-500">
                <Link href={localeHref(locale, '/')} className="hover:text-gray-900 transition-colors">
                    ← {dict.common.toFrontPage}
                </Link>
            </p>
        </div>
    );
}
