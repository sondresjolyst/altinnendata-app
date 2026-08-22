import { describe, it, expect } from 'vitest';
import { metadata as authMetadata } from '@/app/[locale]/(auth)/layout';
import { metadata as protectedMetadata } from '@/app/[locale]/(protected)/layout';
import { PRIVATE_PATHS } from '@/lib/seo/routes';

describe('private route groups', () => {
    it('keep sign-in and password reset out of the index', () => {
        expect(authMetadata.robots).toEqual({ index: false, follow: false });
    });

    it('keep the admin console out of the index', () => {
        expect(protectedMetadata.robots).toEqual({ index: false, follow: false });
    });

    it('cover every path robots.txt disallows', () => {
        // /profile has no page of its own yet; the rest are served by these two groups.
        expect([...PRIVATE_PATHS]).toEqual(['/admin', '/login', '/reset-password', '/profile']);
    });
});
