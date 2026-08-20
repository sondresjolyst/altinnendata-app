import axiosInstance from './axiosInstance';
import { formatApiError } from '@/lib/errors';

export interface Settings {
    contactRecipientEmail: string;
    companyName: string;
    companyLegalName: string;
    orgNumber: string;
    vatRegistered: boolean;
    streetAddress: string;
    postalCode: string;
    addressLocality: string;
    addressRegion: string;
    publicEmail: string;
    publicPhone: string;
}

const SettingsService = {
    async get(): Promise<Settings> {
        try {
            const response = await axiosInstance.get<Settings>('/settings');
            return response.data;
        } catch (error: unknown) {
            throw new Error(formatApiError(error, 'Failed to load settings'));
        }
    },

    async update(data: Settings): Promise<Settings> {
        try {
            const response = await axiosInstance.put<Settings>('/settings', data);
            return response.data;
        } catch (error: unknown) {
            throw new Error(formatApiError(error, 'Failed to update settings'));
        }
    },
};

export default SettingsService;
