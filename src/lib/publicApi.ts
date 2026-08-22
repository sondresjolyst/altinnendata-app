export interface PublicResponse<T> {
    data: T;
    /** From the `Last-Modified` header, when the endpoint reports one. */
    lastModified: Date | null;
}

/** The API could not be reached, or answered with no usable content. */
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

    if (response.status === 404) return null;
    if (!response.ok) throw new PublicApiError(path, response.status);

    try {
        return { data: await response.json() as T, lastModified: lastModifiedOf(response) };
    } catch (cause) {
        throw new PublicApiError(path, response.status, { cause });
    }
}

/** GET from the public API, keeping the response metadata. */
export const publicGetWithMeta = get;

/**
 * GET from the public API. Null means the resource does not exist; an unreachable or failing
 * API throws, so an empty page is never cached in place of a working one.
 */
export async function publicGet<T>(path: string, opts?: { tags?: string[] }): Promise<T | null> {
    return (await get<T>(path, opts))?.data ?? null;
}

/** GET for data a page can do without. Null on any failure, so the page still renders. */
export async function publicGetOptional<T>(path: string, opts?: { tags?: string[] }): Promise<T | null> {
    try {
        return await publicGet<T>(path, opts);
    } catch {
        return null;
    }
}
