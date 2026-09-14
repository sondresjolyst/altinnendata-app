import axios from 'axios';
import axiosInstance from './axiosInstance';
import { formatApiError } from '@/lib/errors';
import { revalidateTarget } from '@/lib/revalidate';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';

export interface Branding {
    logoData?: string | null;
    logoContentType?: string | null;
    iconData?: string | null;
    iconContentType?: string | null;
}

const publicClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export const toDataUrl = (data?: string | null, contentType?: string | null): string | null =>
    data && contentType ? `data:${contentType};base64,${data}` : null;

const BrandingService = {
    async get(): Promise<Branding> {
        try {
            const response = await publicClient.get<Branding>('/branding');
            return response.data;
        } catch {
            return {};
        }
    },

    async update(form: FormData): Promise<Branding> {
        let branding: Branding;
        try {
            branding = (await axiosInstance.put<Branding>('/branding', form)).data;
        } catch (error: unknown) {
            throw new Error(formatApiError(error, 'Failed to save branding'));
        }
        await revalidateTarget(REVALIDATE_TARGETS.branding);
        return branding;
    },
};

export default BrandingService;
