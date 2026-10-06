"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getSession, signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Alert } from '@sjolystinnovation/app-kit/ui';
import CredentialsForm, { SignInRejected } from './CredentialsForm';
import { useDictionary } from '@/i18n/DictionaryProvider';
import { localeHref } from '@/i18n/config';
import {
    closeSessionPrompt,
    getSessionPromptOpen,
    isTerminalSessionError,
    openSessionPrompt,
    subscribeSessionPrompt,
} from '@/lib/sessionExpiry';

// The absolute session cap cannot be refreshed away, so warn while there is still time to sign
// in again without interrupting a save.
const WARN_BEFORE_MS = 30 * 60 * 1000;
const WARN_TICK_MS = 60 * 1000;

/**
 * Keeps an expiring session from costing the user their work. It warns before the absolute cap,
 * and signs them back in without leaving the page when a request finds a dead session.
 */
export default function SessionExpiryGuard() {
    const { data: session, status } = useSession();
    const { locale, dict } = useDictionary();

    const open = useSyncExternalStore(subscribeSessionPrompt, getSessionPromptOpen, () => false);

    // Who opened this page. Latched, because once a lost cookie has been re-read useSession
    // reports nobody, and an unlatched check would accept a sign-in from any account.
    const [owner, setOwner] = useState<{ id: string; email: string } | null>(null);
    const current = session?.user;
    if (current?.id && current.id !== owner?.id) setOwner({ id: current.id, email: current.email ?? '' });

    // A clock in state rather than Date.now() in render, so rendering stays pure and the banner
    // still re-reads the remaining time every minute.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), WARN_TICK_MS);
        return () => window.clearInterval(timer);
    }, []);

    const remaining = status === 'authenticated' && session?.absoluteExpiresAt != null
        ? session.absoluteExpiresAt - now
        : null;
    // Past the cap there are no minutes to report, so the expired copy takes over.
    const minutesLeft = remaining != null && remaining > 0 && remaining <= WARN_BEFORE_MS
        ? Math.round(remaining / 60000)
        : null;
    const expired = status === 'authenticated'
        && (isTerminalSessionError(session?.error) || (remaining != null && remaining <= 0));

    // Nothing else can close the latch, so leaving it open here would stop ProtectedGate
    // redirecting a dead session for the rest of the page's life.
    useEffect(() => closeSessionPrompt, []);

    // Who the prompt opened for. signIn refreshes the session before its promise resolves, so
    // comparing against the live owner would end up comparing the new account with itself. The
    // submit handler's closure happens to hold the old owner today, so this ref is what makes
    // that correctness explicit rather than incidental. No test can tell the two apart, which
    // is the reason to prefer the explicit one.
    const promptOwner = useRef<{ id: string; email: string } | null>(null);
    useEffect(() => {
        if (!open) {
            promptOwner.current = null;
            return;
        }
        // Only on the way open. Reassigning while open would adopt the account that just
        // signed in, which is the very thing being checked against.
        promptOwner.current ??= owner;
    }, [open, owner]);

    const dialog = useRef<HTMLDivElement | null>(null);

    // Keyboard handling for the dialog: Escape closes it, Tab cycles inside it, and focus
    // starts on the password field and returns where it was. Without this, Tab walks into the
    // form behind the overlay, which the user cannot see and must not edit.
    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement as HTMLElement | null;
        const focusable = () =>
            Array.from(dialog.current?.querySelectorAll<HTMLElement>('input, button:not([disabled])') ?? []);

        focusable().find(element => element instanceof HTMLInputElement && element.type === 'password')?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeSessionPrompt();
                return;
            }
            if (event.key !== 'Tab') return;
            const elements = focusable();
            if (elements.length === 0) return;
            const edge = event.shiftKey ? elements[0] : elements[elements.length - 1];
            if (document.activeElement === edge) {
                event.preventDefault();
                (event.shiftKey ? elements[elements.length - 1] : elements[0]).focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            previous?.focus();
        };
    }, [open]);

    const signedIn = async () => {
        // next-auth's signIn already refreshed the client session, so read it back and only
        // claim success if the new session can actually be used to save.
        const next = await getSession();
        if (!next || isTerminalSessionError(next.error)) {
            throw new SignInRejected(dict.auth.sessionNotRestored);
        }
        // The form on the page belongs to whoever opened it. Refusing in the dialog is not
        // enough, because signIn has already replaced the session: end it, or the new account
        // keeps the page and can save the previous user's work as their own. Nothing is lost,
        // since that draft is stored under its owner's id and returns when they sign in.
        const opener = promptOwner.current ?? owner;
        if (opener && next.user?.id !== opener.id) {
            await signOut({ callbackUrl: localeHref(locale, '/login') });
            throw new SignInRejected(dict.auth.sessionWrongUser);
        }
        closeSessionPrompt();
        toast.success(dict.auth.sessionRestored);
    };

    return (
        <>
            {(expired || minutesLeft != null) && (
                // Anchored to the bottom: the navbar is sticky at the top with the same
                // stacking level.
                <div className="fixed inset-x-0 bottom-0 z-40">
                    <Alert variant="warning" role={expired ? 'alert' : 'status'}>
                        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
                            <span>
                                {expired
                                    ? dict.auth.sessionExpiredBody
                                    : dict.auth.sessionExpiringSoon.replace('{minutes}', String(minutesLeft))}
                            </span>
                            <button
                                type="button"
                                onClick={openSessionPrompt}
                                className="font-semibold underline underline-offset-2"
                            >
                                {dict.auth.reSignIn}
                            </button>
                        </div>
                    </Alert>
                </div>
            )}

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div
                        ref={dialog}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="session-expiry-title"
                        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
                    >
                        <h2 id="session-expiry-title" className="text-lg font-bold text-gray-900">
                            {dict.auth.sessionExpiredTitle}
                        </h2>
                        <p className="mt-1 mb-4 text-sm text-gray-600">{dict.auth.sessionExpiredBody}</p>
                        <CredentialsForm initialEmail={owner?.email ?? ''} onSignedIn={signedIn}>
                            <button
                                type="button"
                                onClick={closeSessionPrompt}
                                className="rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                {dict.common.close}
                            </button>
                        </CredentialsForm>
                    </div>
                </div>
            )}
        </>
    );
}
