import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BuildForm from '@/app/[locale]/(protected)/admin/builds/BuildForm';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import { makeSession, resetTestMocks, setSession } from '@sjolystinnovation/app-kit/testing';

vi.mock('next-auth/react', async () => (await import('@sjolystinnovation/app-kit/testing')).nextAuthMock());
vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());

vi.mock('@/services/buildClassService', () => ({ default: { list: async () => [] } }));
vi.mock('@/services/componentConditionService', () => ({ default: { list: async () => [] } }));
vi.mock('@/services/componentService', () => ({ default: { getTree: async () => [] } }));

const createBuild = vi.fn();

vi.mock('@/services/buildService', async () => {
    const actual = await vi.importActual<typeof import('@/services/buildService')>('@/services/buildService');
    return { ...actual, default: { ...actual.default, create: (...args: unknown[]) => createBuild(...args) } };
});

const renderForm = (locale: Locale) =>
    render(
        <DictionaryProvider locale={locale}>
            <BuildForm build={null} onSaved={vi.fn()} onCancel={vi.fn()} />
        </DictionaryProvider>,
    );

const optionNames = (select: HTMLElement) => within(select).getAllByRole('option').map(o => o.textContent);

describe.each(['no', 'en'] as const)('the build form in %s', locale => {
    const dict = getDictionary(locale);

    beforeEach(() => {
        window.localStorage.clear();
        resetTestMocks();
        setSession(makeSession({ user: { id: 'u1', name: 'admin', email: 'a@b.no', roles: ['Admin'] }, accessToken: 't' }));
        createBuild.mockReset();
    });

    it('labels the save and cancel buttons', async () => {
        renderForm(locale);

        expect(await screen.findByRole('button', { name: dict.common.save })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: dict.common.cancel })).toBeInTheDocument();
    });

    it('shows the saving label while the build is being saved', async () => {
        createBuild.mockReturnValue(new Promise(() => {}));
        renderForm(locale);

        const title = (await screen.findByText(dict.admin.buildTitle)).parentElement!.querySelector('input') as HTMLInputElement;
        await userEvent.type(title, 'Ryzen');
        await userEvent.click(screen.getByRole('button', { name: dict.common.save }));

        expect(await screen.findByRole('button', { name: dict.common.saving })).toBeDisabled();
    });

    it('names the category and status options', async () => {
        renderForm(locale);

        const category = (await screen.findAllByText(dict.builds.category.label))[0].parentElement!.querySelector('select')!;
        expect(optionNames(category)).toEqual([
            '—',
            dict.builds.category.gaming,
            dict.builds.category.office,
            dict.builds.category.streaming,
            dict.builds.category.workstation,
        ]);

        const status = screen.getByText(dict.builds.availability.label).parentElement!.querySelector('select')!;
        expect(optionNames(status)).toEqual([
            dict.builds.availability.available,
            dict.builds.availability.reserved,
            dict.builds.availability.sold,
        ]);
    });

    it('labels the parts list and a new part line', async () => {
        renderForm(locale);

        expect(await screen.findByText(dict.admin.partsList)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: dict.admin.addPart }));

        const fromCatalog = screen.getByText(dict.admin.partFromCatalog).parentElement!.querySelector('select')!;
        expect(optionNames(fromCatalog)[0]).toBe(dict.admin.freeTextOption);
        expect(screen.getByText(dict.admin.name)).toBeInTheDocument();
        expect(screen.getByText(dict.admin.details)).toBeInTheDocument();
        expect(screen.getByText(dict.builds.condition)).toBeInTheDocument();
        // The part's own category select, next to the one above the form.
        expect(screen.getAllByText(dict.builds.category.label)).toHaveLength(2);
    });
});

describe('the build form in English', () => {
    beforeEach(() => {
        window.localStorage.clear();
        resetTestMocks();
        setSession(makeSession({ user: { id: 'u1', name: 'admin', email: 'a@b.no', roles: ['Admin'] }, accessToken: 't' }));
    });

    it('has no Norwegian left on it', async () => {
        renderForm('en');
        await userEvent.click(await screen.findByRole('button', { name: 'Add part' }));

        for (const word of ['Lagre', 'Avbryt', 'Legg til del', 'Deleliste', 'Del fra katalog', 'fritekst', 'Detaljer', 'Navn', 'Kontor', 'Arbeidsstasjon', 'Tilgjengelig', 'Reservert', 'Solgt']) {
            expect(document.body.textContent).not.toContain(word);
        }
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
});
