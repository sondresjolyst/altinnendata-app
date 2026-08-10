import axios from 'axios';
import { formatApiError } from '@/lib/errors';

export interface ContactRequest {
    name: string;
    email: string;
    phone?: string;
    useCase?: string;
    budgetNok?: number | null;
    buildSlug?: string;
    message: string;
}

const publicClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

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
