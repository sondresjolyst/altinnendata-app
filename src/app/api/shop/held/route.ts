import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { publicGetLiveOptional } from '@/lib/publicApi';
import { REVALIDATE_TARGETS, TARGET_PATHS } from '@/lib/cacheTags';
import type { BuildDetail } from '@/services/buildService';

const MAX_SLUG_LENGTH = 160;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const THROTTLE_MS = 10_000;

// When the pages were last purged. The purge covers every build page, so one window serves the whole process.
let lastPurge = Number.NEGATIVE_INFINITY;

/** Forgets the throttle. For tests. */
export function resetHeldThrottle() {
    lastPurge = Number.NEGATIVE_INFINITY;
}

/**
 * Called by the buyer's browser once checkout has held a build. It reads the build live and purges the
 * build pages only when the build is Reserved right now, so no caller can force a rebuild of a build that
 * is on sale, sold or missing. It needs no session, because the buyer may be anonymous.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
    if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
        return NextResponse.json({ message: 'Expected JSON' }, { status: 415 });
    }

    const body: unknown = await req.json().catch(() => null);
    const slug = (body as { slug?: unknown } | null)?.slug;
    if (typeof slug !== 'string' || slug.length > MAX_SLUG_LENGTH || !SLUG.test(slug)) {
        return NextResponse.json({ message: 'Expected a build slug' }, { status: 400 });
    }

    if (Date.now() - lastPurge < THROTTLE_MS) return NextResponse.json({ revalidated: false });

    // Any failure to read the build, or any answer but Reserved, purges nothing.
    const build = await publicGetLiveOptional<Pick<BuildDetail, 'availability'>>(`/builds/${slug}?locale=no`).catch(() => null);
    if (build?.availability !== 'Reserved') return NextResponse.json({ revalidated: false });

    lastPurge = Date.now();
    for (const path of TARGET_PATHS[REVALIDATE_TARGETS.builds]) {
        if (path.includes('[')) revalidatePath(path, 'page');
        else revalidatePath(path);
    }
    revalidateTag(REVALIDATE_TARGETS.builds, { expire: 0 });
    return NextResponse.json({ revalidated: true });
}
