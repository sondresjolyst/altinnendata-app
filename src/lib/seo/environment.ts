/** Values of `SITE_ENV` that name the live site. `prod` is what the deploy workflow passes. */
const PRODUCTION = new Set(['production', 'prod', '']);

/**
 * Whether this deployment is the one search engines should index.
 *
 * Set from `SITE_ENV`, which the deploy workflow fills from the environment it is already
 * building for. An unset value counts as production, so a variable that never reaches a
 * deployment cannot be what removes the live site from Google — a failure that takes weeks to
 * undo, against leaving a test host crawlable, which is merely today's situation.
 */
export function isIndexableEnvironment(): boolean {
    return PRODUCTION.has(process.env.SITE_ENV?.trim().toLowerCase() ?? '');
}
