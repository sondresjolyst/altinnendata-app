import { MetadataRoute } from 'next';
import { COMPANY } from '@/lib/company';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/profile', '/login', '/register', '/reset-password', '/api/'],
        },
        sitemap: `${COMPANY.url}/sitemap.xml`,
        host: COMPANY.url,
    };
}
