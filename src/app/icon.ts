import { join } from 'path';
import { brandingIcon } from '@sjolystinnovation/app-kit/branding/server';
import { publicGet } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import type { Branding } from '@/services/brandingService';

// A prerendered copy would carry the build-time icon into every new pod.
export const dynamic = 'force-dynamic';

/** The favicon set in admin settings, or the bundled one when none is set. */
export default function Icon(): Promise<Response> {
    return brandingIcon({
        load: () => publicGet<Branding>('/branding', { tags: [REVALIDATE_TARGETS.branding] }),
        fallbackPath: join(process.cwd(), 'public', 'icon.png'),
        fallbackType: 'image/png',
    });
}
