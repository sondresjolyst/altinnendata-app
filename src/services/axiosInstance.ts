import axios from 'axios';
import { getSession } from 'next-auth/react';
import { isTerminalSessionError, openSessionPrompt } from '@sjolystinnovation/app-kit/session';

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
});

axiosInstance.interceptors.request.use(
    async (config) => {
        const session = await getSession();
        if (session?.accessToken) {
            config.headers.Authorization = `Bearer ${session.accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const session = await getSession();
            // Ask for a new sign-in in place rather than signing out here: a hard redirect
            // would unmount whatever form the user is filling in and throw their work away.
            // A missing session counts too, because the cookie is gone (signed out in another
            // tab, or cleared by next-auth after a callback error) and no error field survives.
            if (!session || isTerminalSessionError(session.error)) {
                openSessionPrompt();
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
