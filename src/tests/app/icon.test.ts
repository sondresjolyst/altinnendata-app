import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import Icon from '@/app/icon';

const respond = (body: unknown) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }),
    );

const bytes = async (response: Response) => new Uint8Array(await response.arrayBuffer());

async function expectBundledIcon(response: Response) {
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(await bytes(response)).toEqual(new Uint8Array(await readFile(join(process.cwd(), 'public', 'icon.png'))));
}

afterEach(() => vi.restoreAllMocks());

describe('icon', () => {
    it('serves the icon set in settings', async () => {
        respond({ iconData: Buffer.from('custom').toString('base64'), iconContentType: 'image/x-icon' });
        const response = await Icon();

        expect(response.headers.get('content-type')).toBe('image/x-icon');
        expect(new TextDecoder().decode(await bytes(response))).toBe('custom');
    });

    it('serves the bundled icon when none is set', async () => {
        respond({ logoData: null, logoContentType: null, iconData: null, iconContentType: null });
        await expectBundledIcon(await Icon());
    });

    it('serves nothing cacheable when the API is down, so the bundled icon never replaces the set one', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
        const response = await Icon();

        expect(response.status).toBe(503);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });
});
