import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProtectedGate from '@/app/[locale]/(protected)/ProtectedGate';
import { DictionaryProvider } from '@/i18n/DictionaryProvider';
import { getDictionary } from '@/i18n/dictionaries';
import { makeSession, navigation, resetTestMocks, setSession } from '@sjolystinnovation/app-kit/testing';

// The gate itself is tested in app-kit. These tests cover what this app passes to it.
const dict = getDictionary('no');

vi.mock('next/navigation', async () => (await import('@sjolystinnovation/app-kit/testing')).nextNavigationMock());
vi.mock('next-auth/react', async () => (await import('@sjolystinnovation/app-kit/testing')).nextAuthMock());

const gate = () => (
    <DictionaryProvider locale="no">
        <ProtectedGate>
            <p>admin work</p>
        </ProtectedGate>
    </DictionaryProvider>
);

describe('ProtectedGate', () => {
    beforeEach(() => {
        resetTestMocks();
        navigation.pathname = '/no/admin/builds';
    });

    it('shows the loading text while the session loads', () => {
        setSession('loading');
        render(gate());

        expect(screen.getByText(dict.common.loading)).toBeInTheDocument();
        expect(screen.queryByText('admin work')).not.toBeInTheDocument();
    });

    it('sends a signed-out visitor to /no/login', () => {
        setSession(null);
        render(gate());

        expect(navigation.router.replace).toHaveBeenCalledWith('/no/login');
    });

    it('renders the page for a healthy session', () => {
        setSession(makeSession({ roles: ['Admin'] }));
        render(gate());

        expect(screen.getByText('admin work')).toBeInTheDocument();
    });
});
