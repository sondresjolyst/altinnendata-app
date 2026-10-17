import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SectionsEditor, { sectionsEditorStrings } from '@/components/SectionsEditor';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import { nbSectionTypeLabels, nbSectionsEditorStrings } from '@sjolystinnovation/app-kit/locales/nb';
import { defaultSectionsEditorStrings } from '@sjolystinnovation/app-kit/sections';
import type { Locale } from '@/i18n/config';
import type { Section } from '@/types/content';

const upload = vi.hoisted(() => vi.fn());
vi.mock('@/services/imageService', () => ({ default: { upload } }));

const base = { id: 's1', visible: true };
const hero: Section = { ...base, type: 'hero', heading: 'H', subheading: '', primaryLabel: '', primaryHref: '', secondaryLabel: '', secondaryHref: '', backgroundImageId: null };
const feed: Section = { ...base, id: 's2', type: 'feed', heading: 'Latest', limit: 6, availability: 'all' };
const stats: Section = { ...base, id: 's3', type: 'stats', heading: '', items: [{ source: 'builds', value: '', label: 'Built' }] };

let latest: Section[] = [];

function Harness({ initial, locale = 'en' }: { initial: Section[]; locale?: Locale }) {
    const [sections, setSections] = useState(initial);
    return (
        <DictionaryProvider locale={locale}>
            <SectionsEditor
                sections={sections}
                onChange={next => {
                    latest = next;
                    setSections(next);
                }}
            />
        </DictionaryProvider>
    );
}

describe('SectionsEditor', () => {
    beforeEach(() => {
        upload.mockReset();
        latest = [];
    });

    it('labels the toolbar and the add list with the English defaults', () => {
        render(<Harness initial={[feed]} />);
        expect(screen.getByTitle('Delete')).toBeInTheDocument();
        expect(screen.getByTitle('Move up')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Feature' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Computers' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Add section/ })).toBeInTheDocument();
    });

    it('labels the toolbar and the add list in Norwegian, with the feed named after the computers', () => {
        render(<Harness initial={[feed]} locale="no" />);
        expect(screen.getByTitle(nbSectionsEditorStrings.remove)).toBeInTheDocument();
        expect(screen.getByTitle(nbSectionsEditorStrings.moveUp)).toBeInTheDocument();
        expect(screen.getByRole('option', { name: nbSectionTypeLabels.hero })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: getDictionary('no').sectionTypes.feed })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: nbSectionTypeLabels.feed })).not.toBeInTheDocument();
    });

    it('uploads a hero background through the image service', async () => {
        upload.mockResolvedValue({ id: 'bg-1' });
        const { container } = render(<Harness initial={[hero]} />);
        expect(screen.getByText('Background image')).toBeInTheDocument();
        const file = new File(['x'], 'bg.png', { type: 'image/png' });
        fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
        await waitFor(() => expect(latest[0]).toMatchObject({ backgroundImageId: 'bg-1' }));
        expect(upload).toHaveBeenCalledWith(file);
        expect(await screen.findByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });

    it('sets which builds the feed shows', () => {
        render(<Harness initial={[feed]} />);
        fireEvent.change(screen.getByDisplayValue('All computers'), { target: { value: 'sold' } });
        expect(latest[0]).toMatchObject({ availability: 'sold' });
    });

    it('offers the live build and part counts as stat sources', () => {
        render(<Harness initial={[stats]} />);
        expect(screen.getByRole('option', { name: 'Published computers (live)' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Parts in catalog (live)' })).toBeInTheDocument();
    });

    it('takes the Norwegian set for no and the English defaults for en, with Delete for a section', () => {
        expect(sectionsEditorStrings('no')).toEqual({ ...nbSectionsEditorStrings, remove: 'Slett' });
        expect(sectionsEditorStrings('en')).toEqual({ ...defaultSectionsEditorStrings, remove: 'Delete' });
        expect(sectionsEditorStrings('en').removeImage).toBe('Remove');
    });
});
