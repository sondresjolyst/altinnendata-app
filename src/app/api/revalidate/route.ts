import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getToken } from 'next-auth/jwt';
import { ADMIN_ROLE } from '@/lib/roles';
import { RevalidateTarget, TARGET_PATHS } from '@/lib/cacheTags';

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const roles = (token?.user as { roles?: string[] } | undefined)?.roles ?? [];
    if (!roles.includes(ADMIN_ROLE)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { target } = await req.json().catch(() => ({ target: undefined }));
    const paths = TARGET_PATHS[target as RevalidateTarget];
    if (!paths) {
        return NextResponse.json({ message: 'Unknown target' }, { status: 400 });
    }

    for (const path of paths) {
        revalidatePath(path, path.includes('[') ? 'page' : undefined);
    }
    // Purge the data cache by tag too: catches fetches the path purge misses
    // when a different route rendered them. expire 0 = stale at once.
    revalidateTag(target, { expire: 0 });
    return NextResponse.json({ revalidated: true, target });
}
