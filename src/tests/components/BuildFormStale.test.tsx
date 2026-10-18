import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import BuildForm from '@/app/[locale]/(protected)/admin/builds/BuildForm';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import type { BuildAdmin } from '@/services/buildService';
import { makeSession, resetTestMocks, setSession } from '@sjolystinnovation/app-kit/testing';

const dict = getDictionary('no');
const USER_ID = 'user-1';
const KEY = `altinnendata:draft:${USER_ID}:build:7`;

vi.mock('next-auth/react', async () => (await import('@sjolystinnovation/app-kit/testing')).nextAuthMock());
vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('@/services/buildClassService', () => ({ default: { list: async () => [] } }));
vi.mock('@/services/componentConditionService', () => ({ default: { list: async () => [] } }));
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
    published: false,
    sortOrder: 0,
    translations: [{ locale: 'no', title: 'Ryzen-maskin', summary: null, description: null }],
    components: [],
    imageIds: [],
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-18T10:05:00.123Z',
};

const refused = (status: number, data: object) =>
    request(
        () => Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, data } })),
        'Failed',
    ).catch((e: unknown) => e);

const titleInput = () =>
    screen.getByText(dict.admin.buildTitle).parentElement!.querySelector('input') as HTMLInputElement;

const form = (build: BuildAdmin | null) => (
    <DictionaryProvider locale="no">
        <BuildForm build={build} onSaved={vi.fn()} onCancel={vi.fn()} />
    </DictionaryProvider>
);

describe('saving a build form that may be stale', () => {
    beforeEach(() => {
        window.localStorage.clear();
        resetTestMocks();
        setSession(makeSession({ user: { id: USER_ID, name: 'admin', email: 'a@b.no', roles: ['Admin'] }, accessToken: 't' }));
        createBuild.mockReset().mockResolvedValue(undefined);
        updateBuild.mockReset().mockResolvedValue(undefined);
    });

    it('sends the updatedAt the form loaded when saving an existing build', async () => {
        render(form(existing));
        await userEvent.click(await screen.findByRole('button', { name: dict.common.save }));

        expect(updateBuild).toHaveBeenCalledWith(7, expect.objectContaining({ expectedUpdatedAt: existing.updatedAt }));
    });

    it('sends no expectedUpdatedAt when creating a build', async () => {
        render(form(null));
        await userEvent.type(titleInput(), 'Ny maskin');
        await userEvent.click(screen.getByRole('button', { name: dict.common.save }));

        expect(createBuild).toHaveBeenCalledTimes(1);
        expect(createBuild.mock.calls[0][0]).not.toHaveProperty('expectedUpdatedAt');
    });

    it('does not store the expected timestamp in the draft', async () => {
        render(form(existing));
        await userEvent.type(titleInput(), '!');

        await vi.waitFor(() => expect(window.localStorage.getItem(KEY)).not.toBeNull());
        expect(window.localStorage.getItem(KEY)).not.toContain('expectedUpdatedAt');
    });

    it('says the computer changed on 409 buildChanged and keeps what was typed', async () => {
        updateBuild.mockRejectedValue(await refused(409, { message: 'x', code: 'buildChanged' }));
        render(form(existing));
        await userEvent.type(titleInput(), ' v2');
        await userEvent.click(screen.getByRole('button', { name: dict.common.save }));

        expect(await screen.findByText('Datamaskinen ble endret etter at du åpnet skjemaet. Last siden på nytt for å se endringene.')).toBeInTheDocument();
        expect(titleInput()).toHaveValue('Ryzen-maskin v2');
        await vi.waitFor(() => expect(window.localStorage.getItem(KEY)).not.toBeNull());
    });
});
