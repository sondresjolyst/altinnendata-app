export async function publicGet<T>(path: string, opts?: { tags?: string[] }): Promise<T | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
            next: { revalidate: 60, tags: opts?.tags },
        });
        if (!res.ok) return null;
        return await res.json() as T;
    } catch {
        return null;
    }
}
