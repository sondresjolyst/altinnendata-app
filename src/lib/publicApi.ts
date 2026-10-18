import { requireEnv } from '@sjolystinnovation/app-kit';
import { createPublicApi } from '@sjolystinnovation/app-kit/server';

export { PublicApiError } from '@sjolystinnovation/app-kit/server';
export type { PublicResponse } from '@sjolystinnovation/app-kit/server';

export const { publicGet, publicGetOptional, publicGetWithMeta } = createPublicApi(
    requireEnv('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL),
    { nullOnFailureDuringBuild: true },
);

// Reads that must never come from the data cache, such as the checkout page deciding from the live build.
export const { publicGet: publicGetLive, publicGetOptional: publicGetLiveOptional } = createPublicApi(
    requireEnv('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL),
    { nullOnFailureDuringBuild: true, revalidate: 0 },
);
