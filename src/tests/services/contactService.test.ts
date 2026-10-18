import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import ContactService, { type ContactRequest } from '@/services/contactService';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/services/publicClient', () => ({ default: { post } }));

const enquiry: ContactRequest = {
    name: 'Ola',
    email: 'ola@altinnendata.invalid',
    phone: '12345678',
    useCase: 'Gaming',
    budgetNok: null,
    buildSlug: '',
    message: 'Hei',
};

const refused = (status: number, data: unknown) =>
    new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status,
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data,
    });

describe('ContactService.send', () => {
    beforeEach(() => post.mockReset());

    it('posts the enquiry unchanged to /contact through the shared public client', async () => {
        post.mockResolvedValueOnce({ data: null });

        await expect(ContactService.send(enquiry)).resolves.toBeUndefined();
        expect(post).toHaveBeenCalledTimes(1);
        expect(post).toHaveBeenCalledWith('/contact', enquiry);
    });

    it('throws the message the API gives when it refuses the enquiry', async () => {
        post.mockRejectedValueOnce(refused(400, { message: 'Email is not valid.' }));

        await expect(ContactService.send(enquiry)).rejects.toThrow(new Error('Email is not valid.'));
    });

    it('throws the fallback message when the API cannot be reached', async () => {
        post.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));

        await expect(ContactService.send(enquiry)).rejects.toThrow(new Error('Failed to send message'));
    });
});
