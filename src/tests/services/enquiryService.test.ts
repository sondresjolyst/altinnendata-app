import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError } from 'axios';
import EnquiryService, { type Enquiry } from '@/services/enquiryService';

const get = vi.hoisted(() => vi.fn());
const patch = vi.hoisted(() => vi.fn());
const del = vi.hoisted(() => vi.fn());
vi.mock('@/services/axiosInstance', () => ({ default: { get, patch, delete: del } }));

const enquiry = { id: 4, status: 'InProgress', owner: { id: 'u2', name: 'Kari' } } as Enquiry;

describe('EnquiryService.list', () => {
    beforeEach(() => get.mockReset());

    it('repeats the status instead of using brackets', async () => {
        get.mockResolvedValueOnce({ data: { items: [], total: 0 } });

        await EnquiryService.list({ status: ['New', 'Answered'], mine: true, q: 'Ola Nordmann', page: 2 });

        expect(get).toHaveBeenCalledWith('/admin/enquiries?status=New&status=Answered&mine=true&q=Ola+Nordmann&page=2');
    });

    it('sends no query string when there are no params', async () => {
        get.mockResolvedValueOnce({ data: { items: [], total: 0 } });

        await EnquiryService.list({});

        expect(get).toHaveBeenCalledWith('/admin/enquiries');
    });

    it('leaves out mine, an empty search and no statuses', async () => {
        get.mockResolvedValueOnce({ data: { items: [], total: 0 } });

        await EnquiryService.list({ status: [], mine: false, q: '' });

        expect(get).toHaveBeenCalledWith('/admin/enquiries');
    });

    it('throws the fallback message when the API cannot be reached', async () => {
        get.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));

        await expect(EnquiryService.list({})).rejects.toThrow(new Error('Failed to load the enquiries'));
    });
});

describe('EnquiryService reads', () => {
    beforeEach(() => get.mockReset());

    it('reads the number of new enquiries', async () => {
        get.mockResolvedValueOnce({ data: { new: 3 } });

        await expect(EnquiryService.count()).resolves.toBe(3);
        expect(get).toHaveBeenCalledWith('/admin/enquiries/count');
    });

    it('reads the assignees and one enquiry', async () => {
        get.mockResolvedValueOnce({ data: [{ id: 'u1', name: 'Ola' }] });
        get.mockResolvedValueOnce({ data: enquiry });

        await expect(EnquiryService.assignees()).resolves.toEqual([{ id: 'u1', name: 'Ola' }]);
        await expect(EnquiryService.get(4)).resolves.toEqual(enquiry);
        expect(get).toHaveBeenNthCalledWith(1, '/admin/enquiries/assignees');
        expect(get).toHaveBeenNthCalledWith(2, '/admin/enquiries/4');
    });
});

describe('EnquiryService.update', () => {
    beforeEach(() => patch.mockReset());

    it('patches the body and returns the updated enquiry', async () => {
        patch.mockResolvedValueOnce({ status: 200, data: enquiry });
        const body = { setOwner: true, assignedUserId: 'u1', expectedAssignedUserId: null };

        await expect(EnquiryService.update(4, body)).resolves.toEqual({ ok: true, enquiry });
        expect(patch).toHaveBeenCalledWith('/admin/enquiries/4', body, expect.objectContaining({ validateStatus: expect.any(Function) }));
    });

    it('maps a 409 to the current enquiry without throwing', async () => {
        patch.mockResolvedValueOnce({ status: 409, data: enquiry });

        await expect(EnquiryService.update(4, { setOwner: true, assignedUserId: 'u1', expectedAssignedUserId: null })).resolves.toEqual({ ok: false, conflict: enquiry });
    });

    it('lets the client accept 409 but no other error status', async () => {
        patch.mockResolvedValueOnce({ status: 200, data: enquiry });
        await EnquiryService.update(4, { status: 'Done' });
        const { validateStatus } = patch.mock.calls[0][2] as { validateStatus: (code: number) => boolean };

        expect([200, 409].map(validateStatus)).toEqual([true, true]);
        expect([400, 404, 500].map(validateStatus)).toEqual([false, false, false]);
    });

    it('throws the fallback message for other errors', async () => {
        patch.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));

        await expect(EnquiryService.update(4, { status: 'Done' })).rejects.toThrow(new Error('Failed to update the enquiry'));
    });
});

describe('EnquiryService.remove', () => {
    beforeEach(() => del.mockReset());

    it('deletes the enquiry', async () => {
        del.mockResolvedValueOnce({ data: undefined });

        await expect(EnquiryService.remove(4)).resolves.toBeUndefined();
        expect(del).toHaveBeenCalledWith('/admin/enquiries/4');
    });

    it('throws the fallback message when the delete fails', async () => {
        del.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));

        await expect(EnquiryService.remove(4)).rejects.toThrow(new Error('Failed to delete the enquiry'));
    });
});
