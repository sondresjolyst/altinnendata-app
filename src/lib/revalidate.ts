import { RevalidateTarget } from '@/lib/cacheTags';

// Best-effort: asks the server to drop the ISR cache for the affected pages so
// admin edits show immediately. If it fails, the page's revalidate window is
// the fallback.
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
