import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translateFields, TranslationUnavailableError } from '@/lib/translation';

const original = { ...process.env };

const respond = (translatedText: string[] | string) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ translatedText }), {
            headers: { 'content-type': 'application/json' },
        }),
    );

const sentBody = (mock: ReturnType<typeof respond>) =>
    JSON.parse(String(mock.mock.calls[0][1]?.body)) as Record<string, unknown>;

beforeEach(() => {
    process.env.LIBRETRANSLATE_URL = 'http://libretranslate:5000/';
    delete process.env.LIBRETRANSLATE_API_KEY;
});

afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...original };
});

describe('translateFields', () => {
    it('sends every filled line of every field in one request, without the markdown markers', async () => {
        const fetchMock = respond(['Gaming PC', 'Fast', 'Parts', 'RTX 5080 graphics card', '32 GB memory']);

        await translateFields(
            {
                title: 'Gaming-PC',
                summary: 'Rask',
                description: '## Deler\n\n- RTX 5080 skjermkort\n2. 32 GB minne',
            },
            'no',
            'en',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe('http://libretranslate:5000/translate');
        expect(sentBody(fetchMock)).toMatchObject({
            q: ['Gaming-PC', 'Rask', 'Deler', 'RTX 5080 skjermkort', '32 GB minne'],
            source: 'nb',
            target: 'en',
        });
    });

    it('keeps blank lines and markdown markers so the structure survives', async () => {
        respond(['Parts', 'RTX 5080 graphics card', '32 GB memory']);

        const result = await translateFields(
            { title: null, summary: null, description: '## Deler\n\n- RTX 5080 skjermkort\n2. 32 GB minne' },
            'no',
            'en',
        );

        expect(result.description).toBe('## Parts\n\n- RTX 5080 graphics card\n2. 32 GB memory');
    });

    it('leaves fields that were not filled in as null', async () => {
        respond(['Gaming PC']);

        const result = await translateFields({ title: 'Gaming-PC', summary: null, description: null }, 'no', 'en');

        expect(result).toEqual({ title: 'Gaming PC', summary: null, description: null });
    });

    it('sends nothing when there is nothing to translate', async () => {
        const fetchMock = respond([]);

        const result = await translateFields({ title: '', summary: null, description: '  \n- ' }, 'no', 'en');

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result).toEqual({ title: '', summary: null, description: '  \n- ' });
    });

    it('keeps a line the engine would answer with nothing', async () => {
        const fetchMock = respond(['Powerful gaming PC']);
        const description = '_______________\n\nKraftig gaming-PC\n\n_______________';

        const result = await translateFields({ title: null, summary: null, description }, 'no', 'en');

        expect(sentBody(fetchMock)).toMatchObject({ q: ['Kraftig gaming-PC'] });
        expect(result.description).toBe('_______________\n\nPowerful gaming PC\n\n_______________');
    });

    it('keeps the emoji the engine would eat off either end of a line', async () => {
        const fetchMock = respond(['RTX 4070 Perfect for gaming', 'Tested']);

        const result = await translateFields(
            { title: '✨RTX 4070 Perfekt for gaming🎮', summary: 'Testet 🔌', description: null },
            'no',
            'en',
        );

        expect(sentBody(fetchMock)).toMatchObject({ q: ['RTX 4070 Perfekt for gaming', 'Testet'] });
        expect(result.title).toBe('✨RTX 4070 Perfect for gaming🎮');
        expect(result.summary).toBe('Tested 🔌');
    });

    it('passes the api key only when one is configured', async () => {
        const withoutKey = respond(['Gaming PC']);
        await translateFields({ title: 'Gaming-PC', summary: null, description: null }, 'no', 'en');
        expect(sentBody(withoutKey)).not.toHaveProperty('api_key');
        vi.restoreAllMocks();

        process.env.LIBRETRANSLATE_API_KEY = 'secret';
        const withKey = respond(['Gaming PC']);
        await translateFields({ title: 'Gaming-PC', summary: null, description: null }, 'no', 'en');
        expect(sentBody(withKey)).toMatchObject({ api_key: 'secret' });
    });

    it('reports a deployment with no translation service separately', async () => {
        delete process.env.LIBRETRANSLATE_URL;

        await expect(translateFields({ title: 'Gaming-PC', summary: null, description: null }, 'no', 'en'))
            .rejects.toBeInstanceOf(TranslationUnavailableError);
    });

    it('passes on the error the service reported', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ error: 'Slow down' }), {
                status: 429,
                headers: { 'content-type': 'application/json' },
            }),
        );

        await expect(translateFields({ title: 'Gaming-PC', summary: null, description: null }, 'no', 'en'))
            .rejects.toThrow('Slow down');
    });

    it('rejects a reply that does not line up with the request', async () => {
        respond(['Gaming PC', 'Extra']);

        await expect(translateFields({ title: 'Gaming-PC', summary: null, description: null }, 'no', 'en'))
            .rejects.toThrow(/different number of lines/);
    });
});
