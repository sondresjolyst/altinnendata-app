import axiosInstance from './axiosInstance';
import { request } from '@/lib/apiRequest';

export interface AdminStats {
    totalUsers: number;
    publishedBuilds: number;
    draftBuilds: number;
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
    catalogParts: number;
    contentImages: number;
}

export interface EmailStats {
    days: number;
    requests: number;
    delivered: number;
    hardBounces: number;
    softBounces: number;
    spamReports: number;
    blocked: number;
    invalid: number;
}

export interface AdminUser {
    id: string;
    userName: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    isDeleted: boolean;
    roles: string[];
}

const AdminService = {
    getStats: () =>
        request(() => axiosInstance.get<AdminStats>('/admin/stats'), 'Failed to load stats'),

    getStatsHistory: () =>
        request(() => axiosInstance.get<DailyStat[]>('/admin/stats/history'), 'Failed to load stats history'),

    getEmailStats: (days = 30) =>
        request(() => axiosInstance.get<EmailStats>('/admin/email-stats', { params: { days } }), 'Failed to load email stats'),

    getRoles: () =>
        request(() => axiosInstance.get<string[]>('/admin/roles'), 'Failed to load roles'),

    getUsers: (includeDeleted = false) =>
        request(() => axiosInstance.get<AdminUser[]>('/users', { params: { includeDeleted } }), 'Failed to load users'),

    addRole: (userId: string, role: string) =>
        request(() => axiosInstance.post(`/users/${userId}/roles`, { role }), 'Failed to assign role'),

    removeRole: (userId: string, role: string) =>
        request(() => axiosInstance.delete(`/users/${userId}/roles/${role}`), 'Failed to remove role'),

    deleteUser: (userId: string) =>
        request(() => axiosInstance.delete(`/users/${userId}/account`), 'Failed to delete user'),

    invite: (email: string, firstName: string, lastName: string, role: string) =>
        request(() => axiosInstance.post('/users/invite', { email, firstName, lastName, role }), 'Failed to send invitation'),
};

export default AdminService;
