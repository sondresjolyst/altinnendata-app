import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { LegalPage } from '@/services/legalService';
import { formatDate } from '@/lib/format';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';

export default function LegalPageView({ page, locale, title }: { page: LegalPage | null; locale: Locale; title: string }) {
    const dict = getDictionary(locale);

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
            <h1 className="text-3xl font-black text-gray-900">{page?.title ?? title}</h1>

            {page ? (
                <>
                    <p className="mt-2 text-sm text-gray-500">
                        {dict.legal.updated}: {formatDate(page.updatedAt, locale)}
                    </p>
                    <div className="prose prose-sm max-w-none text-gray-700 mt-8">
                        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                            {page.bodyMarkdown}
                        </Markdown>
                    </div>
                </>
            ) : (
                <p className="mt-8 text-gray-500">{dict.legal.missing}</p>
            )}
        </div>
    );
}
