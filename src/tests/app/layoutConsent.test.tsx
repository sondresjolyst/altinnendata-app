import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { ConsentBanner, MetaPixel, TikTokPixel } from '@sjolystinnovation/app-kit/consent';
import LocaleLayout from '@/app/[locale]/layout';
import Footer from '@/app/[locale]/footer';
import { publicGetOptional } from '@/lib/publicApi';
import { getMarketingConfig } from '@/lib/marketing';
import no from '@/i18n/locales/no.json';
import en from '@/i18n/locales/en.json';

vi.mock('@/lib/publicApi', () => ({ publicGetOptional: vi.fn() }));
vi.mock('@/lib/companyInfo', () => ({ getCompanyInfo: () => Promise.resolve({ name: 'Altinnendata' }) }));

const get = vi.mocked(publicGetOptional);

/** Answers the layout's reads: no branding, and the given marketing config. */
const answer = (marketing: unknown) =>
    get.mockImplementation(path => Promise.resolve(path === '/marketing/config' ? marketing : null) as never);

/** Every element of `type` in the tree the layout returns, without rendering it. */
function find(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>>[] {
    if (Array.isArray(node)) return node.flatMap(child => find(child, type));
    if (!isValidElement<{ children?: ReactNode }>(node)) return [];
    const own = node.type === type ? [node as ReactElement<Record<string, unknown>>] : [];
    return [...own, ...find(node.props.children, type)];
}

const layout = (locale: string) => LocaleLayout({ children: <p>page</p>, params: Promise.resolve({ locale }) });

beforeEach(() => get.mockReset());

const META = '123456789012345';
const TIKTOK = 'C4A1B2C3D4E5F6G7H8I9';
const NOTICE = '2026-11-meta-tiktok';

const banner = (locale: 'no' | 'en') => ({
    noticeVersion: NOTICE,
    enabled: true,
    cookiesHref: `/${locale}/cookies`,
    logEndpoint: 'http://api.test/api/consent',
    strings: (locale === 'no' ? no : en).consentBanner,
});

describe('the consent banner in the layout', () => {
    it.each([
        ['no IDs', { metaPixelId: null, tikTokPixelId: null }],
        ['an API without the endpoint', null],
        ['an API from before the TikTok field', { metaPixelId: null }],
        ['IDs that are not valid', { metaPixelId: '12ab<script>', tikTokPixelId: 'abc<script>' }],
        ['a lowercase TikTok ID', { metaPixelId: null, tikTokPixelId: 'c4a1b2c3d4e5f6g7h8i9' }],
    ])('renders no banner, no pixel and no settings link with %s', async (_, config) => {
        answer(config);
        const tree = await layout('no');

        expect(find(tree, ConsentBanner)).toEqual([]);
        expect(find(tree, MetaPixel)).toEqual([]);
        expect(find(tree, TikTokPixel)).toEqual([]);
        expect(find(tree, Footer).map(f => f.props.consentSettings)).toEqual([false]);
    });

    it('reads the config with the marketing tag, so an admin save reaches every page', async () => {
        answer({ metaPixelId: null, tikTokPixelId: null });
        await layout('no');

        expect(get).toHaveBeenCalledWith('/marketing/config', { tags: ['marketing'] });
    });

    it('renders the banner, the Meta Pixel with its automatic events and the settings link with only a Meta ID', async () => {
        answer({ metaPixelId: META, tikTokPixelId: null });
        const tree = await layout('no');

        expect(find(tree, ConsentBanner).map(b => b.props)).toEqual([banner('no')]);
        expect(find(tree, MetaPixel).map(p => p.props)).toEqual([{ noticeVersion: NOTICE, pixelId: META, autoConfig: true }]);
        expect(find(tree, TikTokPixel)).toEqual([]);
        expect(find(tree, Footer).map(f => f.props.consentSettings)).toEqual([true]);
    });

    it('renders the banner, the TikTok Pixel and the settings link with only a TikTok ID', async () => {
        answer({ metaPixelId: null, tikTokPixelId: TIKTOK });
        const tree = await layout('no');

        expect(find(tree, ConsentBanner).map(b => b.props)).toEqual([banner('no')]);
        expect(find(tree, MetaPixel)).toEqual([]);
        expect(find(tree, TikTokPixel).map(p => p.props)).toEqual([{ noticeVersion: NOTICE, pixelId: TIKTOK }]);
        expect(find(tree, Footer).map(f => f.props.consentSettings)).toEqual([true]);
    });

    it('renders one banner and both pixels with both IDs', async () => {
        answer({ metaPixelId: META, tikTokPixelId: TIKTOK });
        const tree = await layout('no');

        expect(find(tree, ConsentBanner)).toHaveLength(1);
        expect(find(tree, MetaPixel).map(p => p.props.pixelId)).toEqual([META]);
        expect(find(tree, TikTokPixel).map(p => p.props.pixelId)).toEqual([TIKTOK]);
    });

    it('keeps the Meta Pixel and drops an invalid TikTok ID', async () => {
        answer({ metaPixelId: META, tikTokPixelId: 'abc<script>' });
        const tree = await layout('no');

        expect(find(tree, ConsentBanner)).toHaveLength(1);
        expect(find(tree, MetaPixel)).toHaveLength(1);
        expect(find(tree, TikTokPixel)).toEqual([]);
    });

    it('renders the English banner on the English site', async () => {
        answer({ metaPixelId: META, tikTokPixelId: TIKTOK });
        const tree = await layout('en');

        expect(find(tree, ConsentBanner).map(b => b.props)).toEqual([banner('en')]);
    });

    it.each([['no', no], ['en', en]] as const)('names both pixels in the %s banner', (_, dict) => {
        expect(dict.consentBanner.body).toContain('Meta Pixel');
        expect(dict.consentBanner.body).toContain('TikTok Pixel');
    });
});

describe('getMarketingConfig', () => {
    it.each([
        [{ metaPixelId: META, tikTokPixelId: TIKTOK }, { metaPixelId: META, tikTokPixelId: TIKTOK }],
        [{ metaPixelId: null, tikTokPixelId: null }, { metaPixelId: null, tikTokPixelId: null }],
        [{ metaPixelId: META }, { metaPixelId: META, tikTokPixelId: null }],
        [{ metaPixelId: '12ab<script>', tikTokPixelId: 'abc<script>' }, { metaPixelId: null, tikTokPixelId: null }],
        [{ metaPixelId: 123456789, tikTokPixelId: 1234567890 }, { metaPixelId: null, tikTokPixelId: null }],
        [{ metaPixelId: null, tikTokPixelId: 'c4a1b2c3d4e5f6g7h8i9' }, { metaPixelId: null, tikTokPixelId: null }],
        [{ metaPixelId: null, tikTokPixelId: 'ABC123456' }, { metaPixelId: null, tikTokPixelId: null }],
        [{ metaPixelId: null, tikTokPixelId: 'A'.repeat(33) }, { metaPixelId: null, tikTokPixelId: null }],
        [{ metaPixelId: null, tikTokPixelId: 'ABC1234567' }, { metaPixelId: null, tikTokPixelId: 'ABC1234567' }],
        [{ metaPixelId: null, tikTokPixelId: ' ABC1234567' }, { metaPixelId: null, tikTokPixelId: null }],
        [null, { metaPixelId: null, tikTokPixelId: null }],
    ])('gives each valid ID or null for %j', async (config, expected) => {
        answer(config);

        await expect(getMarketingConfig()).resolves.toEqual(expected);
    });
});
