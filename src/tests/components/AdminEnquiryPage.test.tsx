import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { auth, makeSession, navigation, resetTestMocks, toastSpies } from '@sjolystinnovation/app-kit/testing';
import AdminEnquiryPage from '@/app/[locale]/(protected)/admin/enquiries/[id]/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { Enquiry } from '@/services/enquiryService';

const service = vi.hoisted(() => ({ get: vi.fn(), assignees: vi.fn(), update: vi.fn(), remove: vi.fn() }));
const builds = vi.hoisted(() => ({ findBySlug: vi.fn() }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('next/navigation', async () => (await import('@sjolystinnovation/app-kit/testing')).nextNavigationMock());
vi.mock('next-auth/react', async () => (await import('@sjolystinnovation/app-kit/testing')).nextAuthMock());
vi.mock('@/services/enquiryService', () => ({ default: service }));
vi.mock('@/services/buildService', () => ({ default: builds }));

const other = { id: 'a2', name: 'Ola Admin' };
const me = { id: 'me', name: 'Meg' };

const enquiry = (overrides: Partial<Enquiry> = {}): Enquiry => ({
    id: 4,
    createdAt: '2026-10-18T10:05:30Z',
    name: 'Kari Nordmann',
    email: 'kari@example.no',
    phone: '+47 912 34 567',
    buildTitle: 'Spillmaskin',
    buildSlug: 'spillmaskin',
    useCase: 'Video editing',
    budgetNok: '15 000 til 20 000',
    status: 'New',
    owner: null,
    ownerRemoved: false,
    locale: 'no',
    message: 'Hei\n<b>x</b>',
    receiptSent: true,
    noticeSentAt: '2026-10-18T10:05:31Z',
    updatedAt: '2026-10-18T10:05:30Z',
    ...overrides,
});

// A promise that React's use() reads without suspending.
const settled = <T,>(value: T) => Object.assign(Promise.resolve(value), { status: 'fulfilled' as const, value });

const renderPage = (locale: 'no' | 'en' = 'no') =>
    render(
        <DictionaryProvider locale={locale}>
            <Suspense fallback={null}>
                <AdminEnquiryPage params={settled({ id: '4' })} />
            </Suspense>
        </DictionaryProvider>,
    );

describe('the admin enquiry page', () => {
    beforeEach(() => {
        resetTestMocks();
        for (const fn of [...Object.values(service), ...Object.values(builds)]) fn.mockReset();
        auth.state.data = makeSession({ user: { id: 'me', name: 'Meg', email: 'me@x.no', roles: ['Admin'] } });
        auth.state.status = 'authenticated';
        service.get.mockResolvedValue(enquiry());
        service.assignees.mockResolvedValue([me, other]);
        builds.findBySlug.mockResolvedValue({ slug: 'spillmaskin' });
    });

    afterEach(() => vi.restoreAllMocks());

    it('shows every field and the message as text with its line break', async () => {
        renderPage();

        expect(await screen.findByText('Kari Nordmann')).toBeInTheDocument();
        expect(screen.getByText('18.10.2026 12:05:30')).toBeInTheDocument();
        expect(screen.getByText('kari@example.no')).toBeInTheDocument();
        expect(screen.getByText('+47 912 34 567')).toBeInTheDocument();
        expect(screen.getByText('Video editing')).toBeInTheDocument();
        expect(screen.getByText('15 000 til 20 000')).toBeInTheDocument();
        const message = screen.getByText((_, element) => element?.textContent === 'Hei\n<b>x</b>' && element.classList.contains('whitespace-pre-wrap'));
        expect(message.querySelector('b')).toBeNull();
        expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('New');
        expect(screen.getByRole('combobox', { name: 'Eier' })).toHaveValue('');
    });

    it('links to the build while it exists', async () => {
        renderPage();

        expect(await screen.findByRole('link', { name: 'Spillmaskin' })).toHaveAttribute('href', '/no/builds/spillmaskin');
    });

    it('shows the stored title without a link when the build is gone', async () => {
        builds.findBySlug.mockResolvedValue(null);
        renderPage();

        expect(await screen.findByText('Spillmaskin')).toBeInTheDocument();
        await waitFor(() => expect(builds.findBySlug).toHaveBeenCalledWith('spillmaskin', 'no'));
        expect(screen.queryByRole('link', { name: 'Spillmaskin' })).not.toBeInTheDocument();
    });

    it('warns about a missing receipt only when none was sent', async () => {
        service.get.mockResolvedValue(enquiry({ receiptSent: false }));
        const first = renderPage();
        expect(await screen.findByText('Ingen kvittering sendt. Bekreft mottak selv hvis meldingen gjelder angrerett.')).toBeInTheDocument();
        first.unmount();

        service.get.mockResolvedValue(enquiry({ receiptSent: true }));
        renderPage();
        await screen.findByText('Kari Nordmann');
        expect(screen.queryByText(/Ingen kvittering sendt/)).not.toBeInTheDocument();
    });

    it('takes an unowned case for the current user', async () => {
        service.update.mockResolvedValue({ ok: true, enquiry: enquiry({ owner: me }) });
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Ta saken' }));

        expect(service.update).toHaveBeenCalledWith(4, { setOwner: true, assignedUserId: 'me', expectedAssignedUserId: null });
        await waitFor(() => expect(screen.getByRole('button', { name: 'Ta saken' })).toBeDisabled());
    });

    it('asks before taking over and sends the other owner as expected', async () => {
        service.get.mockResolvedValue(enquiry({ owner: other }));
        service.update.mockResolvedValue({ ok: true, enquiry: enquiry({ owner: me }) });
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Ta over fra Ola Admin' }));

        expect(confirm).toHaveBeenCalledWith('Ola Admin eier denne saken. Vil du ta den over?');
        expect(service.update).toHaveBeenCalledWith(4, { setOwner: true, assignedUserId: 'me', expectedAssignedUserId: 'a2' });
    });

    it('sends nothing when the takeover is cancelled', async () => {
        service.get.mockResolvedValue(enquiry({ owner: other }));
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Ta over fra Ola Admin' }));

        expect(service.update).not.toHaveBeenCalled();
    });

    it('asks the same question when the owner select would replace another admin', async () => {
        service.get.mockResolvedValue(enquiry({ owner: other }));
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
        const user = userEvent.setup();
        renderPage();

        await user.selectOptions(await screen.findByRole('combobox', { name: 'Eier' }), 'Meg');

        expect(confirm).toHaveBeenCalledWith('Ola Admin eier denne saken. Vil du ta den over?');
        expect(service.update).not.toHaveBeenCalled();
    });

    it('clears the owner from the select, expecting the current one', async () => {
        service.get.mockResolvedValue(enquiry({ owner: me }));
        service.update.mockResolvedValue({ ok: true, enquiry: enquiry() });
        const user = userEvent.setup();
        renderPage();

        await user.selectOptions(await screen.findByRole('combobox', { name: 'Eier' }), 'Ingen');

        expect(service.update).toHaveBeenCalledWith(4, { setOwner: true, assignedUserId: null, expectedAssignedUserId: 'me' });
    });

    it('saves the status on change', async () => {
        service.update.mockResolvedValue({ ok: true, enquiry: enquiry({ status: 'Answered' }) });
        const user = userEvent.setup();
        renderPage();

        await user.selectOptions(await screen.findByRole('combobox', { name: 'Status' }), 'Besvart');

        expect(service.update).toHaveBeenCalledWith(4, { status: 'Answered' });
        await waitFor(() => expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('Answered'));
    });

    it('shows the conflict and the new owner without retrying', async () => {
        service.update.mockResolvedValue({ ok: false, conflict: enquiry({ owner: other }) });
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Ta saken' }));

        expect(await screen.findByText('Saken ble endret av noen andre. Se over og prøv igjen.')).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Eier' })).toHaveValue('a2');
        expect(screen.getByRole('button', { name: 'Ta over fra Ola Admin' })).toBeInTheDocument();
        expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('disables Ta saken with its reason when the case is mine', async () => {
        service.get.mockResolvedValue(enquiry({ owner: me }));
        renderPage();

        const button = await screen.findByRole('button', { name: 'Ta saken' });
        expect(button).toBeDisabled();
        expect(button).toHaveAccessibleDescription('Saken er din');
    });

    it('links the reply to the address with the subject for each locale', async () => {
        const first = renderPage();
        expect(await screen.findByRole('link', { name: 'Svar på e-post' })).toHaveAttribute('href', 'mailto:kari@example.no?subject=Henvendelsen%20din%20til%20Altinnendata');
        first.unmount();

        service.get.mockResolvedValue(enquiry({ locale: 'en' }));
        renderPage('en');
        expect(await screen.findByRole('link', { name: 'Reply by email' })).toHaveAttribute('href', 'mailto:kari@example.no?subject=Your%20enquiry%20to%20Altinnendata');
    });

    it('names the other owner next to the reply link', async () => {
        service.get.mockResolvedValue(enquiry({ owner: other }));
        renderPage();

        expect(await screen.findByText('Ola Admin eier denne saken')).toBeInTheDocument();
    });

    it('deletes after confirming and goes back to the list', async () => {
        service.remove.mockResolvedValue(undefined);
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Slett' }));

        expect(confirm).toHaveBeenCalledWith('Slette henvendelsen? Dette kan ikke angres.');
        await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith('/no/admin/enquiries'));
        expect(service.remove).toHaveBeenCalledWith(4);
    });

    it('keeps the enquiry when the delete is cancelled', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Slett' }));

        expect(service.remove).not.toHaveBeenCalled();
        expect(navigation.router.push).not.toHaveBeenCalled();
    });

    it('tells the user when an update fails', async () => {
        service.update.mockRejectedValue(new Error('boom'));
        const user = userEvent.setup();
        renderPage();

        await user.click(await screen.findByRole('button', { name: 'Ta saken' }));

        await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith('boom'));
    });
});
