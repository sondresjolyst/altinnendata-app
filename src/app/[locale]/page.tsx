import { notFound } from 'next/navigation';
import SectionRenderer from '@/components/SectionRenderer';
import { Section } from '@/types/content';
import { defaultSections } from '@/lib/defaultSections';
import { publicGet } from '@/lib/publicApi';
import { fetchImageDimensions } from '@/services/imageService';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { isLocale } from '@/i18n/config';

export const revalidate = 60;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();

    const data = await publicGet<Section[]>(`/content/home?locale=${locale}`, { tags: [REVALIDATE_TARGETS.home] });
    const sections = data && data.length > 0 ? data : defaultSections(locale);

    // Only image sections need dimensions; every other image sits in a fixed-ratio box.
    const imageDimensions = await fetchImageDimensions(
        sections.filter(section => section.type === 'image').map(section => section.imageId),
        [REVALIDATE_TARGETS.home],
    );

    return (
        <div>
            {sections.map(section => (
                <SectionRenderer key={section.id} section={section} locale={locale} imageDimensions={imageDimensions} />
            ))}
        </div>
    );
}
