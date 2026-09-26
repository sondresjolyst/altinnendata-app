import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BuildGallery from '@/components/BuildGallery';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';

const renderGallery = (ids = ['a', 'b', 'c']) =>
    render(
        <DictionaryProvider locale="no">
            <BuildGallery imageIds={ids} alt="Gaming-PC" />
        </DictionaryProvider>,
    );

const shown = () => (screen.getByAltText('Gaming-PC') as HTMLImageElement).src;

describe('BuildGallery', () => {
    it('labels the arrows and thumbnails in the visitor language', () => {
        renderGallery();
        expect(screen.getByRole('button', { name: 'Neste bilde' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Bilde 2 av 3' })).toBeInTheDocument();
    });

    it('announces which image is shown', async () => {
        renderGallery();
        await userEvent.click(screen.getByRole('button', { name: 'Neste bilde' }));
        expect(screen.getByText('Bilde 2 av 3', { selector: '.sr-only' }).parentElement).toHaveAttribute('aria-live', 'polite');
    });

    it('steps with the arrow keys and wraps around', async () => {
        renderGallery();
        screen.getByRole('button', { name: 'Neste bilde' }).focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(shown()).toContain('/content-images/b');
        await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
        expect(shown()).toContain('/content-images/c');
    });

    it('shows no arrows for a single image', () => {
        renderGallery(['only']);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
