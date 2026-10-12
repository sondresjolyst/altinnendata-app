import axios from 'axios';
import axiosInstance from './axiosInstance';
import { formatApiError } from '@sjolystinnovation/app-kit';
import type { Branding } from '@sjolystinnovation/app-kit/branding';
import { revalidateTarget } from '@/lib/revalidate';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';

export type { Branding };

const publicClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

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
