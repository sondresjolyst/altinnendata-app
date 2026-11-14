import { describe, it, expect } from 'vitest';
import config from '../../../next.config';

const TIKTOK = 'https://analytics.tiktok.com https://analytics-ipv6.tiktokw.us https://ads.tiktok.com';

/** The page CSP's directives by name. */
async function csp(): Promise<Map<string, string>> {
    const rules = (await config.headers?.()) ?? [];
    const value = rules.flatMap(rule => rule.headers).find(header => header.key === 'Content-Security-Policy')?.value ?? '';
    return new Map(value.split(';').map(part => part.trim()).filter(Boolean).map(part => {
        const [name, ...sources] = part.split(/\s+/);
        return [name!, sources.join(' ')];
    }));
}

describe('the CSP', () => {
    it('lets the Meta Pixel and the TikTok Pixel load and send', async () => {
        const directives = await csp();

        expect(directives.get('script-src')).toContain(`https://connect.facebook.net ${TIKTOK}`);
        expect(directives.get('img-src')).toContain(`https://www.facebook.com ${TIKTOK}`);
        expect(directives.get('connect-src')).toContain(`https://www.facebook.com https://connect.facebook.net ${TIKTOK}`);
    });

    it('allows only the frame schemes TikTok asks for', async () => {
        expect((await csp()).get('frame-src')).toBe('bytedance: sslocal:');
    });
});
