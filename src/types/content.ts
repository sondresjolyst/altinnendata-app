export type SectionType = 'hero' | 'feature' | 'text' | 'feed' | 'contact' | 'cta' | 'stats' | 'image';

export interface BaseSection {
    id: string;
    type: SectionType;
    visible: boolean;
}

export interface HeroSection extends BaseSection {
    type: 'hero';
    heading: string;
    subheading: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    /** Uploaded image behind the hero. Null falls back to the bundled photo. */
    backgroundImageId: string | null;
}

export interface FeatureSection extends BaseSection {
    type: 'feature';
    heading: string;
    text: string;
    bullets: string[];
}

export interface TextSection extends BaseSection {
    type: 'text';
    heading: string;
    body: string;
}

export interface FeedSection extends BaseSection {
    type: 'feed';
    heading: string;
    limit: number;
}

export interface ContactSection extends BaseSection {
    type: 'contact';
    heading: string;
    text: string;
}

export interface CtaSection extends BaseSection {
    type: 'cta';
    heading: string;
    text: string;
    primaryLabel: string;
    primaryHref: string;
}

export interface StatItem {
    source: 'static' | 'builds' | 'parts';
    value: string;
    label: string;
}

export interface StatsSection extends BaseSection {
    type: 'stats';
    heading: string;
    items: StatItem[];
}

export type ImageLayout = 'standard' | 'full' | 'left' | 'right' | 'overlay' | 'overlayFull';

export interface ImageSection extends BaseSection {
    type: 'image';
    imageId: string | null;
    alt: string;
    caption: string;
    layout: ImageLayout;
    text: string;
}

export type Section =
    | HeroSection
    | FeatureSection
    | TextSection
    | FeedSection
    | ContactSection
    | CtaSection
    | StatsSection
    | ImageSection;

export const SECTION_LABELS: Record<SectionType, string> = {
    hero: 'Hero',
    feature: 'Punktliste',
    text: 'Tekst',
    feed: 'Datamaskiner',
    contact: 'Kontaktskjema',
    cta: 'Handlingsfelt',
    stats: 'Tallrad',
    image: 'Bilde',
};

let counter = 0;
const newId = () => `s-${Date.now()}-${counter++}`;

export function createSection(type: SectionType): Section {
    const base = { id: newId(), visible: true };
    switch (type) {
        case 'hero':
            return { ...base, type, heading: 'Overskrift', subheading: 'Undertekst', primaryLabel: 'Be om tilbud', primaryHref: '#contact', secondaryLabel: 'Se datamaskiner', secondaryHref: '/builds', backgroundImageId: null };
        case 'feature':
            return { ...base, type, heading: 'Punkter', text: '', bullets: [''] };
        case 'text':
            return { ...base, type, heading: 'Overskrift', body: '' };
        case 'feed':
            return { ...base, type, heading: 'Nyeste datamaskiner', limit: 3 };
        case 'contact':
            return { ...base, type, heading: 'Ta kontakt', text: '' };
        case 'cta':
            return { ...base, type, heading: 'Klar for en ny maskin?', text: '', primaryLabel: 'Be om tilbud', primaryHref: '#contact' };
        case 'stats':
            return { ...base, type, heading: '', items: [{ source: 'builds', value: '', label: 'Datamaskiner publisert' }] };
        case 'image':
            return { ...base, type, imageId: null, alt: '', caption: '', layout: 'standard', text: '' };
    }
}

export function cloneSection(section: Section): Section {
    return { ...structuredClone(section), id: newId() };
}
