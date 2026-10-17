import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SectionsEditor, { sectionsEditorStrings } from '@/components/SectionsEditor';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import type { Section } from '@/types/content';

const upload = vi.hoisted(() => vi.fn());
vi.mock('@/services/imageService', () => ({ default: { upload } }));

const base = { id: 's1', visible: true };
const hero: Section = { ...base, type: 'hero', heading: 'H', subheading: '', primaryLabel: '', primaryHref: '', secondaryLabel: '', secondaryHref: '', backgroundImageId: null };
const feed: Section = { ...base, id: 's2', type: 'feed', heading: 'Latest', limit: 6, availability: 'all' };
const stats: Section = { ...base, id: 's3', type: 'stats', heading: '', items: [{ source: 'builds', value: '', label: 'Built' }] };

let latest: Section[] = [];

function Harness({ initial }: { initial: Section[] }) {
    const [sections, setSections] = useState(initial);
    return (
        <DictionaryProvider locale="en">
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

    it('labels the toolbar and the add list from the dictionary', () => {
        render(<Harness initial={[feed]} />);
        expect(screen.getByTitle('Delete')).toBeInTheDocument();
        expect(screen.getByTitle('Move up')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Bullet list' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Add section/ })).toBeInTheDocument();
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

    it('maps remove to delete and the image remove to remove', () => {
        const dict = getDictionary('no');
        const strings = sectionsEditorStrings(dict);
        expect(strings.remove).toBe(dict.common.delete);
        expect(strings.removeImage).toBe(dict.common.remove);
        expect(strings.uploading).toBe(dict.admin.uploading);
    });
});
