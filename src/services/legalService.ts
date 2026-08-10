import axios from 'axios';
import axiosInstance from './axiosInstance';
import { request } from '@/lib/apiRequest';
import { revalidateTarget } from '@/lib/revalidate';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import type { Locale } from '@/i18n/config';

export const LEGAL_KEYS = ['terms', 'privacy', 'cookies'] as const;

export type LegalKey = (typeof LEGAL_KEYS)[number];

export interface LegalPage {
    key: LegalKey;
    locale: string;
    title: string;
    bodyMarkdown: string;
    updatedAt: string;
}

const publicClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

const LegalService = {
    async get(key: LegalKey, locale: Locale): Promise<LegalPage | null> {
        try {
            const response = await publicClient.get<LegalPage>(`/content/legal/${key}`, { params: { locale } });
            return response.data;
        } catch {
            return null;
        }
    },

    listAll: () =>
        request(() => axiosInstance.get<LegalPage[]>('/content/legal'), 'Failed to load legal pages'),

    save: async (key: LegalKey, locale: Locale, title: string, bodyMarkdown: string) => {
        const page = await request(
            () => axiosInstance.put<LegalPage>(`/content/legal/${key}/${locale}`, { title, bodyMarkdown }),
            'Failed to save legal page',
        );
        await revalidateTarget(REVALIDATE_TARGETS.legal);
        return page;
    },
};

export default LegalService;
