import { imageUrl, imageSrcSet } from '@/services/imageService';

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
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding={priority ? 'sync' : 'async'}
            aria-hidden={ariaHidden}
        />
    );
}
