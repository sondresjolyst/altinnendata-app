import type { Metadata } from 'next';
import { NOINDEX } from '@/lib/seo/metadata';
import ProtectedGate from './ProtectedGate';

// A server layout, so the group can export metadata; ProtectedGate holds the session check.
// Without the metadata here, admin pages inherit the site-wide `index: true`.
export const metadata: Metadata = { robots: NOINDEX };

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    return <ProtectedGate>{children}</ProtectedGate>;
}
