import { requireEnv } from '@sjolystinnovation/app-kit';
import { createPublicApi } from '@sjolystinnovation/app-kit/server';

export { PublicApiError } from '@sjolystinnovation/app-kit/server';
export type { PublicResponse } from '@sjolystinnovation/app-kit/server';

// A read that must not come from the data cache, such as the checkout page, passes { revalidate: 0 }.
export const { publicGet, publicGetOptional, publicGetWithMeta } = createPublicApi(
    requireEnv('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL),
    { nullOnFailureDuringBuild: true },
);

