/**
 * The value of the cookie `name` in `cookies`, which is `document.cookie` by default. Gives undefined when the cookie
 * is missing or empty, when its value cannot be decoded, and on the server.
 */
export function readCookie(name: string, cookies?: string): string | undefined {
    const source = cookies ?? (typeof document === 'undefined' ? '' : document.cookie);
    for (const part of source.split(';')) {
        const at = part.indexOf('=');
        if (at < 0 || part.slice(0, at).trim() !== name) continue;
        const raw = part.slice(at + 1).trim();
        if (raw === '') return undefined;
        try {
            return decodeURIComponent(raw);
        } catch {
            return undefined;
        }
    }
    return undefined;
}
