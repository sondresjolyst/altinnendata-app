import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContentImage from '@/components/ContentImage';

describe('ContentImage', () => {
    it('offers every rendition of an uploaded image', () => {
        render(<ContentImage imageId="abc" alt="Gaming PC" sizes="400px" />);
        const image = screen.getByAltText('Gaming PC');
        expect(image.getAttribute('srcset')).toContain('?w=384 384w');
        expect(image.getAttribute('srcset')).toContain('?w=1600 1600w');
        expect(image).toHaveAttribute('sizes', '400px');
    });

    it('defers loading until an image nears the viewport', () => {
        render(<ContentImage imageId="abc" alt="Gaming PC" sizes="400px" />);
        expect(screen.getByAltText('Gaming PC')).toHaveAttribute('loading', 'lazy');
    });

    it('loads the above-the-fold image eagerly and at high priority', () => {
        render(<ContentImage imageId="abc" alt="Hero" sizes="100vw" priority />);
        const image = screen.getByAltText('Hero');
        expect(image).toHaveAttribute('loading', 'eager');
        expect(image).toHaveAttribute('fetchpriority', 'high');
    });

    it('serves the static fallback as-is, with no renditions to choose from', () => {
        render(<ContentImage imageId={null} fallbackSrc="/hero.jpg" alt="" sizes="100vw" />);
        const image = document.querySelector('img')!;
        expect(image).toHaveAttribute('src', '/hero.jpg');
        expect(image).not.toHaveAttribute('srcset');
        expect(image).not.toHaveAttribute('sizes');
    });

    it('renders nothing when there is neither an image nor a fallback', () => {
        const { container } = render(<ContentImage imageId={null} alt="" sizes="100vw" />);
        expect(container).toBeEmptyDOMElement();
    });
});
