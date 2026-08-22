/** Values of `SITE_ENV` that name the live site. `prod` is what the deploy workflow passes. */
const PRODUCTION = new Set(['production', 'prod', '']);

/**
 * Whether this deployment is the one search engines should index. An unset `SITE_ENV` counts as
 * production: a missing variable must not be what deindexes the live site.
 */
export function isIndexableEnvironment(): boolean {
    return PRODUCTION.has(process.env.SITE_ENV?.trim().toLowerCase() ?? '');
}
