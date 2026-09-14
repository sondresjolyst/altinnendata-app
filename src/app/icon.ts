import { readFile } from 'fs/promises';
import { join } from 'path';
import { publicGet } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import type { Branding } from '@/services/brandingService';

// A prerendered copy would carry the build-time icon into every new pod.
export const dynamic = 'force-dynamic';

/** The favicon set in admin settings, or the bundled one when none is set. */
export default async function Icon(): Promise<Response> {
    let branding: Branding | null;
    try {
        branding = await publicGet<Branding>('/branding', { tags: [REVALIDATE_TARGETS.branding] });
    } catch {
        // Not the bundled icon: the browser would cache it in place of the one set in settings.
        return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }

    if (branding?.iconData && branding.iconContentType) {
        return new Response(new Uint8Array(Buffer.from(branding.iconData, 'base64')), {
            headers: { 'Content-Type': branding.iconContentType },
        });
    }

    return new Response(new Uint8Array(await readFile(join(process.cwd(), 'public', 'icon.png'))), {
        headers: { 'Content-Type': 'image/png' },
    });
}
