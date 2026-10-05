// Errors the jwt callback sets when the session cannot be recovered without a new sign-in.
// A transient refresh failure (network, API restart) deliberately sets no error, so the
// session keeps working and a later session read retries the refresh.
export const SESSION_ERRORS = {
    absoluteExpiry: 'AbsoluteSessionExpired',
    refreshRejected: 'RefreshTokenRejected',
    noRefreshToken: 'NoRefreshToken',
} as const;

const TERMINAL: ReadonlySet<string> = new Set(Object.values(SESSION_ERRORS));

export function isTerminalSessionError(error: string | undefined): boolean {
    return error != null && TERMINAL.has(error);
}

// Whether the re-sign-in prompt is showing. It lives outside React because the axios
// interceptor that raises it is a plain module, and because ProtectedGate has to know: it
// must not redirect to the login page while the prompt is recovering the session in place.
let promptOpen = false;
const listeners = new Set<() => void>();

function emit(): void {
    for (const listener of [...listeners]) listener();
}

/** Ask the user to sign in again without leaving the page. */
export function openSessionPrompt(): void {
    if (promptOpen) return;
    promptOpen = true;
    emit();
}

export function closeSessionPrompt(): void {
    if (!promptOpen) return;
    promptOpen = false;
    emit();
}

export function subscribeSessionPrompt(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getSessionPromptOpen(): boolean {
    return promptOpen;
}
