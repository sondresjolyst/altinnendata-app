import { site } from '@/lib/seo/site';
import { PRIVATE_PATHS, PRIVATE_ROOT_PATHS } from '@/lib/seo/routes';

// Read per request, so a deployment can be pointed at either environment.
export const dynamic = 'force-dynamic';

export default function robots() {
    return site.robots({ privatePaths: PRIVATE_PATHS, privateRootPaths: PRIVATE_ROOT_PATHS });
}
