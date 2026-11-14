import { isValidPixelId, isValidTikTokPixelId } from '@sjolystinnovation/app-kit/consent';
import { publicGetOptional } from '@/lib/publicApi';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';
import type { MarketingConfig } from '@/services/marketingService';

/**
 * The pixel IDs the admin set. Each is null when that pixel is off or its ID is not valid, and both are null
 * when the API cannot be reached.
 */
export async function getMarketingConfig(): Promise<MarketingConfig> {
    const config = await publicGetOptional<Partial<MarketingConfig>>('/marketing/config', { tags: [REVALIDATE_TARGETS.marketing] });
    const metaPixelId = config?.metaPixelId;
    const tikTokPixelId = config?.tikTokPixelId;
    return {
        metaPixelId: isValidPixelId(metaPixelId) ? metaPixelId : null,
        tikTokPixelId: isValidTikTokPixelId(tikTokPixelId) ? tikTokPixelId : null,
    };
}
