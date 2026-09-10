import axiosInstance from './axiosInstance';
import { request } from '@/lib/apiRequest';
import type { Locale } from '@/i18n/config';

export interface BuildClassTranslation {
    locale: string;
    name: string;
    description: string | null;
}

export interface BuildClass {
    id: number;
    key: string;
    /** Resolved for the requested locale, falling back to the default one. */
    name: string;
    description: string | null;
    sortOrder: number;
    translations: BuildClassTranslation[];
}

export interface BuildClassInput {
    key: string;
    sortOrder: number;
    translations: BuildClassTranslation[];
}

const BuildClassService = {
    list: (locale: Locale) =>
        request(() => axiosInstance.get<BuildClass[]>('/build-classes', { params: { locale } }), 'Failed to load classes'),

    create: (input: BuildClassInput) =>
        request(() => axiosInstance.post<BuildClass>('/build-classes', input), 'Failed to create class'),

    update: (id: number, input: BuildClassInput) =>
        request(() => axiosInstance.put<BuildClass>(`/build-classes/${id}`, input), 'Failed to update class'),

    remove: (id: number) =>
        request(() => axiosInstance.delete(`/build-classes/${id}`), 'Failed to delete class'),
};

export default BuildClassService;
