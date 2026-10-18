import '@testing-library/jest-dom/vitest';

// The API clients refuse to start without it, as they do in a real build.
process.env.NEXT_PUBLIC_API_URL = 'http://api.test/api';

// jsdom has no modal dialog. This stands in for the parts the code relies on: the open state, focus
// moving in on open and back on close, the close event raised later, and Escape raising a cancelable cancel event.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
    const returnTo = new WeakMap<HTMLDialogElement, Element | null>();
    const escapeHandlers = new WeakMap<HTMLDialogElement, (e: KeyboardEvent) => void>();

    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
        returnTo.set(this, document.activeElement);
        this.setAttribute('open', '');
        this.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            const cancel = new Event('cancel', { cancelable: true });
            this.dispatchEvent(cancel);
            if (!cancel.defaultPrevented) this.close();
        };
        escapeHandlers.set(this, onKeyDown);
        document.addEventListener('keydown', onKeyDown);
    };

    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
        if (!this.hasAttribute('open')) return;
        this.removeAttribute('open');
        const onKeyDown = escapeHandlers.get(this);
        if (onKeyDown) document.removeEventListener('keydown', onKeyDown);
        (returnTo.get(this) as HTMLElement | null)?.focus();
        // A browser raises close as a queued task, after the code that closed the dialog has finished.
        queueMicrotask(() => this.dispatchEvent(new Event('close')));
    };
}
