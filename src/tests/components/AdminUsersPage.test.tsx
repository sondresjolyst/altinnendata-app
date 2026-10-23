import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from '@sjolystinnovation/app-kit/api';
import { defaultAdminUsersPanelStrings } from '@sjolystinnovation/app-kit/admin';
import { nbAdminUsersPanelStrings as nb } from '@sjolystinnovation/app-kit/locales/nb';
import { resetTestMocks, toastSpies } from '@sjolystinnovation/app-kit/testing';
import AdminUsersPage from '@/app/[locale]/(protected)/admin/users/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { Locale } from '@/i18n/config';

const service = vi.hoisted(() => ({
    getUsers: vi.fn(),
    roles: vi.fn(),
    addRole: vi.fn(),
    removeRole: vi.fn(),
    deleteUser: vi.fn(),
    invite: vi.fn(),
}));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('@/services/adminService', () => ({ default: service }));

const admin = { id: 'u1', userName: 'ola', email: 'ola@kunde.no', firstName: 'Ola', lastName: 'Nordmann', roles: ['Admin'], isDeleted: false };

// The Error that the admin service throws for an API refusal.
const refused = (status: number, data: object) =>
    request(
        () => Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, data } })),
        'Failed',
    ).catch((e: unknown) => e);

const renderPage = (locale: Locale) =>
    render(
        <DictionaryProvider locale={locale}>
            <AdminUsersPage />
        </DictionaryProvider>,
    );

const text = (locale: Locale) => (locale === 'no' ? nb : defaultAdminUsersPanelStrings);

const fillInvite = async (locale: Locale) => {
    await userEvent.type(screen.getByLabelText(new RegExp(`^${text(locale).firstName}`)), 'Kari');
    await userEvent.type(screen.getByLabelText(new RegExp(`^${text(locale).lastName}`)), 'Nordmann');
    await userEvent.type(screen.getByLabelText(new RegExp(`^${text(locale).email}`)), 'kari@kunde.no');
    await userEvent.click(screen.getByRole('button', { name: text(locale).sendInvite }));
};

describe('admin users page', () => {
    beforeEach(() => {
        resetTestMocks();
        for (const fn of Object.values(service)) fn.mockReset();
        service.getUsers.mockResolvedValue([admin]);
        service.roles.mockResolvedValue(['Default', 'Admin']);
    });

    it('loads the roles from the service', async () => {
        renderPage('no');

        expect(await screen.findByRole('option', { name: 'Default' })).toBeInTheDocument();
        expect(service.roles).toHaveBeenCalledOnce();
        expect(screen.getByRole('heading', { name: nb.users })).toBeInTheDocument();
    });

    it.each(['no', 'en'] as const)('says a taken email is taken in the page language (%s)', async locale => {
        service.invite.mockRejectedValueOnce(await refused(409, { message: 'That email already has an account.', code: 'emailTaken' }));
        renderPage(locale);
        await screen.findByText('ola@kunde.no');

        await fillInvite(locale);

        await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith(text(locale).errors.emailTaken));
    });

    it('shows the invite field errors in Norwegian', async () => {
        service.invite.mockRejectedValueOnce(await refused(400, {
            errors: { FirstName: ['At most 50 characters.'], Email: ['Not a valid email address.'] },
            codes: { FirstName: ['tooLong'], Email: ['invalidEmail'] },
            limits: { FirstName: 50 },
        }));
        renderPage('no');
        await screen.findByText('ola@kunde.no');

        await fillInvite('no');

        await waitFor(() => expect(screen.getByLabelText(new RegExp(`^${nb.firstName}`))).toHaveAccessibleDescription('Bruk 50 eller færre tegn.'));
        expect(screen.getByLabelText(new RegExp(`^${nb.email}`))).toHaveAccessibleDescription(nb.validation.invalidEmail);
    });

    it.each([
        ['lastAdmin', nb.deleteErrors.lastAdmin],
        ['accountChangeConflict', nb.deleteErrors.accountChangeConflict],
    ] as const)('says why a delete was refused in Norwegian (%s)', async (code, message) => {
        service.deleteUser.mockRejectedValueOnce(await refused(409, { message: 'Refused.', code }));
        renderPage('no');

        await userEvent.click(await screen.findByTitle(nb.delete));
        await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: nb.delete }));

        await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith(message));
    });
});
