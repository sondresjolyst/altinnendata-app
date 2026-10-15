import { requireEnv } from '@sjolystinnovation/app-kit';
import { createPublicClient } from '@sjolystinnovation/app-kit/api';

const publicClient = createPublicClient(requireEnv('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL));

export default publicClient;
