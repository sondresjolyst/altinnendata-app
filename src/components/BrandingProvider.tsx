"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import BrandingService, { Branding, toDataUrl } from '@/services/brandingService';

interface BrandingContextValue {
    branding: Branding;
    logoUrl: string | null;
    refresh: () => void;
}

const BrandingContext = createContext<BrandingContextValue>({ branding: {}, logoUrl: null, refresh: () => {} });

export const useBranding = () => useContext(BrandingContext);

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default function BrandingProvider({ children, initial }: { children: React.ReactNode; initial?: Branding }) {
    const [branding, setBranding] = useState<Branding>(initial ?? {});

    const refresh = useCallback(() => {
        BrandingService.get().then(setBranding).catch(() => {});
    }, []);

    useEffect(() => {
        if (!initial) refresh();
        const id = setInterval(refresh, REFRESH_INTERVAL_MS);
        return () => clearInterval(id);
    }, [refresh, initial]);

    const logoUrl = toDataUrl(branding.logoData, branding.logoContentType);

    return (
        <BrandingContext.Provider value={{ branding, logoUrl, refresh }}>
            {children}
        </BrandingContext.Provider>
    );
}
