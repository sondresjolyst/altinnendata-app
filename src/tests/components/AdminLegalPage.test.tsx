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
    LEGAL_KEYS: ['terms', 'privacy', 'cookies'],
    default: {
        listAll: () => Promise.resolve([{ key: 'terms', locale: 'no', title: 'Vilkår', bodyMarkdown: '# Vilkår', updatedAt: '2026-10-01' }]),
        save: (...args: unknown[]) => save(...args),
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
});
