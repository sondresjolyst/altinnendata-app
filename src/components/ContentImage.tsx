import { imageUrl, imageSrcSet } from '@/services/imageService';

export interface ContentImageProps {
    /** Uploaded image id. Null falls back to `fallbackSrc`, which is served as-is. */
    imageId: string | null;
    /** Empty string for images that carry no meaning of their own, e.g. a decorative backdrop. */
    alt: string;
    /** Widths the image is displayed at. Required: without it a browser assumes 100vw. */
    sizes: string;
    /** Static path used when there is no uploaded image. */
    fallbackSrc?: string;
    className?: string;
    /** Intrinsic dimensions, to reserve space. Only needed where the layout fixes no ratio. */
    width?: number;
    height?: number;
    /** Set on the one image visible without scrolling. Loaded eagerly, at high priority. */
    priority?: boolean;
    'aria-hidden'?: boolean;
}

/** An image from the content API, served responsively from the `sizes` a call site declares. */
export default function ContentImage({
    imageId,
    alt,
    sizes,
    fallbackSrc,
    className,
    width,
    height,
    priority = false,
    'aria-hidden': ariaHidden,
}: ContentImageProps) {
    const src = imageId != null ? imageUrl(imageId) : fallbackSrc;
    if (!src) return null;

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            srcSet={imageId != null ? imageSrcSet(imageId) : undefined}
            sizes={imageId != null ? sizes : undefined}
            alt={alt}
            className={className}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding={priority ? 'sync' : 'async'}
            aria-hidden={ariaHidden}
        />
    );
}
