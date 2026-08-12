import axiosInstance from './axiosInstance';
import { request } from '@/lib/apiRequest';

export interface FinnImport {
    url: string;
    title: string | null;
    summary: string | null;
    description: string | null;
    priceNok: number | null;
    coverImageId: string | null;
    imageIds: string[];
    skippedImages: number;
}

const FinnService = {
    import: (url: string) =>
        request(() => axiosInstance.post<FinnImport>('/finn/import', { url }), 'Kunne ikke hente annonsen fra FINN'),
};

export default FinnService;
