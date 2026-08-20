import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ContactForm from '@/components/ContactForm';
import { COMPANY } from '@/lib/company';
import { isLocale, Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo/metadata';
import { publicGetOptional } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { BuildDetail } from '@/services/buildService';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    const dict = getDictionary(locale);

    return pageMetadata({
        locale,
        path: '/contact',
        title: dict.contact.title,
        description: dict.contact.intro,
    });
}

async function findBuild(slug: string | string[] | undefined, locale: Locale) {
    const wanted = Array.isArray(slug) ? slug[0] : slug;
    if (!wanted) return null;

    const build = await publicGetOptional<BuildDetail>(
        `/builds/${encodeURIComponent(wanted)}?locale=${locale}`,
        { tags: [REVALIDATE_TARGETS.builds] },
    );
    return build ? { slug: build.slug, title: build.title } : null;
}

export default async function ContactPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ build?: string | string[] }>;
}) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();
    const dict = getDictionary(locale);

    const build = await findBuild((await searchParams).build, locale);

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
            <h1 className="text-3xl font-black text-gray-900">{dict.contact.title}</h1>
            <p className="mt-1 text-gray-600 mb-8">{build ? dict.contact.introBuild : dict.contact.intro}</p>

            <ContactForm build={build} />

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-600">
                <a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} className="hover:text-gray-900">
                    {dict.contact.callUs}: {COMPANY.phone}
                </a>
                <a href={`mailto:${COMPANY.email}`} className="hover:text-gray-900">
                    {dict.contact.emailUs}: {COMPANY.email}
                </a>
            </div>
        </div>
    );
}
