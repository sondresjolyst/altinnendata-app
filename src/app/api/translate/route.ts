import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { ADMIN_ROLE } from '@/lib/roles';
import { LOCALES } from '@/i18n/config';
import { translateFields, TranslationUnavailableError } from '@/lib/translation';

const MAX_FIELD_LENGTH = 20000;

const field = z.string().max(MAX_FIELD_LENGTH).nullable();

const bodySchema = z.object({
    from: z.enum(LOCALES),
    to: z.enum(LOCALES),
    fields: z.object({ title: field, summary: field, description: field }),
});

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const roles = (token?.user as { roles?: string[] } | undefined)?.roles ?? [];
    if (!roles.includes(ADMIN_ROLE)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ message: 'Unknown request' }, { status: 400 });
    }

    const { from, to, fields } = parsed.data;
    if (from === to) return NextResponse.json(fields);

    try {
        return NextResponse.json(await translateFields(fields, from, to));
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Translation failed' },
            { status: error instanceof TranslationUnavailableError ? 503 : 502 },
        );
    }
}
