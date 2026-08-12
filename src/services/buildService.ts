import axios from 'axios';
import axiosInstance from './axiosInstance';
import { request } from '@/lib/apiRequest';
import { revalidateTarget } from '@/lib/revalidate';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import { imageUrl, imageSrcSet } from './imageService';
import type { Section } from '@/types/content';
import type { Locale } from '@/i18n/config';

export type Availability = 'Available' | 'Reserved' | 'Sold';

export interface BuildComponent {
    id: number;
    componentPartId: number | null;
    componentCategoryId: number | null;
    categoryKey: string | null;
    categoryName: string | null;
    manufacturerName: string | null;
    name: string;
    details: string | null;
    sortOrder: number;
}

export interface BuildSummary {
    id: number;
    slug: string;
    category: string | null;
    availability: Availability;
    priceNok: number | null;
    builtOn: string | null;
    coverImageId: string | null;
    published: boolean;
    sortOrder: number;
    locale: string;
    title: string;
    summary: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BuildDetail extends BuildSummary {
    finnUrl: string | null;
    description: string | null;
    imageIds: string[];
    components: BuildComponent[];
    availableLocales: string[];
}

export interface BuildTranslation {
    locale: string;
    title: string;
    summary: string | null;
    description: string | null;
}

export interface BuildAdmin {
    id: number;
    slug: string;
    category: string | null;
    availability: Availability;
    priceNok: number | null;
    builtOn: string | null;
    coverImageId: string | null;
    finnUrl: string | null;
    published: boolean;
    sortOrder: number;
    translations: BuildTranslation[];
    components: BuildComponent[];
    imageIds: string[];
    createdAt: string;
    updatedAt: string;
}

export interface BuildInput {
    category: string | null;
    availability: Availability;
    priceNok: number | null;
    builtOn: string | null;
    finnUrl: string | null;
    published: boolean;
    sortOrder: number;
    imageIds: string[];
    translations: BuildTranslation[];
    components: Array<{
        componentPartId: number | null;
        componentCategoryId: number | null;
        name: string | null;
        details: string | null;
        sortOrder: number;
    }>;
}

const publicClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export const coverImageSrc = (build: { coverImageId: string | null }): string | null =>
    build.coverImageId != null ? imageUrl(build.coverImageId) : null;

export const coverImageSrcSet = (build: { coverImageId: string | null }): string | undefined =>
    build.coverImageId != null ? imageSrcSet(build.coverImageId) : undefined;

const BuildService = {
    list: (locale: Locale, all = false) => {
        const client = all ? axiosInstance : publicClient;
        return request(
            () => client.get<BuildSummary[]>('/builds', { params: { locale, ...(all ? { all: true } : {}) } }),
            'Failed to load builds',
        );
    },

    getBySlug: (slug: string, locale: Locale) =>
        request(() => publicClient.get<BuildDetail>(`/builds/${slug}`, { params: { locale } }), 'Failed to load build'),

    getForEdit: (id: number) =>
        request(() => axiosInstance.get<BuildAdmin>(`/builds/${id}/edit`), 'Failed to load build'),

    create: async (input: BuildInput) => {
        const build = await request(() => axiosInstance.post<BuildAdmin>('/builds', input), 'Failed to create build');
        await revalidateTarget(REVALIDATE_TARGETS.builds);
        return build;
    },

    update: async (id: number, input: BuildInput) => {
        const build = await request(() => axiosInstance.put<BuildAdmin>(`/builds/${id}`, input), 'Failed to update build');
        await revalidateTarget(REVALIDATE_TARGETS.builds);
        return build;
    },

    remove: async (id: number) => {
        await request(() => axiosInstance.delete(`/builds/${id}`), 'Failed to delete build');
        await revalidateTarget(REVALIDATE_TARGETS.builds);
    },
};

export default BuildService;
