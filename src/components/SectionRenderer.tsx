import { Suspense } from 'react';
import Link from 'next/link';
import Markdown from '@/components/Markdown';
import ContentImage from '@/components/ContentImage';
import type { ImageDimensionsMap } from '@/services/imageService';
import { CheckIcon } from '@heroicons/react/24/outline';
import { Section } from '@/types/content';
import FeaturedBuilds from './FeaturedBuilds';
import ContactForm from './ContactForm';
import StatsBand from './StatsBand';
import SmartLink from './SmartLink';
import { localeHref, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

function ScrimText({ text, big }: { text: string; big?: boolean }) {
    if (!text) return null;
    return (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6">
            <p className={`text-white font-black text-center whitespace-pre-line ${big ? 'text-3xl sm:text-5xl max-w-3xl' : 'text-2xl sm:text-4xl max-w-2xl'}`}>{text}</p>
        </div>
    );
}

export default function SectionRenderer({
    section,
    locale,
    imageDimensions = {},
}: {
    section: Section;
    locale: Locale;
    /** Intrinsic dimensions by image id, for the layouts that let an image keep its aspect ratio. */
    imageDimensions?: ImageDimensionsMap;
}) {
    if (!section.visible) return null;

    const dict = getDictionary(locale);
    const href = (path: string) => localeHref(locale, path);

    switch (section.type) {
        case 'hero': {
            return (
                <section className="relative isolate overflow-hidden bg-gray-900 flex items-center aspect-square sm:aspect-[3/2] sm:min-h-[420px] lg:aspect-[12/5] xl:aspect-[16/5]">
                    <ContentImage
                        imageId={section.backgroundImageId}
                        fallbackSrc="/hero.jpg"
                        alt=""
                        aria-hidden
                        priority
                        sizes="100vw"
                        className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_20%] sm:object-[50%_12%]"
                    />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/65 to-black/45 sm:bg-gradient-to-r sm:from-black/80 sm:via-black/60 sm:to-black/30" />
                    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-3xl whitespace-pre-line drop-shadow">
                            {section.heading}
                        </h1>
                        {section.subheading && (
                            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-white/85 max-w-xl whitespace-pre-line">{section.subheading}</p>
                        )}
                        <div className="mt-6 sm:mt-8 flex flex-wrap gap-3">
                            {section.primaryLabel && (
                                <SmartLink href={href(section.primaryHref || '#')} className="rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-3 hover:brightness-95 transition">
                                    {section.primaryLabel}
                                </SmartLink>
                            )}
                            {section.secondaryLabel && (
                                <SmartLink href={href(section.secondaryHref || '#')} className="rounded-lg bg-white/10 text-white font-semibold px-6 py-3 ring-1 ring-white/40 backdrop-blur hover:bg-white/20 transition">
                                    {section.secondaryLabel}
                                </SmartLink>
                            )}
                        </div>
                    </div>
                </section>
            );
        }

        case 'feature':
            return (
                <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
                    {section.heading && <h2 className="text-2xl font-bold text-gray-900 mb-6">{section.heading}</h2>}
                    <div className="w-full sm:max-w-md rounded-2xl border border-gray-200 p-6">
                        {section.text && <p className="text-sm text-gray-600">{section.text}</p>}
                        <ul className="mt-4 space-y-2">
                            {section.bullets.filter(Boolean).map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                                    <CheckIcon className="h-4 w-4 text-gray-900 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            );

        case 'text':
            return (
                <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
                    {section.heading && <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>}
                    <div className="space-y-4 text-sm text-gray-700">
                        <Markdown>{section.body}</Markdown>
                    </div>
                </section>
            );

        case 'feed':
            return (
                <FeaturedBuilds
                    locale={locale}
                    heading={section.heading}
                    limit={section.limit}
                    availability={section.availability ?? 'all'}
                />
            );

        case 'contact':
            return (
                <section id="contact" className="bg-gray-50 border-t border-gray-200">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
                        {section.heading && <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>}
                        {section.text && <p className="mt-1 text-sm text-gray-600 mb-6">{section.text}</p>}
                        <Suspense fallback={null}>
                            <ContactForm />
                        </Suspense>
                    </div>
                </section>
            );

        case 'cta':
            return (
                <section className="bg-primary">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black text-primary-foreground whitespace-pre-line">{section.heading}</h2>
                            {section.text && <p className="mt-2 text-primary-foreground/80 whitespace-pre-line">{section.text}</p>}
                        </div>
                        {section.primaryLabel && (
                            <SmartLink href={href(section.primaryHref || '#')} className="shrink-0 rounded-lg bg-gray-900 text-white font-semibold px-6 py-3 hover:bg-gray-800 transition">
                                {section.primaryLabel}
                            </SmartLink>
                        )}
                    </div>
                </section>
            );

        case 'stats':
            return <StatsBand section={section} locale={locale} />;

        case 'image': {
            if (section.imageId == null) return null;
            const layout = section.layout ?? 'standard';
            const intrinsic = imageDimensions[section.imageId];

            if (layout === 'full') {
                return (
                    <section className="py-8">
                        <ContentImage imageId={section.imageId} alt={section.alt} sizes="100vw" className="w-full max-h-[70vh] object-cover" />
                    </section>
                );
            }

            if (layout === 'overlay') {
                return (
                    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                        <div className="relative rounded-2xl overflow-hidden">
                            <ContentImage imageId={section.imageId} alt={section.alt} sizes="(max-width: 1280px) 100vw, 1280px" className="w-full h-[420px] object-cover" />
                            <ScrimText text={section.text} />
                        </div>
                    </section>
                );
            }

            if (layout === 'overlayFull') {
                return (
                    <section className="relative">
                        <ContentImage imageId={section.imageId} alt={section.alt} sizes="100vw" className="w-full h-[480px] object-cover" />
                        <ScrimText text={section.text} big />
                    </section>
                );
            }

            if (layout === 'left' || layout === 'right') {
                return (
                    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                        <div className="grid sm:grid-cols-2 gap-8 items-center">
                            <ContentImage
                                imageId={section.imageId}
                                alt={section.alt}
                                sizes="(max-width: 640px) 100vw, 640px"
                                width={intrinsic?.width}
                                height={intrinsic?.height}
                                className={`w-full h-auto rounded-2xl ${layout === 'right' ? 'sm:order-2' : ''}`}
                            />
                            {section.text && (
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{section.text}</p>
                            )}
                        </div>
                    </section>
                );
            }

            return (
                <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                    <figure>
                        <ContentImage
                            imageId={section.imageId}
                            alt={section.alt}
                            sizes="(max-width: 1024px) 100vw, 1024px"
                            width={intrinsic?.width}
                            height={intrinsic?.height}
                            className="w-full h-auto rounded-2xl"
                        />
                        {section.caption && <figcaption className="mt-2 text-center text-sm text-gray-500">{section.caption}</figcaption>}
                    </figure>
                </section>
            );
        }
    }
}
