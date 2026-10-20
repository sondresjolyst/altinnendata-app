import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionRenderer from '@/components/SectionRenderer';
import type { Section } from '@/types/content';

const form = vi.hoisted(() => ({ suspend: false }));

vi.mock('@/components/ContactForm', () => ({
    default: function ContactForm() {
        if (form.suspend) throw new Promise(() => {});
        return <form data-testid="contact-form" />;
    },
}));

vi.mock('@/components/FeaturedBuilds', () => ({
    default: (props: Record<string, unknown>) => <div data-testid="feed" data-props={JSON.stringify(props)} />,
}));

vi.mock('@/components/StatsBand', () => ({
    default: ({ section, locale }: { section: { heading: string }; locale: string }) => <div data-testid="stats" data-locale={locale}>{section.heading}</div>,
}));

const base = { id: 's1', visible: true };

describe('SectionRenderer', () => {
    beforeEach(() => {
        form.suspend = false;
    });

    it('renders the hero with its buttons on the locale paths and keeps anchors', () => {
        const section: Section = { ...base, type: 'hero', heading: 'Big heading', subheading: 'Sub', primaryLabel: 'Quote', primaryHref: '#contact', secondaryLabel: 'Builds', secondaryHref: '/builds', backgroundImageId: null };
        const { container } = render(<SectionRenderer section={section} locale="en" />);
        expect(screen.getByRole('heading', { level: 1, name: 'Big heading' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Quote' })).toHaveAttribute('href', '#contact');
        expect(screen.getByRole('link', { name: 'Builds' })).toHaveAttribute('href', '/en/builds');
        expect(container.querySelector('img')).toHaveAttribute('src', '/hero.jpg');
    });

    it('gives the hero a definite width so its minimum height cannot widen it', () => {
        const section: Section = { ...base, type: 'hero', heading: 'H', subheading: '', primaryLabel: '', primaryHref: '', secondaryLabel: '', secondaryHref: '', backgroundImageId: null };
        render(<SectionRenderer section={section} locale="no" />);
        expect(screen.getByRole('heading', { level: 1 }).closest('section')).toHaveClass('w-full', 'xl:aspect-[16/5]');
    });

    it('wraps long words in the hero text instead of clipping them', () => {
        const section: Section = { ...base, type: 'hero', heading: 'Heading', subheading: 'Sub', primaryLabel: '', primaryHref: '', secondaryLabel: '', secondaryHref: '', backgroundImageId: null };
        render(<SectionRenderer section={section} locale="no" />);
        const heading = screen.getByRole('heading', { level: 1 });
        const hero = heading.closest('section')!;
        expect(hero).not.toHaveClass('overflow-hidden');
        expect(heading).toHaveClass('break-words');
        expect(screen.getByText('Sub')).toHaveClass('wrap-anywhere');
        expect(heading.parentElement).toHaveClass('w-full', 'min-w-0', 'sm:min-h-[420px]');
        expect(hero).not.toHaveClass('sm:min-h-[420px]');
        expect(heading.parentElement).not.toHaveClass('overflow-hidden');
    });

    it('clips only the hero image layer', () => {
        const section: Section = { ...base, type: 'hero', heading: 'H', subheading: '', primaryLabel: '', primaryHref: '', secondaryLabel: '', secondaryHref: '', backgroundImageId: null };
        const { container } = render(<SectionRenderer section={section} locale="no" />);
        const layer = container.querySelector('img')!.parentElement!;
        expect(layer).toHaveClass('absolute', 'inset-0', '-z-10', 'overflow-hidden');
        expect(layer.parentElement).toBe(container.querySelector('section'));
        expect(layer).not.toContainElement(screen.getByRole('heading', { level: 1 }));
    });

    it('renders the hero background from the uploaded image', () => {
        const section: Section = { ...base, type: 'hero', heading: 'H', subheading: '', primaryLabel: '', primaryHref: '', secondaryLabel: '', secondaryHref: '', backgroundImageId: 'img-1' };
        const { container } = render(<SectionRenderer section={section} locale="no" />);
        expect(container.querySelector('img')?.getAttribute('src')).toContain('img-1');
    });

    it('maps the call to action button to the locale path', () => {
        const section: Section = { ...base, type: 'cta', heading: 'Ready?', text: '', primaryLabel: 'Go', primaryHref: '/builds' };
        render(<SectionRenderer section={section} locale="en" />);
        expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/en/builds');
    });

    it('renders the text body in the app text style', () => {
        const section: Section = { ...base, type: 'text', heading: 'About', body: 'Hello **there**' };
        render(<SectionRenderer section={section} locale="no" />);
        expect(screen.getByText('there').closest('div.space-y-4')).toHaveClass('space-y-4', 'text-sm', 'text-gray-700');
    });

    it('renders the contact section as the scroll target with the form', () => {
        const section: Section = { ...base, type: 'contact', heading: 'Contact us', text: 'Write' };
        const { container } = render(<SectionRenderer section={section} locale="no" />);
        expect(container.querySelector('section#contact')).toHaveClass('scroll-mt-20', 'bg-gray-50', 'border-t', 'border-gray-200');
        expect(screen.getByTestId('contact-form')).toBeInTheDocument();
    });

    it('shows the contact heading while the form is still loading', () => {
        form.suspend = true;
        const section: Section = { ...base, type: 'contact', heading: 'Contact us', text: '' };
        render(<SectionRenderer section={section} locale="no" />);
        expect(screen.getByRole('heading', { name: 'Contact us' })).toBeInTheDocument();
    });

    it('passes the locale and the feed settings to the build feed', () => {
        const section: Section = { ...base, type: 'feed', heading: 'Latest', limit: 4, availability: 'sold' };
        render(<SectionRenderer section={section} locale="en" />);
        expect(JSON.parse(screen.getByTestId('feed').dataset.props!)).toEqual({ locale: 'en', heading: 'Latest', limit: 4, availability: 'sold' });
    });

    it('defaults a feed without availability to every build', () => {
        const section = { ...base, type: 'feed', heading: 'Latest', limit: 2 } as Section;
        render(<SectionRenderer section={section} locale="no" />);
        expect(JSON.parse(screen.getByTestId('feed').dataset.props!).availability).toBe('all');
    });

    it('passes the locale to the stats band', () => {
        const section: Section = { ...base, type: 'stats', heading: 'Numbers', items: [] };
        render(<SectionRenderer section={section} locale="en" />);
        expect(screen.getByTestId('stats')).toHaveAttribute('data-locale', 'en');
    });

    it('gives a standard image its intrinsic size', () => {
        const section: Section = { ...base, type: 'image', imageId: 'pic', alt: 'A picture', caption: '', layout: 'standard', text: '' };
        render(<SectionRenderer section={section} locale="no" imageDimensions={{ pic: { width: 800, height: 600 } }} />);
        const img = screen.getByAltText('A picture');
        expect(img).toHaveAttribute('width', '800');
        expect(img).toHaveAttribute('height', '600');
    });

    it('renders nothing for a hidden section', () => {
        const section: Section = { ...base, visible: false, type: 'text', heading: 'Hidden', body: '' };
        const { container } = render(<SectionRenderer section={section} locale="no" />);
        expect(container).toBeEmptyDOMElement();
    });
});
