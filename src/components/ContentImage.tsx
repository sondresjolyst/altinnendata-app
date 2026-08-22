import { imagePath, imageSrcSet } from '@/services/imageService';

export interface ContentImageProps {
    /** Uploaded image id. Null falls back to `fallbackSrc`, which is served as-is. */
    imageId: string | null;
    /** Empty string for images that carry no meaning of their own, e.g. a decorative backdrop. */
    alt: string;
    /**
     * Widths the image is displayed at, as a CSS `sizes` list. Required — a browser given none
     * assumes the full viewport width and fetches a larger rendition than it needs.
     */
    sizes: string;
    /** Static path used when there is no uploaded image. */
    fallbackSrc?: string;
    className?: string;
    /**
     * Intrinsic dimensions, so the browser can reserve the image's space before it loads.
     * Only worth passing where the layout does not already fix the aspect ratio.
     */
    width?: number;
    height?: number;
    /**
     * Set on the one image visible without scrolling, usually the hero: loaded eagerly and at
     * high priority. Everything else waits until it nears the viewport.
     */
    priority?: boolean;
    'aria-hidden'?: boolean;
}

/**
 * An image from the content API, served responsively: every uploaded image has webp renditions
 * behind it, and this picks between them from the `sizes` the call site declares.
 */
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
    const src = imageId != null ? imagePath(imageId) : fallbackSrc;
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
