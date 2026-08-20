export interface PublicResponse<T> {
    data: T;
    /** From the `Last-Modified` header, when the endpoint reports one. */
    lastModified: Date | null;
}

/** The API could not be reached, or answered in a way that carries no content. */
export class PublicApiError extends Error {
    constructor(readonly path: string, readonly status: number | null, options?: { cause?: unknown }) {
        super(`GET ${path} failed${status == null ? '' : ` with ${status}`}`, options);
        this.name = 'PublicApiError';
    }
}

/** Reads `Last-Modified`, ignoring a header that is missing or not a date. */
function lastModifiedOf(response: Response): Date | null {
    const header = response.headers.get('last-modified');
    if (!header) return null;
    const date = new Date(header);
    return Number.isNaN(date.getTime()) ? null : date;
}

async function get<T>(path: string, opts?: { tags?: string[] }): Promise<PublicResponse<T> | null> {
    let response: Response;
    try {
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
            next: { revalidate: 60, tags: opts?.tags },
        });
    } catch (cause) {
        throw new PublicApiError(path, null, { cause });
    }

    // The one status that means "there is nothing here", as opposed to "ask again later".
    if (response.status === 404) return null;
    if (!response.ok) throw new PublicApiError(path, response.status);

    try {
        return { data: await response.json() as T, lastModified: lastModifiedOf(response) };
    } catch (cause) {
        throw new PublicApiError(path, response.status, { cause });
    }
}

/**
 * GET from the public API, keeping the response metadata. Some resources have no field to
 * carry their edit time — the home page sections are a bare JSON array — and report it in
 * `Last-Modified` instead.
 */
export const publicGetWithMeta = get;

/**
 * GET from the public API. Null means the resource does not exist; an unreachable or failing
 * API throws.
 *
 * The distinction is what keeps an outage from being cached as content: a page that renders
 * "no computers yet" from a failed request looks like a valid render to Next, which stores it
 * and serves it until the next revalidation. Throwing instead leaves the last good page in
 * place.
 */
export async function publicGet<T>(path: string, opts?: { tags?: string[] }): Promise<T | null> {
    return (await get<T>(path, opts))?.data ?? null;
}

/**
 * GET from the public API for data a page can do without — branding, image dimensions, a
 * prefilled form field. Yields null on any failure, so the page still renders.
 */
export async function publicGetOptional<T>(path: string, opts?: { tags?: string[] }): Promise<T | null> {
    try {
        return await publicGet<T>(path, opts);
    } catch {
        return null;
    }
}
