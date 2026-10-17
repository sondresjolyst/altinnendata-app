import axiosInstance from './axiosInstance';
import publicClient from './publicClient';
import { formatApiError } from '@sjolystinnovation/app-kit/api';
import { REVALIDATE_TARGETS, revalidateTarget } from '@/lib/cacheTags';
import { Section } from '@/types/content';
import type { Locale } from '@/i18n/config';

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
