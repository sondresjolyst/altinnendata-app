import { describe, it, expect, vi, afterEach } from 'vitest';
import manifest from '@/app/manifest';

const respond = (body: unknown) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }),
    );

const iconSrc = async () => (await manifest()).icons![0].src;

afterEach(() => vi.restoreAllMocks());

describe('manifest', () => {
    it('points the installed app at the icon route, not the bundled file', async () => {
        respond({ iconData: Buffer.from('custom').toString('base64'), iconContentType: 'image/x-icon' });
        const result = await manifest();

        expect(result.icons![0]).toMatchObject({ src: expect.stringMatching(/^\/icon\?v=[0-9a-f]{12}$/), type: 'image/x-icon' });
        expect(result.id).toBe('/no');
    });

    it('changes the icon URL when the icon set in settings changes', async () => {
        respond({ iconData: Buffer.from('one').toString('base64'), iconContentType: 'image/png' });
        const first = await iconSrc();
        vi.restoreAllMocks();
        respond({ iconData: Buffer.from('two').toString('base64'), iconContentType: 'image/png' });

        expect(await iconSrc()).not.toBe(first);
    });

    it('falls back to the bundled icon when none is set or the API is down', async () => {
        respond({ iconData: null, iconContentType: null });
        const whenUnset = await iconSrc();
        vi.restoreAllMocks();
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

        expect(await iconSrc()).toBe(whenUnset);
        expect((await manifest()).icons![0].type).toBe('image/png');
    });
});
