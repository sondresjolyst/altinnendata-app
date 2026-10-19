import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { POST, resetHeldThrottle } from '@/app/api/shop/held/route';
import { publicGetLiveOptional } from '@/lib/publicApi';
import { TARGET_PATHS } from '@/lib/cacheTags';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/lib/publicApi', () => ({ publicGetLiveOptional: vi.fn() }));

const call = (body: unknown, type = 'application/json') =>
    POST(new NextRequest('http://localhost/api/shop/held', { method: 'POST', headers: { 'content-type': type }, body: typeof body === 'string' ? body : JSON.stringify(body) }));

describe('the held build route', () => {
    beforeEach(() => {
        vi.mocked(revalidatePath).mockReset();
        vi.mocked(revalidateTag).mockReset();
        vi.mocked(publicGetLiveOptional).mockReset();
        resetHeldThrottle();
    });

    it('purges the build pages without a session when the live build is Reserved', async () => {
        vi.mocked(publicGetLiveOptional).mockResolvedValue({ availability: 'Reserved' });

        const res = await call({ slug: 'gaming-pc' });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ revalidated: true });
        expect(publicGetLiveOptional).toHaveBeenCalledWith('/builds/gaming-pc?locale=no');
        for (const path of TARGET_PATHS.builds) expect(revalidatePath).toHaveBeenCalledWith(...(path.includes('[') ? [path, 'page'] : [path]));
        expect(revalidateTag).toHaveBeenCalledWith('builds', { expire: 0 });
    });

    it.each(['Available', 'Sold', 'Unknown'])('purges nothing when the live build is %s, so it cannot force a rebuild', async availability => {
        vi.mocked(publicGetLiveOptional).mockResolvedValue({ availability });

        const res = await call({ slug: 'gaming-pc' });

        expect(await res.json()).toEqual({ revalidated: false });
        expect(revalidatePath).not.toHaveBeenCalled();
        expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('purges nothing for an unknown build or a failed read, and a failed read does not use up the window', async () => {
        vi.mocked(publicGetLiveOptional).mockResolvedValue(null);
        expect(await (await call({ slug: 'nope' })).json()).toEqual({ revalidated: false });

        vi.mocked(publicGetLiveOptional).mockRejectedValue(new Error('down'));
        expect(await (await call({ slug: 'nope' })).json()).toEqual({ revalidated: false });
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('purges at most once every ten seconds for the whole process, whatever the slug', async () => {
        vi.useFakeTimers();
        try {
            vi.mocked(publicGetLiveOptional).mockResolvedValue({ availability: 'Reserved' });

            await call({ slug: 'gaming-pc' });
            const second = await call({ slug: 'kontor-pc' });
            expect(await second.json()).toEqual({ revalidated: false });
            expect(second.status).toBe(200);
            expect(vi.mocked(revalidateTag)).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(10_001);
            await call({ slug: 'kontor-pc' });
            expect(vi.mocked(revalidateTag)).toHaveBeenCalledTimes(2);
        } finally {
            vi.useRealTimers();
        }
    });

    it('purges exactly once for five concurrent requests for a Reserved build', async () => {
        vi.mocked(publicGetLiveOptional).mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
            return { availability: 'Reserved' };
        });

        const answers = await Promise.all(Array.from({ length: 5 }, () => call({ slug: 'gaming-pc' }).then(res => res.json())));

        expect(answers.filter(a => a.revalidated)).toHaveLength(1);
        expect(vi.mocked(revalidateTag)).toHaveBeenCalledTimes(1);
    });

    it.each(['Available', 'Sold'])('does not let a %s build block a following Reserved one', async availability => {
        vi.mocked(publicGetLiveOptional).mockResolvedValueOnce({ availability });
        await call({ slug: 'kontor-pc' });
        expect(revalidateTag).not.toHaveBeenCalled();

        vi.mocked(publicGetLiveOptional).mockResolvedValueOnce({ availability: 'Reserved' });
        expect(await (await call({ slug: 'gaming-pc' })).json()).toEqual({ revalidated: true });
    });

    it('lets a slow non-Reserved check finish first and then purges for the Reserved request behind it', async () => {
        let release: () => void = () => {};
        const slow = new Promise<{ availability: string }>(resolve => { release = () => resolve({ availability: 'Available' }); });
        vi.mocked(publicGetLiveOptional).mockReturnValueOnce(slow).mockResolvedValue({ availability: 'Reserved' });

        const first = call({ slug: 'kontor-pc' });
        const second = call({ slug: 'gaming-pc' });
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(publicGetLiveOptional).toHaveBeenCalledTimes(1);
        release();

        expect(await (await first).json()).toEqual({ revalidated: false });
        expect(await (await second).json()).toEqual({ revalidated: true });
        expect(vi.mocked(revalidateTag)).toHaveBeenCalledTimes(1);
    });

    it('runs at most one API read at a time', async () => {
        let running = 0;
        let most = 0;
        vi.mocked(publicGetLiveOptional).mockImplementation(async () => {
            running += 1;
            most = Math.max(most, running);
            await new Promise(resolve => setTimeout(resolve, 10));
            running -= 1;
            return { availability: 'Available' };
        });

        await Promise.all(Array.from({ length: 6 }, () => call({ slug: 'gaming-pc' })));

        expect(most).toBe(1);
        expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('releases the queue when a read fails', async () => {
        vi.mocked(publicGetLiveOptional).mockRejectedValueOnce(new Error('down')).mockResolvedValue({ availability: 'Reserved' });

        const first = call({ slug: 'kontor-pc' });
        const second = call({ slug: 'gaming-pc' });

        expect(await (await first).json()).toEqual({ revalidated: false });
        expect(await (await second).json()).toEqual({ revalidated: true });
    });

    describe('with a slow API', () => {
        const never = () => new Promise<never>(() => {});
        const settle = () => vi.advanceTimersByTimeAsync(0);

        beforeEach(() => vi.useFakeTimers());
        afterEach(() => vi.useRealTimers());

        it('counts a read that takes longer than two seconds as not Reserved and then lets the next request through', async () => {
            vi.mocked(publicGetLiveOptional).mockReturnValueOnce(never()).mockResolvedValue({ availability: 'Reserved' });

            const first = call({ slug: 'gaming-pc' });
            await vi.advanceTimersByTimeAsync(1_999);
            expect(revalidateTag).not.toHaveBeenCalled();
            await vi.advanceTimersByTimeAsync(2);

            expect(await (await first).json()).toEqual({ revalidated: false });
            expect(revalidateTag).not.toHaveBeenCalled();
            expect(await (await call({ slug: 'gaming-pc' })).json()).toEqual({ revalidated: true });
        });

        it('answers false at once beyond three waiters', async () => {
            vi.mocked(publicGetLiveOptional).mockReturnValue(never());

            const running = call({ slug: 'a' });
            await settle();
            const waiters = [call({ slug: 'b' }), call({ slug: 'c' }), call({ slug: 'd' })];
            await settle();
            const extra = await call({ slug: 'e' });

            expect(await extra.json()).toEqual({ revalidated: false });
            expect(publicGetLiveOptional).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(20_000);
            await Promise.all([running, ...waiters]);
        });

        it('lets a waiter give up after three seconds in the queue', async () => {
            vi.mocked(publicGetLiveOptional).mockReturnValue(never());

            const first = call({ slug: 'a' });
            await settle();
            const second = call({ slug: 'b' });
            const third = call({ slug: 'c' });
            await settle();
            let thirdAnswer: unknown = null;
            void third.then(res => res.json()).then(body => { thirdAnswer = body; });

            await vi.advanceTimersByTimeAsync(2_001);
            // The first read timed out, so the second request is reading now and the third still waits.
            expect(publicGetLiveOptional).toHaveBeenCalledTimes(2);
            expect(thirdAnswer).toBeNull();

            await vi.advanceTimersByTimeAsync(1_000);
            expect(thirdAnswer).toEqual({ revalidated: false });
            expect(publicGetLiveOptional).toHaveBeenCalledTimes(2);

            await vi.advanceTimersByTimeAsync(5_000);
            await Promise.all([first, second]);
            expect(revalidateTag).not.toHaveBeenCalled();
        });
    });

    it.each([['.'], ['..'], ['a/b'], ['Gaming-PC'], ['a b'], ['-a'], ['a-'], ['a--b'], ['a?x=1'], ['x'.repeat(161)]])('answers 400 for the slug %j without reading the API', async slug => {
        const res = await call({ slug });

        expect(res.status).toBe(400);
        expect(publicGetLiveOptional).not.toHaveBeenCalled();
    });

    it('accepts a slug of 160 characters', async () => {
        vi.mocked(publicGetLiveOptional).mockResolvedValue({ availability: 'Available' });

        expect((await call({ slug: 'x'.repeat(160) })).status).toBe(200);
    });

    it.each([[{ slug: 5 }], [{}], ['not json'], [{ slug: '' }]])('answers 400 for the body %j', async body => {
        const res = await call(body);

        expect(res.status).toBe(400);
        expect(publicGetLiveOptional).not.toHaveBeenCalled();
    });

    it('answers 415 unless the body is JSON', async () => {
        expect((await call('{"slug":"gaming-pc"}', 'text/plain')).status).toBe(415);
        expect(publicGetLiveOptional).not.toHaveBeenCalled();
    });
});
