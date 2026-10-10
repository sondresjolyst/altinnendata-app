import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { Session } from 'next-auth';
import ProtectedGate from '@/app/[locale]/(protected)/ProtectedGate';
import AdminLayout from '@/app/[locale]/(protected)/admin/layout';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { closeSessionPrompt, openSessionPrompt } from '@sjolystinnovation/app-kit/session';

const push = vi.fn();
const replace = vi.fn();
let pathname = '/no/admin/builds';
let sessionState: { data: Session | null; status: 'loading' | 'authenticated' | 'unauthenticated' };

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace }),
    usePathname: () => pathname,
}));

vi.mock('next-auth/react', () => ({
    useSession: () => sessionState,
}));

const session = (): Session => ({
    user: { id: '1', name: 'admin', email: 'a@b.no', roles: ['Admin'] },
    accessToken: 'token',
    expires: '',
});

// The real nesting: the gate wraps the admin layout, which wraps the form. Testing the gate on
// its own hid the fact that the layout below it made its own decision to blank the page.
const tree = () => (
    <DictionaryProvider locale="no">
        <ProtectedGate>
            <AdminLayout>
                <p>admin work</p>
            </AdminLayout>
        </ProtectedGate>
    </DictionaryProvider>
);

describe('the admin layout inside the gate', () => {
    beforeEach(() => {
        push.mockClear();
        replace.mockClear();
        pathname = '/no/admin/builds';
        sessionState = { data: session(), status: 'authenticated' };
        closeSessionPrompt();
    });

    afterEach(() => closeSessionPrompt());

    it('renders the admin page for a healthy admin session', () => {
        render(tree());

        expect(screen.getByText('admin work')).toBeInTheDocument();
    });

    it('keeps the form on screen while the prompt recovers a signed-out session', () => {
        const view = render(tree());
        expect(screen.getByText('admin work')).toBeInTheDocument();

        // The cookie is gone and the 401 handler has raised the prompt. The gate declines to
        // redirect, so the layout must not blank the page either, or the form is lost anyway.
        sessionState = { data: null, status: 'unauthenticated' };
        act(() => openSessionPrompt());
        view.rerender(tree());

        expect(screen.getByText('admin work')).toBeInTheDocument();
        expect(push).not.toHaveBeenCalled();
        expect(replace).not.toHaveBeenCalled();
    });

    it('still keeps a non-admin out of the admin page', () => {
        sessionState = {
            data: { ...session(), user: { ...session().user, roles: [] } },
            status: 'authenticated',
        };

        render(tree());

        expect(screen.queryByText('admin work')).not.toBeInTheDocument();
        expect(replace).toHaveBeenCalledWith('/no');
    });
});
