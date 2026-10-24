import { isValidPixelId } from '@sjolystinnovation/app-kit/consent';
import { publicGetOptional } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import type { MarketingConfig } from '@/services/marketingService';

/** The Meta Pixel ID the admin set, or null when the pixel is off or the API cannot be reached. */
export async function getMetaPixelId(): Promise<string | null> {
    const config = await publicGetOptional<MarketingConfig>('/marketing/config', { tags: [REVALIDATE_TARGETS.marketing] });
    const id = config?.metaPixelId;
    return isValidPixelId(id) ? id : null;
}
