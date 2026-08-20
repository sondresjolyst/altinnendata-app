export interface PublicResponse<T> {
    data: T;
    /** From the `Last-Modified` header, when the endpoint reports one. */
    lastModified: Date | null;
}

/** Reads `Last-Modified`, ignoring a header that is missing or not a date. */
function lastModifiedOf(response: Response): Date | null {
    const header = response.headers.get('last-modified');
    if (!header) return null;
    const date = new Date(header);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * GET from the public API, keeping the response metadata. Some resources have no field to
 * carry their edit time — the home page sections are a bare JSON array — and report it in
 * `Last-Modified` instead.
 */
export async function publicGetWithMeta<T>(path: string, opts?: { tags?: string[] }): Promise<PublicResponse<T> | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
            next: { revalidate: 60, tags: opts?.tags },
        });
        if (!res.ok) return null;
        return { data: await res.json() as T, lastModified: lastModifiedOf(res) };
    } catch {
        return null;
    }
}

export async function publicGet<T>(path: string, opts?: { tags?: string[] }): Promise<T | null> {
    return (await publicGetWithMeta<T>(path, opts))?.data ?? null;
}
