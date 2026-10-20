import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import AdminLegalPage from '@/app/[locale]/(protected)/admin/legal/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import { nbLegalPagesEditorStrings as nb } from '@sjolystinnovation/app-kit/locales/nb';
import type { Locale } from '@/i18n/config';

const save = vi.fn();

vi.mock('@/services/legalService', () => ({
    default: {
        listAll: () => Promise.resolve([{ key: 'terms', locale: 'no', title: 'Vilkår', bodyMarkdown: '# Vilkår', updatedAt: '2026-10-01' }]),
        save: (...args: unknown[]) => save(...args),
        listRevisions: () => Promise.resolve([{ id: 1, savedAt: '2026-10-01T10:00:00Z', title: 'Vilkår' }]),
    },
}));

// The Error that the legal service throws for the API's validation problem.
const refused = () =>
    request(
        () =>
            Promise.reject(
                Object.assign(new Error('Request failed with status code 400'), {
                    isAxiosError: true,
                    response: {
                        status: 400,
                        data: {
                            errors: { Title: ['Too long.'] },
                            codes: { Title: ['tooLong'] },
                            limits: { Title: 200 },
                        },
                    },
                }),
            ),
        'Failed',
    ).catch((e: unknown) => e);

const renderPage = (locale: Locale) =>
    render(
        <DictionaryProvider locale={locale}>
            <AdminLegalPage />
        </DictionaryProvider>,
    );

describe('admin legal page', () => {
    beforeEach(() => save.mockReset());

    it.each([
        ['no', ['Vilkår', 'Personvern', 'Informasjonskapsler']],
        ['en', ['Terms', 'Privacy', 'Cookies']],
    ] as const)('offers the three legal pages in order (%s)', async (locale, labels) => {
        renderPage(locale);
        await screen.findByRole('button', { name: labels[0], pressed: true });

        const [first, second, third] = labels.map(label => screen.getByRole('button', { name: label }));
        expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(second.compareDocumentPosition(third) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it.each([
        ['no', 'Bruk 200 eller færre tegn.'],
        ['en', 'At most 200 characters.'],
    ] as const)('shows a too long title in the page language (%s) with the limit', async (locale, text) => {
        const dict = getDictionary(locale);
        save.mockRejectedValueOnce(await refused());
        renderPage(locale);
        const title = await screen.findByLabelText(new RegExp(`^${dict.admin.buildTitle}`));

        await userEvent.click(screen.getByRole('button', { name: dict.common.save }));

        await waitFor(() => expect(title).toHaveAccessibleDescription(text));
        expect(screen.queryByText('Too long.')).not.toBeInTheDocument();
    });

    it('marks a blank content field in Norwegian without calling the API', async () => {
        const dict = getDictionary('no');
        renderPage('no');
        const body = await screen.findByLabelText(nb.bodyMarkdown);
        await userEvent.clear(body);

        await userEvent.click(screen.getByRole('button', { name: dict.common.save }));

        expect(body).toHaveAccessibleDescription('Du må fylle ut dette feltet.');
        expect(save).not.toHaveBeenCalled();
    });

    it.each([['no', 'nb-NO'], ['en', 'en-GB']] as const)('writes the dates of the earlier versions in the page language (%s)', async (locale, tag) => {
        renderPage(locale);
        const expected = new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date('2026-10-01T10:00:00Z'));
        expect(await screen.findByText(expected)).toBeInTheDocument();
    });
});
