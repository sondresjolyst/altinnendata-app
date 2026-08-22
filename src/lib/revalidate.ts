import { RevalidateTarget } from '@/lib/cacheTags';

// Best-effort: drops the ISR cache so an admin edit shows at once. On failure the
// page's revalidate window is the fallback.
export async function revalidateTarget(target: RevalidateTarget): Promise<void> {
    try {
        await fetch('/api/revalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target }),
        });
    } catch {
        // ignore
    }
}
