import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { publicGetLiveOptional } from '@/lib/publicApi';
import { REVALIDATE_TARGETS, TARGET_PATHS } from '@/lib/cacheTags';
import { slugSegment } from '@/lib/slug';
import type { BuildDetail } from '@/services/buildService';

const MAX_SLUG_LENGTH = 200;
const THROTTLE_MS = 10_000;

// The last purge per slug. A held build can be purged again only after the window, so repeated calls cost nothing.
const purged = new Map<string, number>();

/** Forgets the throttle. For tests. */
export function resetHeldThrottle() {
    purged.clear();
}

/**
 * Called by the buyer's browser once checkout has held a build. It reads the build live and purges the
 * build pages only when the build is no longer Available, so no caller can force a rebuild of a build that
 * is still on sale. It needs no session, because the buyer may be anonymous.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
    if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
        return NextResponse.json({ message: 'Expected JSON' }, { status: 415 });
    }

    const body: unknown = await req.json().catch(() => null);
    const slug = (body as { slug?: unknown } | null)?.slug;
    if (typeof slug !== 'string' || slug === '' || slug.length > MAX_SLUG_LENGTH) {
        return NextResponse.json({ message: 'Expected a build slug' }, { status: 400 });
    }

    const build = await publicGetLiveOptional<Pick<BuildDetail, 'availability'>>(`/builds/${slugSegment(slug)}?locale=no`).catch(() => null);
    if (!build || build.availability === 'Available') return NextResponse.json({ revalidated: false });

    const last = purged.get(slug);
    if (last !== undefined && Date.now() - last < THROTTLE_MS) return NextResponse.json({ revalidated: false });
    purged.set(slug, Date.now());

    for (const path of TARGET_PATHS[REVALIDATE_TARGETS.builds]) {
        if (path.includes('[')) revalidatePath(path, 'page');
        else revalidatePath(path);
    }
    revalidateTag(REVALIDATE_TARGETS.builds, { expire: 0 });
    return NextResponse.json({ revalidated: true });
}
