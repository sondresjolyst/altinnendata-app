"use client";

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { getSessionPromptOpen, isTerminalSessionError, subscribeSessionPrompt } from '@/lib/sessionExpiry';

/**
 * Whether a protected page may render, and whether it must stay rendered.
 *
 * Shared so every gate on the way down agrees. A nested layout that decides on its own to
 * blank the page undoes the in-place recovery the re-sign-in prompt exists for, and the user
 * loses the form anyway.
 */
export function useSessionGate() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const promptOpen = useSyncExternalStore(subscribeSessionPrompt, getSessionPromptOpen, () => false);

    const usable = status === 'authenticated' && !isTerminalSessionError(session?.error);

    // Which page last rendered on a healthy session. Keyed by path, so each page in the group
    // starts the check again and a session that died on the previous page cannot carry a stale
    // pass into a fresh form. Adjusted during render rather than in an effect, which is the
    // supported way to derive state from changing inputs.
    const [usableAt, setUsableAt] = useState<string | null>(null);
    if (usable && usableAt !== pathname) setUsableAt(pathname);
    const wasUsable = usableAt === pathname;

    return {
        session,
        status,
        promptOpen,
        usable,
        wasUsable,
        /** The page is already open and the prompt is recovering the session in place. */
        recovering: promptOpen && wasUsable,
    };
}
