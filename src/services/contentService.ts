import axios from 'axios';
import axiosInstance from './axiosInstance';
import { formatApiError } from '@/lib/errors';
import { revalidateTarget } from '@/lib/revalidate';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { Section } from '@/types/content';
import type { Locale } from '@/i18n/config';

const publicClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

const ContentService = {
    async getHome(locale: Locale): Promise<Section[]> {
        try {
            const response = await publicClient.get<Section[]>('/content/home', { params: { locale } });
            return Array.isArray(response.data) ? response.data : [];
        } catch {
            return [];
        }
    },

    async updateHome(locale: Locale, sections: Section[]): Promise<Section[]> {
        try {
            const response = await axiosInstance.put<Section[]>('/content/home', sections, { params: { locale } });
            await revalidateTarget(REVALIDATE_TARGETS.home);
            return response.data;
        } catch (error: unknown) {
            throw new Error(formatApiError(error, 'Failed to save content'));
        }
    },
};

export default ContentService;
