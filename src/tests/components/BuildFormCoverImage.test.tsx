import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BuildForm from '@/app/[locale]/(protected)/admin/builds/BuildForm';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import { makeSession, resetTestMocks, setSession } from '@sjolystinnovation/app-kit/testing';

const dict = getDictionary('no');

vi.mock('next-auth/react', async () => (await import('@sjolystinnovation/app-kit/testing')).nextAuthMock());
vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('@/services/buildClassService', () => ({ default: { list: async () => [] } }));
vi.mock('@/services/componentConditionService', () => ({ default: { list: async () => [] } }));
vi.mock('@/services/componentService', () => ({ default: { getTree: async () => [] } }));

const upload = vi.hoisted(() => vi.fn());
vi.mock('@/services/imageService', () => ({ default: { upload } }));

const coverPicker = () => screen.getByText(dict.admin.coverImage).parentElement!;

describe('the build form cover image', () => {
    beforeEach(() => {
        window.localStorage.clear();
        resetTestMocks();
        setSession(makeSession({ user: { id: 'user-1', name: 'admin', email: 'a@b.no', roles: ['Admin'] }, accessToken: 't' }));
        upload.mockReset();
    });

    it('uploads the cover through the image service with the labels in the app language', async () => {
        upload.mockResolvedValue({ id: 'cover-1' });
        render(
            <DictionaryProvider locale="no">
                <BuildForm build={null} onSaved={vi.fn()} onCancel={vi.fn()} />
            </DictionaryProvider>,
        );
        await screen.findByText(dict.admin.coverImage);
        expect(coverPicker()).toHaveTextContent(dict.sections.uploadImage);

        const file = new File(['x'], 'cover.png', { type: 'image/png' });
        fireEvent.change(coverPicker().querySelector('input[type="file"]')!, { target: { files: [file] } });

        await waitFor(() => expect(coverPicker().querySelector('img')?.getAttribute('src')).toContain('cover-1'));
        expect(upload).toHaveBeenCalledWith(file);
        expect(coverPicker()).toHaveTextContent(dict.sections.replaceImage);
        expect(screen.getByRole('button', { name: dict.common.remove })).toBeInTheDocument();
    });
});
