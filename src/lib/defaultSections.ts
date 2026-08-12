import { Section } from '@/types/content';
import { COMPANY } from '@/lib/company';
import type { Locale } from '@/i18n/config';

const NO: Section[] = [
    {
        id: 'default-hero',
        type: 'hero',
        visible: true,
        heading: COMPANY.name,
        subheading: 'Lokal bygging og installasjon av stasjonære PC-er.',
        primaryLabel: 'Be om tilbud',
        primaryHref: '#contact',
        secondaryLabel: 'Se datamaskiner',
        secondaryHref: '/builds',
        backgroundImageId: null,
    },
    {
        id: 'default-feed-available',
        type: 'feed',
        visible: true,
        heading: 'Tilgjengelige datamaskiner',
        limit: 6,
        availability: 'available',
    },
    {
        id: 'default-feed-sold',
        type: 'feed',
        visible: true,
        heading: 'Solgte datamaskiner',
        limit: 6,
        availability: 'sold',
    },
    {
        id: 'default-cta',
        type: 'cta',
        visible: true,
        heading: 'Klar for en ny maskin?',
        text: 'Fortell hva den skal brukes til, så får du et forslag med pris.',
        primaryLabel: 'Be om tilbud',
        primaryHref: '#contact',
    },
    {
        id: 'default-contact',
        type: 'contact',
        visible: true,
        heading: 'Be om tilbud',
        text: '',
    },
];

const EN: Section[] = [
    {
        id: 'default-hero',
        type: 'hero',
        visible: true,
        heading: COMPANY.name,
        subheading: 'Custom desktop PCs, built and installed locally.',
        primaryLabel: 'Ask for a quote',
        primaryHref: '#contact',
        secondaryLabel: 'See computers',
        secondaryHref: '/builds',
        backgroundImageId: null,
    },
    {
        id: 'default-feed-available',
        type: 'feed',
        visible: true,
        heading: 'Available computers',
        limit: 6,
        availability: 'available',
    },
    {
        id: 'default-feed-sold',
        type: 'feed',
        visible: true,
        heading: 'Sold computers',
        limit: 6,
        availability: 'sold',
    },
    {
        id: 'default-cta',
        type: 'cta',
        visible: true,
        heading: 'Ready for a new machine?',
        text: 'Tell us what it is for, and you will get a suggestion with a price.',
        primaryLabel: 'Ask for a quote',
        primaryHref: '#contact',
    },
    {
        id: 'default-contact',
        type: 'contact',
        visible: true,
        heading: 'Ask for a quote',
        text: '',
    },
];

export function defaultSections(locale: Locale): Section[] {
    return locale === 'en' ? EN : NO;
}
