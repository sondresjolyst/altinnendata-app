import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import { resetTestMocks } from '@sjolystinnovation/app-kit/testing';
import AdminEnquiriesPage from '@/app/[locale]/(protected)/admin/enquiries/page';
import AdminOverview from '@/app/[locale]/(protected)/admin/page';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import type { EnquirySummary } from '@/services/enquiryService';

const service = vi.hoisted(() => ({ list: vi.fn(), count: vi.fn() }));

vi.mock('sonner', async () => (await import('@sjolystinnovation/app-kit/testing')).toastMock());
vi.mock('next/navigation', async () => (await import('@sjolystinnovation/app-kit/testing')).nextNavigationMock());
vi.mock('@/services/enquiryService', () => ({ default: service }));

const summary = (overrides: Partial<EnquirySummary>): EnquirySummary => ({
    id: 1,
    createdAt: '2026-10-18T10:00:00Z',
    name: 'Kari Nordmann',
    buildTitle: 'Spillmaskin',
    useCase: null,
    status: 'InProgress',
    owner: { id: 'a1', name: 'Ola Admin' },
    ownerRemoved: false,
    ...overrides,
});

const renderPage = (locale: 'no' | 'en' = 'no') =>
    render(
        <DictionaryProvider locale={locale}>
            <AdminEnquiriesPage />
        </DictionaryProvider>,
    );

describe('the admin enquiries page', () => {
    beforeEach(() => {
        resetTestMocks();
        service.list.mockReset();
        service.count.mockReset();
        service.list.mockResolvedValue({ items: [summary({})], total: 1 });
    });

    it('asks for every status but Done by default', async () => {
        renderPage();
        await screen.findByText('Kari Nordmann');

        expect(service.list).toHaveBeenLastCalledWith({ status: ['New', 'InProgress', 'Answered'], mine: false, q: '', page: 1 });
        expect(screen.getByRole('checkbox', { name: 'Ferdig' })).not.toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Ny' })).toBeChecked();
    });

    it('changes the request when a status is ticked, Mine is toggled or the search is typed', async () => {
        renderPage();
        await screen.findByText('Kari Nordmann');

        fireEvent.click(screen.getByRole('checkbox', { name: 'Ferdig' }));
        await waitFor(() => expect(service.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: ['New', 'InProgress', 'Answered', 'Done'] })));

        fireEvent.click(screen.getByRole('checkbox', { name: 'Mine' }));
        await waitFor(() => expect(service.list).toHaveBeenLastCalledWith(expect.objectContaining({ mine: true })));

        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'kari' } });
        expect(service.list).not.toHaveBeenCalledWith(expect.objectContaining({ q: 'kari' }));
        await waitFor(() => expect(service.list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'kari', page: 1 })));
    });

    it('shows the build title, else the use case, the Oslo date and a link to the enquiry', async () => {
        service.list.mockResolvedValue({
            items: [
                summary({ id: 4, createdAt: '2026-10-18T23:30:00Z' }),
                summary({ id: 5, name: 'Per', buildTitle: null, useCase: 'Video editing' }),
            ],
            total: 2,
        });
        renderPage();

        const rows = (await screen.findAllByRole('row')).slice(1);
        expect(within(rows[0]).getByText('19.10.2026')).toBeInTheDocument();
        expect(within(rows[0]).getByText('Spillmaskin')).toBeInTheDocument();
        expect(within(rows[0]).getByRole('link', { name: 'Kari Nordmann' })).toHaveAttribute('href', '/no/admin/enquiries/4');
        expect(within(rows[1]).getByText('Video editing')).toBeInTheDocument();
    });

    it('makes rows with status New bold', async () => {
        service.list.mockResolvedValue({
            items: [summary({ id: 1, name: 'Ny Person', status: 'New' }), summary({ id: 2, name: 'Gammel Person', status: 'Answered' })],
            total: 2,
        });
        renderPage();

        const rows = (await screen.findAllByRole('row')).slice(1);
        expect(rows[0]).toHaveClass('font-bold');
        expect(rows[1]).not.toHaveClass('font-bold');
    });

    it('shows the owner, None, and the Owner removed badge', async () => {
        service.list.mockResolvedValue({
            items: [
                summary({ id: 1 }),
                summary({ id: 2, owner: null }),
                summary({ id: 3, owner: null, ownerRemoved: true }),
            ],
            total: 3,
        });
        renderPage();

        const rows = (await screen.findAllByRole('row')).slice(1);
        expect(within(rows[0]).getByText('Ola Admin')).toBeInTheDocument();
        expect(within(rows[0]).queryByText('Eier fjernet')).not.toBeInTheDocument();
        expect(within(rows[1]).getByText('Ingen')).toBeInTheDocument();
        expect(within(rows[1]).queryByText('Eier fjernet')).not.toBeInTheDocument();
        expect(within(rows[2]).getByText('Eier fjernet')).toBeInTheDocument();
    });

    it('pages only when there are more than 50', async () => {
        service.list.mockResolvedValue({ items: [summary({})], total: 50 });
        const { unmount } = renderPage();
        await screen.findByText('Kari Nordmann');
        expect(screen.queryByRole('button', { name: 'Neste' })).not.toBeInTheDocument();
        unmount();

        service.list.mockResolvedValue({ items: [summary({})], total: 120 });
        renderPage();
        await screen.findByText('Side 1 av 3');
        expect(screen.getByRole('button', { name: 'Forrige' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Neste' }));
        await waitFor(() => expect(service.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    });

    it('asks for a status instead of calling the list empty when none is ticked', async () => {
        renderPage();
        await screen.findByText('Kari Nordmann');
        for (const name of ['Ny', 'Under behandling', 'Besvart']) fireEvent.click(screen.getByRole('checkbox', { name }));

        expect(await screen.findByText('Velg minst én status.')).toBeInTheDocument();
        expect(screen.queryByText('Ingen henvendelser.')).not.toBeInTheDocument();
        expect(service.list).toHaveBeenCalledTimes(3);
    });

    it('dims the rows while a new request loads and shows the error when a reload fails', async () => {
        renderPage();
        await screen.findByText('Kari Nordmann');

        let fail: (reason: Error) => void = () => {};
        service.list.mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject; }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Ferdig' }));

        await waitFor(() => expect(screen.getByRole('table').parentElement).toHaveAttribute('aria-busy', 'true'));
        expect(screen.getByRole('table').parentElement).toHaveClass('opacity-50');

        fail(new Error('boom'));
        expect(await screen.findByText('Kunne ikke laste henvendelsene.')).toBeInTheDocument();
        expect(screen.queryByText('Kari Nordmann')).not.toBeInTheDocument();
    });

    it('goes to the last page when the total shrinks below the current page', async () => {
        service.list.mockResolvedValue({ items: [summary({})], total: 120 });
        renderPage();
        await screen.findByText('Side 1 av 3');
        service.list.mockImplementation(async ({ page }: { page: number }) =>
            page === 3 ? { items: [], total: 60 } : { items: [summary({ name: `Side ${page}` })], total: 60 });
        fireEvent.click(screen.getByRole('button', { name: 'Neste' }));
        fireEvent.click(screen.getByRole('button', { name: 'Neste' }));

        expect(await screen.findByText('Side 2 av 2')).toBeInTheDocument();
        expect(screen.getByText('Side 2')).toBeInTheDocument();
    });

    it('goes back to page 1 when a filter changes', async () => {
        service.list.mockResolvedValue({ items: [summary({})], total: 120 });
        renderPage();
        await screen.findByText('Side 1 av 3');
        fireEvent.click(screen.getByRole('button', { name: 'Neste' }));
        await screen.findByText('Side 2 av 3');

        fireEvent.click(screen.getByRole('checkbox', { name: 'Mine' }));
        await waitFor(() => expect(service.list).toHaveBeenLastCalledWith(expect.objectContaining({ mine: true, page: 1 })));
    });

    it('renders in English', async () => {
        renderPage('en');
        expect(await screen.findByRole('columnheader', { name: 'Received' })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'In progress' })).toBeChecked();
    });
});

describe('the Oversikt enquiries card', () => {
    beforeEach(() => {
        resetTestMocks();
        service.count.mockReset();
    });

    const renderOverview = (locale: 'no' | 'en' = 'no') =>
        render(
            <DictionaryProvider locale={locale}>
                <AdminOverview />
            </DictionaryProvider>,
        );

    it('links to the list and shows the number of new enquiries', async () => {
        service.count.mockResolvedValue(3);
        renderOverview();

        const link = screen.getByRole('link', { name: /Henvendelser/ });
        expect(link).toHaveAttribute('href', '/no/admin/enquiries');
        expect(within(link).getByText('Henvendelser fra kontaktskjemaet.')).toBeInTheDocument();
        expect(await within(link).findByText('3 nye')).toBeInTheDocument();
    });

    it('hides the number at zero', async () => {
        service.count.mockResolvedValue(0);
        renderOverview();

        await waitFor(() => expect(service.count).toHaveBeenCalled());
        expect(screen.queryByText(/nye$/)).not.toBeInTheDocument();
    });

    it('renders in English', async () => {
        service.count.mockResolvedValue(2);
        renderOverview('en');

        expect(await screen.findByText('2 new')).toBeInTheDocument();
        expect(screen.getByText('Messages from the contact form.')).toBeInTheDocument();
    });
});
