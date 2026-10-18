import { cloneSection, createSectionFactory, type SectionOf, type Sections } from '@sjolystinnovation/app-kit/sections';

export type FeedAvailability = 'all' | 'available' | 'reserved' | 'sold';
export type StatSource = 'builds' | 'parts';

export type Section = Sections<{ hero: { backgroundImageId: string | null }; feed: { availability: FeedAvailability } }, StatSource>;
export type SectionType = Section['type'];
export type HeroSection = SectionOf<Section, 'hero'>;
export type FeedSection = SectionOf<Section, 'feed'>;
export type StatsSection = SectionOf<Section, 'stats'>;
export type ImageSection = SectionOf<Section, 'image'>;
export type StatItem = StatsSection['items'][number];

export const createSection = createSectionFactory<Section>({
    hero: { heading: 'Overskrift', subheading: 'Undertekst', primaryLabel: 'Be om tilbud', primaryHref: '#contact', secondaryLabel: 'Se datamaskiner', secondaryHref: '/builds', backgroundImageId: null },
    feature: { heading: 'Punkter', text: '', bullets: [''] },
    text: { heading: 'Overskrift', body: '' },
    feed: { heading: 'Nyeste datamaskiner', limit: 6, availability: 'all' },
    contact: { heading: 'Ta kontakt', text: '' },
    cta: { heading: 'Klar for en ny maskin?', text: '', primaryLabel: 'Be om tilbud', primaryHref: '#contact' },
    stats: { heading: '', items: [{ source: 'builds', value: '', label: 'Datamaskiner publisert' }] },
    image: { imageId: null, alt: '', caption: '', layout: 'standard', text: '' },
});

export { cloneSection };
