import type { NextConfig } from "next";

function getApiOrigin(): string {
    const url = process.env.NEXT_PUBLIC_API_URL;
    if (!url) return '';
    try {
        const { origin } = new URL(url);
        return origin;
    } catch {
        return '';
    }
}

/** The API base, including its path prefix, with no trailing slash. */
function getApiBaseUrl(): string {
    const url = process.env.NEXT_PUBLIC_API_URL;
    if (!url) return '';
    try {
        return new URL(url).toString().replace(/\/$/, '');
    } catch {
        return '';
    }
}

const nextConfig: NextConfig = {
    output: 'standalone',
    // How long a cache may go on serving a page after it goes stale. Next's default is a year,
    // long enough for a browser to hand back an old page and fetch the current one behind it.
    // Five minutes, matching the client router cache's stale time.
    expireTime: 300,
    images: {
        qualities: [75, 100],
    },
    /**
     * Content images, proxied so the browser never contacts the API host. A rewrite, not a route
     * handler: it passes the query string and the Accept header through, which webp needs.
     */
    async rewrites() {
        const apiBaseUrl = getApiBaseUrl();
        if (!apiBaseUrl) return [];

        return [
            { source: '/content-images/:path*', destination: `${apiBaseUrl}/content-images/:path*` },
        ];
    },

    async headers() {
        const apiOrigin = getApiOrigin();
        const connectSrc = ['self', apiOrigin]
            .filter(Boolean)
            .map(s => s === 'self' ? "'self'" : s)
            .join(' ');

        const frameSrc = ['self', apiOrigin]
            .filter(Boolean)
            .map(s => s === 'self' ? "'self'" : s)
            .join(' ');

        const isDev = process.env.NODE_ENV !== 'production';
        const scriptSrc = isDev
            ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
            : "script-src 'self' 'unsafe-inline'";

        const objectSrc = ['self', apiOrigin, 'blob:']
            .filter(Boolean)
            .map(s => s === 'self' ? "'self'" : s)
            .join(' ');

        const imgSrc = ['self', 'data:', 'blob:']
            .filter(Boolean)
            .map(s => s === 'self' ? "'self'" : s)
            .join(' ');

        const csp = [
            "default-src 'self'",
            scriptSrc,
            "style-src 'self' 'unsafe-inline'",
            `img-src ${imgSrc}`,
            `connect-src ${connectSrc}`,
            `frame-src ${frameSrc}`,
            `object-src ${objectSrc}`,
            "font-src 'self'",
            "frame-ancestors 'none'",
        ].join('; ');

        const headers = [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'X-DNS-Prefetch-Control', value: 'on' },
            { key: 'Content-Security-Policy', value: csp },
        ];

        const proxyHeaders = [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ];

        return [
            { source: '/api/report/:path*', headers: proxyHeaders },
            { source: '/((?!api/report/).*)', headers },
        ];
    },
};

export default nextConfig;
