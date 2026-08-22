import axiosInstance from './axiosInstance';
import { request } from '@/lib/apiRequest';
import { publicGetOptional } from '@/lib/publicApi';

export interface UploadedImage {
    id: string;
    url: string;
}

export const imageUrl = (id: string): string =>
    `${process.env.NEXT_PUBLIC_API_URL}/content-images/${id}`;

// The API serves the nearest webp variant at or above the requested width, or the
// original when the browser does not accept webp.
const SRCSET_WIDTHS = [384, 640, 768, 1024, 1366, 1600];

export const imageSrcSet = (id: string): string =>
    SRCSET_WIDTHS.map(w => `${imageUrl(id)}?w=${w} ${w}w`).join(', ');

interface ImageDimensionsResponse {
    id: string;
    width: number;
    height: number;
}

/** Intrinsic dimensions by image id, for reserving an image's space before it loads. */
export type ImageDimensionsMap = Record<string, { width: number; height: number }>;

/** Dimensions for a set of images, in one request. An id the API cannot measure is absent. */
export async function fetchImageDimensions(ids: readonly (string | null)[], tags?: string[]): Promise<ImageDimensionsMap> {
    const wanted = [...new Set(ids.filter((id): id is string => id != null))];
    if (wanted.length === 0) return {};

    const measured = await publicGetOptional<ImageDimensionsResponse[]>(
        `/content-images/dimensions?ids=${wanted.map(encodeURIComponent).join(',')}`,
        { tags },
    );
    return Object.fromEntries((measured ?? []).map(({ id, width, height }) => [id, { width, height }]));
}

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
