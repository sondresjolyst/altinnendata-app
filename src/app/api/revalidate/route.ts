import { createRevalidateRoute } from '@sjolystinnovation/app-kit/server';
import { ADMIN_ROLE } from '@/lib/roles';
import { TARGET_PATHS } from '@/lib/cacheTags';

export const POST = createRevalidateRoute({ targets: TARGET_PATHS, role: ADMIN_ROLE });
