"use client";

import { Toaster } from "sonner";
import { AppSessionProvider } from "@sjolystinnovation/app-kit/session/react";
import BrandingProvider from "@/components/BrandingProvider";
import { Branding } from "@/services/brandingService";


export default function Providers({ children, initialBranding }: { children: React.ReactNode; initialBranding?: Branding }) {
    return (
        <AppSessionProvider>
            <BrandingProvider initial={initialBranding}>
                {children}
                <Toaster richColors position="top-center" />
            </BrandingProvider>
        </AppSessionProvider>
    );
}
