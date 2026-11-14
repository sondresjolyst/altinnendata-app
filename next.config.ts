import { defineAppConfig } from '@sjolystinnovation/app-kit/next-config';

/** The TikTok Pixel's hosts, from TikTok's CSP guide. */
const TIKTOK = ['https://analytics.tiktok.com', 'https://analytics-ipv6.tiktokw.us', 'https://ads.tiktok.com'];

export default defineAppConfig({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    dev: process.env.NODE_ENV !== 'production',
    contentImages: true,
    // The Meta Pixel and the TikTok Pixel, loaded only after the visitor accepts marketing cookies.
    scriptSrc: ['https://connect.facebook.net', ...TIKTOK],
    imgSrc: ['https://www.facebook.com', ...TIKTOK],
    connectSrc: ['https://www.facebook.com', 'https://connect.facebook.net', ...TIKTOK],
    // TikTok's CSP guide asks for these schemes in frame-src. They replace the default 'none'.
    frameSrc: ['bytedance:', 'sslocal:'],
});
