import axiosInstance from './axiosInstance';
import { request } from '@/lib/apiRequest';
import type { Locale } from '@/i18n/config';

export interface CategoryTranslation {
    locale: string;
    name: string;
}

export interface ComponentCategory {
    id: number;
    key: string;
    name: string;
    sortOrder: number;
    translations: CategoryTranslation[];
}

export interface ComponentManufacturer {
    id: number;
    name: string;
}

export interface ComponentPart {
    id: number;
    categoryId: number;
    categoryKey: string;
    manufacturerId: number | null;
    manufacturerName: string | null;
    name: string;
    details: string | null;
}

export interface CategoryTree extends Omit<ComponentCategory, 'translations'> {
    parts: ComponentPart[];
}

export interface CategoryInput {
    key: string;
    sortOrder: number;
    translations: CategoryTranslation[];
}

export interface PartInput {
    categoryId: number;
    manufacturerId: number | null;
    name: string;
    details: string | null;
}

const ComponentService = {
    getTree: (locale: Locale) =>
        request(() => axiosInstance.get<CategoryTree[]>('/components/tree', { params: { locale } }), 'Failed to load components'),

    listCategories: (locale: Locale) =>
        request(() => axiosInstance.get<ComponentCategory[]>('/components/categories', { params: { locale } }), 'Failed to load categories'),

    createCategory: (input: CategoryInput) =>
        request(() => axiosInstance.post<ComponentCategory>('/components/categories', input), 'Failed to create category'),

    updateCategory: (id: number, input: CategoryInput) =>
        request(() => axiosInstance.put<ComponentCategory>(`/components/categories/${id}`, input), 'Failed to update category'),

    removeCategory: (id: number) =>
        request(() => axiosInstance.delete(`/components/categories/${id}`), 'Failed to delete category'),

    listManufacturers: () =>
        request(() => axiosInstance.get<ComponentManufacturer[]>('/components/manufacturers'), 'Failed to load manufacturers'),

    createManufacturer: (name: string) =>
        request(() => axiosInstance.post<ComponentManufacturer>('/components/manufacturers', { name }), 'Failed to create manufacturer'),

    renameManufacturer: (id: number, name: string) =>
        request(() => axiosInstance.put<ComponentManufacturer>(`/components/manufacturers/${id}`, { name }), 'Failed to rename manufacturer'),

    removeManufacturer: (id: number) =>
        request(() => axiosInstance.delete(`/components/manufacturers/${id}`), 'Failed to delete manufacturer'),

    listParts: (categoryId?: number) =>
        request(() => axiosInstance.get<ComponentPart[]>('/components/parts', { params: categoryId ? { categoryId } : {} }), 'Failed to load parts'),

    createPart: (input: PartInput) =>
        request(() => axiosInstance.post<ComponentPart>('/components/parts', input), 'Failed to create part'),

    updatePart: (id: number, input: PartInput) =>
        request(() => axiosInstance.put<ComponentPart>(`/components/parts/${id}`, input), 'Failed to update part'),

    removePart: (id: number) =>
        request(() => axiosInstance.delete(`/components/parts/${id}`), 'Failed to delete part'),
};

export default ComponentService;
