import { requireEnv } from '@sjolystinnovation/app-kit';
import { createAuthOptions } from '@sjolystinnovation/app-kit/auth';
import { sessionConfig } from '@/lib/session';

export const authOptions = createAuthOptions(sessionConfig, {
    apiUrl: requireEnv('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL),
    env: process.env,
});
