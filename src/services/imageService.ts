import axiosInstance from './axiosInstance';
import { request } from '@/lib/apiRequest';

export interface UploadedImage {
    id: string;
    url: string;
}

export const imageUrl = (id: string): string =>
    `${process.env.NEXT_PUBLIC_API_URL}/content-images/${id}`;

// Widths offered for responsive srcset. The API serves the nearest webp variant
// >= the requested width (falling back to the largest), or the original if the
// browser doesn't accept webp.
const SRCSET_WIDTHS = [384, 640, 768, 1024, 1366, 1600];

export const imageSrcSet = (id: string): string =>
    SRCSET_WIDTHS.map(w => `${imageUrl(id)}?w=${w} ${w}w`).join(', ');

const ImageService = {
    upload(file: File): Promise<UploadedImage> {
        const form = new FormData();
        form.append('file', file);
        return request(() => axiosInstance.post<UploadedImage>('/content-images', form), 'Failed to upload image');
    },

    remove: (id: string) =>
        request(() => axiosInstance.delete(`/content-images/${id}`), 'Failed to delete image'),
};

export default ImageService;
