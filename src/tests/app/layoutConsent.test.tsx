import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { ConsentBanner, MetaPixel } from '@sjolystinnovation/app-kit/consent';
import { nbConsentBannerStrings } from '@sjolystinnovation/app-kit/locales/nb';
import LocaleLayout from '@/app/[locale]/layout';
import Footer from '@/app/[locale]/footer';
import { publicGetOptional } from '@/lib/publicApi';
import { getMetaPixelId } from '@/lib/marketing';

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

describe('the consent banner in the layout', () => {
    it.each([
        ['no ID', { metaPixelId: null }],
        ['an API without the endpoint', null],
        ['an ID that is not digits', { metaPixelId: '12ab<script>' }],
    ])('renders no banner, no pixel and no settings link with %s', async (_, config) => {
        answer(config);
        const tree = await layout('no');

        expect(find(tree, ConsentBanner)).toEqual([]);
        expect(find(tree, MetaPixel)).toEqual([]);
        expect(find(tree, Footer).map(f => f.props.consentSettings)).toEqual([false]);
    });

    it('reads the config with the marketing tag, so an admin save reaches every page', async () => {
        answer({ metaPixelId: null });
        await layout('no');

        expect(get).toHaveBeenCalledWith('/marketing/config', { tags: ['marketing'] });
    });

    it('renders the Norwegian banner, the pixel and the settings link when an ID is set', async () => {
        answer({ metaPixelId: '123456789012345' });
        const tree = await layout('no');

        expect(find(tree, ConsentBanner).map(b => b.props)).toEqual([
            { noticeVersion: '2026-10-meta', enabled: true, cookiesHref: '/no/cookies', strings: nbConsentBannerStrings },
        ]);
        expect(find(tree, MetaPixel).map(p => p.props)).toEqual([{ noticeVersion: '2026-10-meta', pixelId: '123456789012345' }]);
        expect(find(tree, Footer).map(f => f.props.consentSettings)).toEqual([true]);
    });

    it('renders the English banner on the English site', async () => {
        answer({ metaPixelId: '123456789012345' });
        const tree = await layout('en');

        expect(find(tree, ConsentBanner).map(b => b.props)).toEqual([{ noticeVersion: '2026-10-meta', enabled: true, cookiesHref: '/en/cookies', strings: undefined }]);
    });
});

describe('getMetaPixelId', () => {
    it.each([
        [{ metaPixelId: '123456789012345' }, '123456789012345'],
        [{ metaPixelId: null }, null],
        [{ metaPixelId: '12ab<script>' }, null],
        [{ metaPixelId: 123456789 }, null],
        [null, null],
    ])('gives a digits-only ID or null for %j', async (config, expected) => {
        answer(config);

        await expect(getMetaPixelId()).resolves.toBe(expected);
    });
});
