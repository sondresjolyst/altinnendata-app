import { requireEnv } from '@sjolystinnovation/app-kit';
import { createApiClient } from '@sjolystinnovation/app-kit/api';

const axiosInstance = createApiClient(requireEnv('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL));

export default axiosInstance;
