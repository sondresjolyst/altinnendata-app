import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { nbLegalPageViewStrings } from '@sjolystinnovation/app-kit/locales/nb';
import BuildsPage from '@/app/[locale]/builds/page';
import TermsPage from '@/app/[locale]/terms/page';
import FeaturedBuilds from '@/components/FeaturedBuilds';
import { getDictionary } from '@/i18n/dictionaries';

const params = Promise.resolve({ locale: 'no' });

beforeEach(() => {
    vi.stubEnv('NEXT_PHASE', PHASE_PRODUCTION_BUILD);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('public pages built while the API is down', () => {
    it('builds the builds page with its empty state', async () => {
        render(await BuildsPage({ params }));

        expect(screen.getByText(getDictionary('no').builds.empty)).toBeInTheDocument();
    });

    it('leaves the build feed out of the home page', async () => {
        expect(await FeaturedBuilds({ locale: 'no', heading: 'Til salgs' })).toBeNull();
    });

    it('builds a legal page as not written yet', async () => {
        render(await TermsPage({ params }));

        expect(screen.getByText(nbLegalPageViewStrings.missing!)).toBeInTheDocument();
    });
});
