import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import proxy, { config } from '@/proxy';
import { DEFAULT_LOCALE } from '@/i18n/config';

const request = (path: string) => new NextRequest(new URL(path, 'https://www.altinnendata.no'));

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe('proxy matcher', () => {
    it('skips the generated favicon, which has no file extension', () => {
        expect(matches('/icon')).toBe(false);
        expect(matches('/icon?59ff07363d38ae46')).toBe(false);
    });

    it('still runs for unprefixed pages, including ones starting with icon', () => {
        expect(matches('/builds')).toBe(true);
        expect(matches('/icons')).toBe(true);
    });
});

describe('locale redirect', () => {
    it('answers 308, so the locale-prefixed url is the one that ranks', () => {
        expect(proxy(request('/')).status).toBe(308);
    });

    it('sends an unprefixed path to the default locale, keeping the rest of it', () => {
        expect(proxy(request('/')).headers.get('location'))
            .toBe(`https://www.altinnendata.no/${DEFAULT_LOCALE}`);
        expect(proxy(request('/builds/gaming-pc')).headers.get('location'))
            .toBe(`https://www.altinnendata.no/${DEFAULT_LOCALE}/builds/gaming-pc`);
    });

    it('leaves an already-prefixed path alone', () => {
        expect(proxy(request('/en/builds')).headers.get('location')).toBeNull();
    });
});
