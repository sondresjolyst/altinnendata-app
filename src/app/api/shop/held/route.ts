import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { publicGetOptional } from '@/lib/publicApi';
import { REVALIDATE_TARGETS, TARGET_PATHS } from '@/lib/cacheTags';
import type { BuildDetail } from '@/services/buildService';

const MAX_SLUG_LENGTH = 160;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const THROTTLE_MS = 10_000;
const MAX_WAITERS = 3;
const QUEUE_TIMEOUT_MS = 3_000;
const READ_TIMEOUT_MS = 2_000;

// When the pages were last purged. The purge covers every build page, so one window serves the whole process.
let lastPurge = Number.NEGATIVE_INFINITY;
// The check that is reading the build now. Requests take turns, so one API read runs at a time.
let inFlight: Promise<boolean> | null = null;
// How many requests are waiting for their turn. The endpoint is open, so the queue is short.
let waiting = 0;

/** Resolves with `value` after `ms`, or never settles late work: the timer is cleared by `cancel`. */
function after<T>(ms: number, value: T): { promise: Promise<T>; cancel: () => void } {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const promise = new Promise<T>(resolve => {
        timer = setTimeout(() => resolve(value), ms);
    });
    return { promise, cancel: () => clearTimeout(timer) };
}

/** Forgets the throttle and the queue. For tests. */
export function resetHeldThrottle() {
    lastPurge = Number.NEGATIVE_INFINITY;
    inFlight = null;
    waiting = 0;
}

/** Reads the build and purges the build pages when it is Reserved right now. Any failure or other answer purges nothing. */
async function purgeIfReserved(slug: string): Promise<boolean> {
    // A read that takes longer than the limit counts as not Reserved.
    const read = publicGetOptional<Pick<BuildDetail, 'availability'>>(`/builds/${slug}?locale=no`, { revalidate: 0 }).catch(() => null);
    const limit = after<null>(READ_TIMEOUT_MS, null);
    const build = await Promise.race([read, limit.promise]).finally(limit.cancel);
    if (build?.availability !== 'Reserved') return false;

    lastPurge = Date.now();
    for (const path of TARGET_PATHS[REVALIDATE_TARGETS.builds]) {
        if (path.includes('[')) revalidatePath(path, 'page');
        else revalidatePath(path);
    }
    revalidateTag(REVALIDATE_TARGETS.builds, { expire: 0 });
    return true;
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

    // Wait for the check in flight, in a short queue and for a short time. The loop matters: another waiter may take the turn first.
    if (inFlight) {
        if (waiting >= MAX_WAITERS) return NextResponse.json({ revalidated: false });
        waiting += 1;
        const patience = after(QUEUE_TIMEOUT_MS, 'gave up' as const);
        try {
            while (inFlight) {
                const turn = await Promise.race([inFlight.catch(() => false), patience.promise]);
                if (turn === 'gave up') return NextResponse.json({ revalidated: false });
            }
        } finally {
            patience.cancel();
            waiting -= 1;
        }
    }
    if (Date.now() - lastPurge < THROTTLE_MS) return NextResponse.json({ revalidated: false });

    // Nothing awaits between the loop and this line, so this request is the only one checking.
    const check = purgeIfReserved(slug);
    inFlight = check;
    try {
        return NextResponse.json({ revalidated: await check });
    } finally {
        if (inFlight === check) inFlight = null;
    }
}
