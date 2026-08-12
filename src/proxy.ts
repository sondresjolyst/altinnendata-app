import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/config';

export default function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const first = pathname.split('/')[1];
    if (isLocale(first)) return NextResponse.next();

    const url = req.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
}

// Keep in sync with LOCALES in src/i18n/config.ts — Turbopack requires a static matcher.
export const config = {
    matcher: ['/((?!api|_next|content-images|no|en|.*\\..*).*)'],
};
