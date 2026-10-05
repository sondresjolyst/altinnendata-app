import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    SESSION_ERRORS,
    closeSessionPrompt,
    getSessionPromptOpen,
    isTerminalSessionError,
    openSessionPrompt,
    subscribeSessionPrompt,
} from '@/lib/sessionExpiry';

afterEach(() => closeSessionPrompt());

describe('session expiry classification', () => {
    it('treats every error the jwt callback can set as terminal', () => {
        // Linked to the producer: a renamed literal in authOptions.ts fails here rather than
        // silently reclassifying a dead session as transient.
        for (const error of Object.values(SESSION_ERRORS)) {
            expect(isTerminalSessionError(error)).toBe(true);
        }
    });

    it('does not treat a healthy or transiently failing session as terminal', () => {
        expect(isTerminalSessionError(undefined)).toBe(false);
        expect(isTerminalSessionError('ECONNREFUSED')).toBe(false);
        expect(isTerminalSessionError('Request failed with status code 500')).toBe(false);
    });
});

describe('the re-sign-in prompt', () => {
    it('tells every subscriber when it opens and closes', () => {
        const first = vi.fn();
        const second = vi.fn();
        subscribeSessionPrompt(first);
        const unsubscribe = subscribeSessionPrompt(second);

        openSessionPrompt();
        expect(getSessionPromptOpen()).toBe(true);
        expect(first).toHaveBeenCalledOnce();
        expect(second).toHaveBeenCalledOnce();

        unsubscribe();
        closeSessionPrompt();
        expect(getSessionPromptOpen()).toBe(false);
        expect(first).toHaveBeenCalledTimes(2);
        expect(second).toHaveBeenCalledOnce();
    });

    it('does not fire again while it is already open', () => {
        const listener = vi.fn();
        subscribeSessionPrompt(listener);

        openSessionPrompt();
        openSessionPrompt();

        expect(listener).toHaveBeenCalledOnce();
    });

    it('lets a subscriber unsubscribe from inside its own callback', () => {
        const later = vi.fn();
        const unsubscribe = subscribeSessionPrompt(() => unsubscribe());
        subscribeSessionPrompt(later);

        expect(() => openSessionPrompt()).not.toThrow();
        expect(later).toHaveBeenCalledOnce();
    });
});
