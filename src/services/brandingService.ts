import { createBrandingService } from '@sjolystinnovation/app-kit/api';
import type { Branding } from '@sjolystinnovation/app-kit/branding';
import axiosInstance from './axiosInstance';
import publicClient from './publicClient';
import { revalidateTarget } from '@/lib/revalidate';
import { REVALIDATE_TARGETS } from '@/lib/cacheTags';

export type { Branding };

const BrandingService = createBrandingService(axiosInstance, publicClient, {
    onSaved: () => revalidateTarget(REVALIDATE_TARGETS.branding),
});

export default BrandingService;
