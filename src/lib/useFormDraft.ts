"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIX = 'altinnendata:draft:';
const WRITE_DELAY_MS = 500;

// How long a draft stays on the device. Long enough to outlive an expired session or a closed
// tab, short enough that unpublished work does not sit in the browser indefinitely.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface Envelope<T> {
    savedAt: number;
    value: T;
}

function read<T>(key: string): T | null {
    try {
        const raw = window.localStorage.getItem(PREFIX + key);
        if (raw == null) return null;

        const envelope = JSON.parse(raw) as Envelope<T> | null;
        const fresh = typeof envelope?.savedAt === 'number' && Date.now() - envelope.savedAt <= MAX_AGE_MS;
        if (!fresh || envelope?.value === undefined) {
            window.localStorage.removeItem(PREFIX + key);
            return null;
        }
        return envelope.value;
    } catch {
        return null;
    }
}

/**
 * Keeps a form's values in localStorage so a sign-out, reload or closed tab cannot lose them.
 *
 * A draft found at mount is offered for restore rather than applied, so an edit form never
 * silently overwrites what the API returned. Saving starts immediately either way: the offer is
 * held in memory, so the newest work is always the thing on disk.
 *
 * The key must identify the signed-in user as well as the form, because a browser profile can
 * be shared: without that, the next person to sign in is offered the previous one's draft. Pass
 * a null key to store nothing, which is what callers should do while the user is unknown.
 */
export function useFormDraft<T>(key: string | null, value: T) {
    const [pending, setPending] = useState<T | null>(null);
    const json = JSON.stringify(value);
    const untouched = useRef(json);
    const writeTimer = useRef<number | null>(null);

    useEffect(() => {
        // Re-base on a key change too: the values on screen belong to the old key, and writing
        // them under the new one would put this form's work in another form's draft.
        untouched.current = json;
        setPending(key == null ? null : read<T>(key));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    useEffect(() => {
        if (key == null) return;
        // Write only once the form differs from how it opened. Writing the pristine form would
        // overwrite the draft being offered before the user has answered the prompt.
        if (json === untouched.current) return;
        const timer = window.setTimeout(() => {
            try {
                window.localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), value }));
            } catch {
                // A full or blocked store must not break the form.
            }
        }, WRITE_DELAY_MS);
        writeTimer.current = timer;
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, json]);

    const clear = useCallback(() => {
        if (key == null) return;
        // Cancel a write that is already scheduled, and treat the current values as the new
        // baseline. Otherwise a save is immediately followed by the draft being written back.
        if (writeTimer.current != null) window.clearTimeout(writeTimer.current);
        untouched.current = JSON.stringify(value);
        try {
            window.localStorage.removeItem(PREFIX + key);
        } catch {
            // Ignore: the draft is a convenience, not state we depend on.
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, json]);

    return {
        /** The draft found at mount, while it is still waiting to be restored or dismissed. */
        pending,
        /** Stop offering the draft. The caller applies the values it wants. */
        dismiss: useCallback(() => setPending(null), []),
        /** Drop the stored draft after a successful save. */
        clear,
    };
}
