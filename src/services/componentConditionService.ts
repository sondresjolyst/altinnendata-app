import axiosInstance from './axiosInstance';
import { request } from '@/lib/apiRequest';
import type { Locale } from '@/i18n/config';

export interface ComponentConditionTranslation {
    locale: string;
    name: string;
}

export interface ComponentCondition {
    id: number;
    key: string;
    /** Resolved for the requested locale, falling back to the default one. */
    name: string;
    sortOrder: number;
    translations: ComponentConditionTranslation[];
}

export interface ComponentConditionInput {
    key: string;
    sortOrder: number;
    translations: ComponentConditionTranslation[];
}

const ComponentConditionService = {
    list: (locale: Locale) =>
        request(() => axiosInstance.get<ComponentCondition[]>('/component-conditions', { params: { locale } }), 'Failed to load conditions'),

    create: (input: ComponentConditionInput) =>
        request(() => axiosInstance.post<ComponentCondition>('/component-conditions', input), 'Failed to create condition'),

    update: (id: number, input: ComponentConditionInput) =>
        request(() => axiosInstance.put<ComponentCondition>(`/component-conditions/${id}`, input), 'Failed to update condition'),

    remove: (id: number) =>
        request(() => axiosInstance.delete(`/component-conditions/${id}`), 'Failed to delete condition'),
};

export default ComponentConditionService;
