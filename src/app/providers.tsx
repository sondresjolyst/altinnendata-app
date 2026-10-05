"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import BrandingProvider from "@/components/BrandingProvider";
import { Branding } from "@/services/brandingService";

// Re-read the session periodically. The jwt callback renews the access token ahead of expiry,
// so an open tab stays usable instead of finding a dead one on the next save, and the poll
// updates what useSession reports here, which a bare getSession() call does not. next-auth
// polls only once a session exists, so signed-out readers cost nothing.
const SESSION_POLL_SECONDS = 4 * 60;

export default function Providers({ children, initialBranding }: { children: React.ReactNode; initialBranding?: Branding }) {
    return (
        <SessionProvider refetchInterval={SESSION_POLL_SECONDS}>
            <BrandingProvider initial={initialBranding}>
                {children}
                <Toaster richColors position="top-center" />
            </BrandingProvider>
        </SessionProvider>
    );
}
