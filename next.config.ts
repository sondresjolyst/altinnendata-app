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

const nextConfig: NextConfig = {
    output: 'standalone',
    images: {
        qualities: [75, 100],
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

        const imgSrc = ['self', apiOrigin, 'data:', 'blob:']
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
