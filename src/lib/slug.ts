/**
 * A route slug as one encoded API path segment. Next hands generateMetadata and the page the same
 * slug in different forms, one still percent-encoded, so it is decoded once before it is encoded.
 */
export function slugSegment(slug: string): string {
    let decoded = slug;
    try {
        decoded = decodeURIComponent(slug);
    } catch {
        // Not valid percent-encoding, so it is taken as it is.
    }
    return encodeURIComponent(decoded);
}
