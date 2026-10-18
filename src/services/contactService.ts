import publicClient from './publicClient';
import { formatApiError } from '@sjolystinnovation/app-kit/api';

export interface ContactRequest {
    name: string;
    email: string;
    phone?: string;
    useCase?: string;
    budgetNok?: string | null;
    buildSlug?: string;
    message: string;
}

const ContactService = {
    async send(data: ContactRequest): Promise<void> {
        try {
            await publicClient.post('/contact', data);
        } catch (error: unknown) {
            throw new Error(formatApiError(error, 'Failed to send message'));
        }
    },
};

export default ContactService;
