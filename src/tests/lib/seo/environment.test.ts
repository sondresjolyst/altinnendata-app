import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isIndexableEnvironment } from '@/lib/seo/environment';

const original = { ...process.env };

beforeEach(() => { delete process.env.SITE_ENV; });
afterEach(() => { process.env = { ...original }; });

describe('isIndexableEnvironment', () => {
    /** The deploy workflow passes its own `environment` input, which spells it `prod`. */
    it('treats the values the deploy workflow actually sends as production', () => {
        for (const value of ['prod', 'production', 'Prod', '  PRODUCTION  ']) {
            process.env.SITE_ENV = value;
            expect(isIndexableEnvironment(), value).toBe(true);
        }
    });

    it('treats anything else as a host that should not be crawled', () => {
        for (const value of ['dev', 'development', 'staging', 'test', 'preview']) {
            process.env.SITE_ENV = value;
            expect(isIndexableEnvironment(), value).toBe(false);
        }
    });

    /**
     * The asymmetry this defaults around: wrongly blocking removes the live site from Google and
     * takes weeks to undo; wrongly allowing leaves a test host crawlable, which is the status quo.
     */
    it('assumes production when unset or blank, rather than risk deindexing it', () => {
        expect(isIndexableEnvironment()).toBe(true);

        process.env.SITE_ENV = '';
        expect(isIndexableEnvironment()).toBe(true);

        process.env.SITE_ENV = '   ';
        expect(isIndexableEnvironment()).toBe(true);
    });
});
