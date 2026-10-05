import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BuildForm from '@/app/[locale]/(protected)/admin/builds/BuildForm';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import type { BuildTranslation } from '@/services/buildService';

const dict = getDictionary('no');
const USER_ID = 'user-1';
const KEY = `altinnendata:draft:${USER_ID}:build:new`;

const onSaved = vi.fn();
const onCancel = vi.fn();

let sessionState: { data: unknown; status: string } = {
    data: { user: { id: USER_ID, name: 'admin', email: 'a@b.no', roles: ['Admin'] }, accessToken: 't', expires: '' },
    status: 'authenticated',
};

vi.mock('next-auth/react', () => ({
    useSession: () => sessionState,
}));

const authenticated = () => ({
    data: { user: { id: USER_ID, name: 'admin', email: 'a@b.no', roles: ['Admin'] }, accessToken: 't', expires: '' },
    status: 'authenticated',
});

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/services/buildClassService', () => ({
    default: { list: async () => [] },
}));

vi.mock('@/services/componentConditionService', () => ({
    default: { list: async () => [] },
}));

vi.mock('@/services/componentService', () => ({
    default: { getTree: async () => [] },
}));

const createBuild = vi.fn();
const updateBuild = vi.fn();

vi.mock('@/services/buildService', async () => {
    const actual = await vi.importActual<typeof import('@/services/buildService')>('@/services/buildService');
    return {
        ...actual,
        default: { ...actual.default, create: (...args: unknown[]) => createBuild(...args), update: (...args: unknown[]) => updateBuild(...args) },
    };
});

const draft = {
    translations: {
        no: { locale: 'no', title: 'Ryzen-maskin', summary: 'Rask og stillegående.', description: '' } as BuildTranslation,
        en: { locale: 'en', title: '', summary: null, description: null } as BuildTranslation,
    },
    category: 'gaming',
    buildClassId: '' as number | '',
    availability: 'Available' as const,
    priceNok: '12000',
    builtOn: '',
    soldOn: '',
    coverImageId: null,
    published: false,
    sortOrder: 0,
    parts: [{ componentPartId: null, componentCategoryId: null, componentConditionId: null, name: 'RTX 4070', details: '' }],
    finnUrl: '',
    imageIds: [],
};

// Selected by position, which also keeps the test independent of the label wording.
// input and getByLabelText does not reach it. Select it via the wrapping div instead.
const titleInput = () =>
    screen.getByText(dict.admin.buildTitle).parentElement!.querySelector('input') as HTMLInputElement;

const form = () => (
    <DictionaryProvider locale="no">
        <BuildForm build={null} onSaved={onSaved} onCancel={onCancel} />
    </DictionaryProvider>
);

describe('the build form draft bar', () => {
    beforeEach(() => {
        window.localStorage.clear();
        sessionState = authenticated();
        onSaved.mockClear();
        onCancel.mockClear();
        createBuild.mockReset().mockResolvedValue(undefined);
        updateBuild.mockReset().mockResolvedValue(undefined);
    });

    it('stays out of the way when there is no draft', async () => {
        render(form());

        expect(await screen.findByText(dict.admin.buildTitle)).toBeInTheDocument();
        expect(screen.queryByText(dict.admin.draftFound)).not.toBeInTheDocument();
    });

    it('offers an unsaved draft without applying it', async () => {
        window.localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), value: draft }));
        render(form());

        expect(await screen.findByText(dict.admin.draftFound)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: dict.admin.restoreDraft })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: dict.admin.discardDraft })).toBeInTheDocument();
        // Offered, not applied: the form behind it is still empty.
        expect(titleInput()).toHaveValue('');
    });

    it('fills the form in from the draft when the user restores it', async () => {
        window.localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), value: draft }));
        render(form());

        await userEvent.click(await screen.findByRole('button', { name: dict.admin.restoreDraft }));

        expect(titleInput()).toHaveValue('Ryzen-maskin');
        expect(screen.getByDisplayValue('RTX 4070')).toBeInTheDocument();
        expect(screen.queryByText(dict.admin.draftFound)).not.toBeInTheDocument();
    });

    it('throws the draft away when the user discards it', async () => {
        window.localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), value: draft }));
        render(form());

        await userEvent.click(await screen.findByRole('button', { name: dict.admin.discardDraft }));

        expect(window.localStorage.getItem(KEY)).toBeNull();
        expect(titleInput()).toHaveValue('');
    });

    it('does not offer a draft stored for a different build', async () => {
        window.localStorage.setItem(
            `altinnendata:draft:${USER_ID}:build:42`,
            JSON.stringify({ savedAt: Date.now(), value: draft }),
        );
        render(form());

        expect(await screen.findByText(dict.admin.buildTitle)).toBeInTheDocument();
        expect(screen.queryByText(dict.admin.draftFound)).not.toBeInTheDocument();
    });

    it('keeps saving when the session cookie disappears mid-edit', async () => {
        const view = render(form());
        await userEvent.type(titleInput(), 'Ryzen');

        // The cookie is gone, so useSession reports nobody on the form already on screen. This
        // is the incident the draft exists for, and the worst possible moment to stop storing.
        sessionState = { data: null, status: 'unauthenticated' };
        view.rerender(form());
        await userEvent.type(titleInput(), '-maskin');

        await vi.waitFor(() => expect(window.localStorage.getItem(KEY)).not.toBeNull());
        expect(JSON.parse(window.localStorage.getItem(KEY)!).value.translations.no.title).toBe('Ryzen-maskin');
    });

    it('stores nothing on a form opened with no session at all', async () => {
        sessionState = { data: null, status: 'unauthenticated' };
        render(form());

        await userEvent.type(titleInput(), 'Ryzen-maskin');
        await new Promise(resolve => setTimeout(resolve, 700));

        // No owner was ever known here, so there is no key that could not belong to someone else.
        expect(window.localStorage.length).toBe(0);
    });

    it('keeps a field the stored draft predates', async () => {
        // Drafts are kept for a week, so one can easily predate a newly added field. Asserting
        // on the rendered input would prove nothing: an undefined value makes React treat it as
        // uncontrolled and the old value stays on screen. What matters is what gets saved.
        const { published: _dropped, ...older } = draft;
        window.localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), value: older }));
        render(form());

        await userEvent.click(await screen.findByRole('button', { name: dict.admin.restoreDraft }));
        await userEvent.click(screen.getByRole('button', { name: dict.common.save }));

        expect(createBuild).toHaveBeenCalledWith(expect.objectContaining({ published: false }));
    });
});
