import { Suspense } from 'react';
import { ContentImage } from '@sjolystinnovation/app-kit/ui';
import {
    SectionRenderer as BaseSectionRenderer,
    createContactRenderer,
    createTextRenderer,
    type SectionRenderFn,
    type SectionRenderers,
} from '@sjolystinnovation/app-kit/sections';
import type { ImageDimensionsMap } from '@/services/imageService';
import type { HeroSection, Section } from '@/types/content';
import FeaturedBuilds from './FeaturedBuilds';
import ContactForm from './ContactForm';
import StatsBand from './StatsBand';
import { localeHref, type Locale } from '@/i18n/config';

const hero: SectionRenderFn<HeroSection> = (section, { href, Link }) => (
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
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-3xl whitespace-pre-line drop-shadow">{section.heading}</h1>
            {section.subheading && <p className="mt-4 sm:mt-5 text-base sm:text-lg text-white/85 max-w-xl whitespace-pre-line">{section.subheading}</p>}
            <div className="mt-6 sm:mt-8 flex flex-wrap gap-3">
                {section.primaryLabel && (
                    <Link href={href(section.primaryHref || '#')} className="rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-3 hover:brightness-95 transition">
                        {section.primaryLabel}
                    </Link>
                )}
                {section.secondaryLabel && (
                    <Link href={href(section.secondaryHref || '#')} className="rounded-lg bg-white/10 text-white font-semibold px-6 py-3 ring-1 ring-white/40 backdrop-blur hover:bg-white/20 transition">
                        {section.secondaryLabel}
                    </Link>
                )}
            </div>
        </div>
    </section>
);

const text = createTextRenderer({ bodyClassName: 'space-y-4 text-sm text-gray-700' });

const contact = createContactRenderer({
    className: 'scroll-mt-20 bg-gray-50 border-t border-gray-200',
    form: (
        <Suspense fallback={null}>
            <ContactForm />
        </Suspense>
    ),
});

function renderers(locale: Locale): SectionRenderers<Section> {
    return {
        hero,
        text,
        contact,
        feed: section => <FeaturedBuilds locale={locale} heading={section.heading} limit={section.limit} availability={section.availability ?? 'all'} />,
        stats: section => <StatsBand section={section} locale={locale} />,
    };
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
    return <BaseSectionRenderer section={section} renderers={renderers(locale)} context={{ href: path => localeHref(locale, path), imageDimensions }} />;
}
