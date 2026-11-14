import { request } from '@sjolystinnovation/app-kit/api';
import axiosInstance from './axiosInstance';
import { REVALIDATE_TARGETS, revalidateTarget } from '@/lib/cacheTags';

/** What the site needs to load its marketing tools. They load only after the visitor consents. Each ID is null while that pixel is off. */
export interface MarketingConfig {
    metaPixelId: string | null;
    tikTokPixelId: string | null;
}

/** The admin's marketing settings. The API never sends the server tokens back, only whether each one is stored. */
export interface MarketingSettings extends MarketingConfig {
    metaCapiTokenSet: boolean;
    tikTokEventsTokenSet: boolean;
}

/**
 * A save of the marketing settings. A token left out keeps the stored one, and an empty token removes it.
 */
export interface MarketingSettingsUpdate {
    metaPixelId: string;
    tikTokPixelId: string;
    metaCapiToken?: string;
    tikTokEventsToken?: string;
}

const MarketingService = {
    getSettings: () =>
        request(() => axiosInstance.get<MarketingSettings>('/admin/marketing/settings'), 'Failed to load the marketing settings'),

    /**
     * Replaces both IDs, so both are sent. An empty ID turns that pixel off. Every page reads them through the
     * layout, so the marketing tag is purged.
     */
    updateSettings: async (settings: MarketingSettingsUpdate) => {
        const saved = await request(() => axiosInstance.put<MarketingSettings>('/admin/marketing/settings', settings), 'Failed to save the marketing settings');
        await revalidateTarget(REVALIDATE_TARGETS.marketing);
        return saved;
    },
};

export default MarketingService;
