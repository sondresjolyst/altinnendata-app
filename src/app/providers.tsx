"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import BrandingProvider from "@/components/BrandingProvider";
import { Branding } from "@/services/brandingService";

export default function Providers({ children, initialBranding }: { children: React.ReactNode; initialBranding?: Branding }) {
    return (
        <SessionProvider>
            <BrandingProvider initial={initialBranding}>
                {children}
                <Toaster richColors position="top-center" />
            </BrandingProvider>
        </SessionProvider>
    );
}
