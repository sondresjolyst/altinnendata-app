import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Providers from '@/app/providers';

const sessionProviderProps = vi.fn();

vi.mock('next-auth/react', () => ({
    SessionProvider: (props: { refetchInterval?: number; children: React.ReactNode }) => {
        sessionProviderProps(props);
        return <>{props.children}</>;
    },
    useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

vi.mock('sonner', () => ({ Toaster: () => null }));

describe('Providers', () => {
    it('polls the session so an open tab renews its token before a save needs it', () => {
        render(<Providers>{null}</Providers>);

        // next-auth polls only once a session exists, so this costs signed-out readers nothing.
        // Without it the tab never re-reads its own session: a bare getSession() call updates
        // other tabs, not this one.
        expect(sessionProviderProps).toHaveBeenCalledWith(
            expect.objectContaining({ refetchInterval: 4 * 60 }),
        );
    });
});
