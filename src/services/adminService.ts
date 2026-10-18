import axiosInstance from './axiosInstance';
import { createAdminUsersService, createEmailStatsService, request } from '@sjolystinnovation/app-kit/api';

export interface AdminStats {
    totalUsers: number;
    publishedBuilds: number;
    draftBuilds: number;
    /** Optional: an API older than the sales stats sends none of these. */
    soldBuilds?: number;
    reservedBuilds?: number;
    availableBuilds?: number;
    revenueNok?: number;
    soldWithoutPrice?: number;
    soldWithoutDate?: number;
    catalogParts: number;
    contentImages: number;
    storageUsedBytes: number;
    diskTotalBytes: number;
    diskFreeBytes: number;
}

export interface DailyStat {
    date: string;
    totalUsers: number;
    publishedBuilds: number;
    draftBuilds: number;
    soldBuilds?: number;
    catalogParts: number;
    contentImages: number;
}

export type { AdminUser } from '@sjolystinnovation/app-kit/api';

const AdminService = {
    getStats: () =>
        request(() => axiosInstance.get<AdminStats>('/admin/stats'), 'Failed to load stats'),

    getStatsHistory: () =>
        request(() => axiosInstance.get<DailyStat[]>('/admin/stats/history'), 'Failed to load stats history'),

    ...createAdminUsersService(axiosInstance),
};

export const EmailStatsService = createEmailStatsService(axiosInstance);

export default AdminService;
