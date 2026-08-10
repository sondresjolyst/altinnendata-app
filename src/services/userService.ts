import axios from 'axios';
import { getSession } from 'next-auth/react';
import axiosInstance from './axiosInstance';
import { formatApiError } from '@/lib/errors';
import { request } from '@/lib/apiRequest';

export interface LoginData {
    email: string;
    password: string;
}

export interface UserProfile {
    id: string;
    userName: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
}

export interface RegisterData {
    userName: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
}

export interface TokenResponse {
    token: string;
    refreshToken: string;
}

const apiClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

const UserService = {
    async login(data: LoginData): Promise<TokenResponse> {
        try {
            const response = await apiClient.post<TokenResponse>('/auth/login', data);
            return response.data;
        } catch (error: unknown) {
            throw new Error(formatApiError(error, 'Failed to login'));
        }
    },

    async register(data: RegisterData): Promise<void> {
        try {
            await apiClient.post('/auth/register', data);
        } catch (error: unknown) {
            throw new Error(formatApiError(error, 'Failed to register'));
        }
    },

    async refreshToken(data: TokenResponse): Promise<TokenResponse> {
        const response = await apiClient.post<TokenResponse>('/auth/refresh-token', data);
        return response.data;
    },

    async requestPasswordReset(data: { email: string }): Promise<{ message: string }> {
        try {
            const response = await apiClient.post<{ message: string }>('/auth/request-password-reset', data);
            return response.data;
        } catch (error: unknown) {
            throw new Error(formatApiError(error, 'Failed to request password reset code'));
        }
    },

    async resetPassword(data: { email: string; code: string; newPassword: string }): Promise<{ message: string }> {
        try {
            const response = await apiClient.post<{ message: string }>('/auth/reset-password', data);
            return response.data;
        } catch (error: unknown) {
            throw new Error(formatApiError(error, 'Failed to reset password'));
        }
    },

    async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
        const id = await currentUserId();
        return request(() => axiosInstance.put<{ message: string }>(`/users/${id}/password`, data), 'Failed to change password');
    },

    async getProfile(): Promise<UserProfile> {
        const id = await currentUserId();
        return request(() => axiosInstance.get<UserProfile>(`/users/${id}/profile`), 'Failed to load profile');
    },

    async updateProfile(data: { firstName: string; lastName: string }): Promise<UserProfile> {
        const id = await currentUserId();
        return request(() => axiosInstance.put<UserProfile>(`/users/${id}/profile`, data), 'Failed to update profile');
    },

    async exportData(): Promise<unknown> {
        const id = await currentUserId();
        return request(() => axiosInstance.get(`/users/${id}/export`), 'Failed to export data');
    },

    async deleteAccount(): Promise<void> {
        const id = await currentUserId();
        await request(() => axiosInstance.delete(`/users/${id}/account`), 'Failed to delete account');
    },
};

async function currentUserId(): Promise<string> {
    const session = await getSession();
    const id = session?.user?.id;
    if (!id) throw new Error('Not authenticated');
    return id;
}

export { apiClient, axiosInstance };
export default UserService;
