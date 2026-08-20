import type { Metadata } from 'next';
import { NOINDEX } from '@/lib/seo/metadata';

// Sign-in and password reset are admin-only. Deleting this puts them back in the index —
// the robots.txt rule alone will not remove a page Google has already seen.
export const metadata: Metadata = { robots: NOINDEX };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
