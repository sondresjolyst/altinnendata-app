import { defineAppConfig } from '@sjolystinnovation/app-kit/next-config';

export default defineAppConfig({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    dev: process.env.NODE_ENV !== 'production',
    contentImages: true,
    // The Meta Pixel, loaded only after the visitor accepts marketing cookies.
    scriptSrc: ['https://connect.facebook.net'],
    imgSrc: ['https://www.facebook.com'],
    connectSrc: ['https://www.facebook.com', 'https://connect.facebook.net'],
});
