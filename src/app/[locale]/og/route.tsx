import { ImageResponse } from 'next/og';
import { COMPANY } from '@/lib/company';
import { BRAND } from '@/lib/seo/brand';
import { SHARE_IMAGE_SIZE } from '@/lib/seo/metadata';
import { isLocale, DEFAULT_LOCALE, LOCALES } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

export const revalidate = 86400;

export function generateStaticParams() {
    return LOCALES.map(locale => ({ locale }));
}

/**
 * The default share preview, at a stable URL per locale, referenced from `pageMetadata`.
 *
 * A route rather than Next's `opengraph-image` file convention: that image belongs to the
 * segment declaring it, and a page supplying its own `openGraph` block replaces it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const dict = getDictionary(isLocale(locale) ? locale : DEFAULT_LOCALE);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '80px',
                    background: BRAND.background,
                    color: BRAND.foreground,
                }}
            >
                <div style={{ display: 'flex', width: 120, height: 12, background: BRAND.primary }} />
                <div style={{ marginTop: 48, fontSize: 96, fontWeight: 800, letterSpacing: '-0.03em' }}>
                    {COMPANY.name}
                </div>
                <div style={{ marginTop: 24, fontSize: 34, lineHeight: 1.3, color: 'rgba(255,255,255,0.75)' }}>
                    {dict.meta.tagline}
                </div>
            </div>
        ),
        SHARE_IMAGE_SIZE,
    );
}
