import axios from 'axios';
import axiosInstance from './axiosInstance';
import { request } from '@sjolystinnovation/app-kit/api';
import { REVALIDATE_TARGETS, revalidateTarget } from '@/lib/cacheTags';
import { contentImagePath } from '@sjolystinnovation/app-kit/ui';
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
    condition: ComponentConditionRef | null;
    sortOrder: number;
}

/** A part's condition in the requested locale, e.g. "Brukt". */
export interface ComponentConditionRef {
    id: number;
    key: string;
    name: string;
}

/** The build's class in the requested locale, as the card and spec table show it. */
export interface BuildClassRef {
    id: number;
    key: string;
    name: string;
    description: string | null;
}

export interface BuildSummary {
    id: number;
    slug: string;
    category: string | null;
    availability: Availability;
    buildClass: BuildClassRef | null;
    priceNok: number | null;
    builtOn: string | null;
    soldOn: string | null;
    coverImageId: string | null;
    published: boolean;
    sortOrder: number;
    locale: string;
    title: string;
    summary: string | null;
    createdAt: string;
    updatedAt: string;
    /** The distinct conditions of the parts, in the conditions' own order. */
    conditions: ComponentConditionRef[];
    /** Whether the build has parts and each has a condition. A build cannot be sold without it. */
    allPartsHaveCondition: boolean;
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
    buildClass: BuildClassRef | null;
    priceNok: number | null;
    builtOn: string | null;
    soldOn: string | null;
    coverImageId: string | null;
    finnUrl: string | null;
    published: boolean;
    sortOrder: number;
    translations: BuildTranslation[];
    components: BuildComponent[];
    imageIds: string[];
    createdAt: string;
    updatedAt: string;
    conditions: ComponentConditionRef[];
    allPartsHaveCondition: boolean;
}

export interface BuildInput {
    /** The updatedAt the edit form loaded. The API refuses the save when the build has changed since. */
    expectedUpdatedAt?: string;
    category: string | null;
    availability: Availability;
    buildClassId: number | null;
    priceNok: number | null;
    builtOn: string | null;
    soldOn: string | null;
    finnUrl: string | null;
    published: boolean;
    sortOrder: number;
    imageIds: string[];
    translations: BuildTranslation[];
    components: Array<{
        componentPartId: number | null;
        componentCategoryId: number | null;
        componentConditionId: number | null;
        name: string | null;
        details: string | null;
        sortOrder: number;
    }>;
}

const publicClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export const coverImageSrc = (build: { coverImageId: string | null }): string | null =>
    build.coverImageId != null ? contentImagePath(build.coverImageId) : null;

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

    /** The published build with the slug, or null when there is none. */
    findBySlug: async (slug: string, locale: Locale) => {
        const response = await request(
            () => publicClient.get<BuildDetail>(`/builds/${slug}`, { params: { locale }, validateStatus: status => status < 400 || status === 404 }).then(data => ({ data })),
            'Failed to load build',
        );
        return response.status === 404 ? null : response.data;
    },

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
