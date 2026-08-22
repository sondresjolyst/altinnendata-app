import type { Metadata } from 'next';
import { NOINDEX } from '@/lib/seo/metadata';

// Removing this returns these pages to the index: robots.txt alone will not deindex a page.
export const metadata: Metadata = { robots: NOINDEX };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
