import { request } from '@sjolystinnovation/app-kit/api';
import axiosInstance from './axiosInstance';
import { REVALIDATE_TARGETS, revalidateTarget } from '@/lib/cacheTags';

/** The admin's marketing settings. Each ID is null while that pixel is off. */
export interface MarketingSettings {
    metaPixelId: string | null;
    tikTokPixelId: string | null;
}

/** What the site needs to load its marketing tools. They load only after the visitor consents. */
export type MarketingConfig = MarketingSettings;

const MarketingService = {
    getSettings: () =>
        request(() => axiosInstance.get<MarketingSettings>('/admin/marketing/settings'), 'Failed to load the marketing settings'),

    /**
     * Replaces the whole setting, so both IDs are sent. An empty ID turns that pixel off. Every page reads them
     * through the layout, so the marketing tag is purged.
     */
    updateSettings: async (settings: { metaPixelId: string; tikTokPixelId: string }) => {
        const saved = await request(() => axiosInstance.put<MarketingSettings>('/admin/marketing/settings', settings), 'Failed to save the marketing settings');
        await revalidateTarget(REVALIDATE_TARGETS.marketing);
        return saved;
    },
};

export default MarketingService;
