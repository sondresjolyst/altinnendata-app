import { defineAppConfig } from '@sjolystinnovation/app-kit/next-config';

export default defineAppConfig({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    dev: process.env.NODE_ENV !== 'production',
    contentImages: true,
});
