import { requestRevalidate } from '@sjolystinnovation/app-kit/api';
import type { RevalidateTarget } from '@/lib/cacheTags';

/** Purges the pages behind `target` after an admin edit. Best effort, see requestRevalidate. */
export const revalidateTarget = (target: RevalidateTarget): Promise<void> => requestRevalidate(target);
