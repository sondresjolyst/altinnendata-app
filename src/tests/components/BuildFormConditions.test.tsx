import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import BuildForm from '@/app/[locale]/(protected)/admin/builds/BuildForm';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import type { BuildAdmin } from '@/services/buildService';
import { makeSession, resetTestMocks, setSession, toastSpies } from '@sjolystinnovation/app-kit/testing';

const dict = getDictionary('no');
const USER_ID = 'user-1';

vi.mock('next-auth/react', async () => (await import('@sjolystinnovation/app-kit/testing')).nextAuthMock());
vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('@/services/buildClassService', () => ({ default: { list: async () => [] } }));
vi.mock('@/services/componentConditionService', () => ({ default: { list: async () => [{ id: 1, key: 'used', name: 'Brukt', sortOrder: 0, translations: [] }] } }));
vi.mock('@/services/componentService', () => ({ default: { getTree: async () => [] } }));

const createBuild = vi.fn();
const updateBuild = vi.fn();

vi.mock('@/services/buildService', async () => {
    const actual = await vi.importActual<typeof import('@/services/buildService')>('@/services/buildService');
    return {
        ...actual,
        default: { ...actual.default, create: (...args: unknown[]) => createBuild(...args), update: (...args: unknown[]) => updateBuild(...args) },
    };
});

const existing: BuildAdmin = {
    id: 7,
    slug: 'ryzen',
    category: null,
    availability: 'Available',
    buildClass: null,
    priceNok: 12000,
    builtOn: null,
    soldOn: null,
    coverImageId: null,
    finnUrl: null,
    published: true,
    sortOrder: 0,
    translations: [{ locale: 'no', title: 'Ryzen-maskin', summary: null, description: null }],
    components: [
        { id: 1, componentPartId: null, componentCategoryId: null, categoryKey: null, categoryName: null, manufacturerName: null, name: 'Ryzen 5', details: null, condition: { id: 1, key: 'used', name: 'Brukt' }, sortOrder: 0 },
        { id: 2, componentPartId: null, componentCategoryId: null, categoryKey: null, categoryName: null, manufacturerName: null, name: 'RTX 3060', details: null, condition: null, sortOrder: 1 },
    ],
    imageIds: [],
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-18T10:05:00.123Z',
    conditions: [],
    allPartsHaveCondition: false,
};

const refused = (status: number, data: object) =>
    request(
        () => Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, data } })),
        'Failed',
    ).catch((e: unknown) => e);

const MESSAGE = 'Velg tilstand for alle delene før datamaskinen legges ut for salg.';

const form = (build: BuildAdmin | null) => (
    <DictionaryProvider locale="no">
        <BuildForm build={build} onSaved={vi.fn()} onCancel={vi.fn()} />
    </DictionaryProvider>
);

describe('a build on sale with a part without a condition', () => {
    beforeEach(() => {
        window.localStorage.clear();
        resetTestMocks();
        setSession(makeSession({ user: { id: USER_ID, name: 'admin', email: 'a@b.no', roles: ['Admin'] }, accessToken: 't' }));
        createBuild.mockReset().mockResolvedValue(undefined);
        updateBuild.mockReset().mockResolvedValue(undefined);
    });

    it('shows the Norwegian text on the part row the API refused, and only there', async () => {
        updateBuild.mockRejectedValue(await refused(400, { errors: { 'Components[1].ComponentConditionId': ['Choose a condition for every part before the build is put on sale.'] } }));
        render(form(existing));
        await userEvent.click(await screen.findByRole('button', { name: dict.common.save }));

        const selects = await screen.findAllByLabelText('Tilstand');
        await vi.waitFor(() => expect(selects[1]).toHaveAccessibleDescription(MESSAGE));
        expect(selects[1]).toHaveAttribute('aria-invalid', 'true');
        expect(selects[0]).not.toHaveAttribute('aria-invalid');
        expect(screen.getAllByText(MESSAGE)).toHaveLength(1);
        expect(toastSpies.error).toHaveBeenCalledWith(MESSAGE);
        expect(screen.queryByText(/Choose a condition/)).not.toBeInTheDocument();
    });

    it('clears the row text once a condition is chosen', async () => {
        updateBuild.mockRejectedValue(await refused(400, { errors: { 'Components[1].ComponentConditionId': ['x'] } }));
        render(form(existing));
        await userEvent.click(await screen.findByRole('button', { name: dict.common.save }));
        const selects = await screen.findAllByLabelText('Tilstand');
        await vi.waitFor(() => expect(selects[1]).toHaveAttribute('aria-invalid', 'true'));

        await userEvent.selectOptions(selects[1], '1');
        expect(selects[1]).not.toHaveAttribute('aria-invalid');
        expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
    });

    it('shows the text above the parts when the API refuses a build with no parts', async () => {
        updateBuild.mockRejectedValue(await refused(400, { errors: { Components: ['x'] } }));
        render(form({ ...existing, components: [] }));
        await userEvent.click(await screen.findByRole('button', { name: dict.common.save }));

        expect(await screen.findByText(MESSAGE)).toBeInTheDocument();
    });
});
