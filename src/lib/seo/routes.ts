/**
 * Paths below the locale segment that must never be indexed or crawled.
 *
 * Each one needs a route-group layout setting `robots: NOINDEX`: a robots.txt rule stops
 * crawling but does not remove a page Google already knows about.
 */
export const PRIVATE_PATHS = ['/admin', '/login', '/reset-password', '/profile'] as const;

/** Paths outside the locale segments that should not be crawled. */
export const PRIVATE_ROOT_PATHS = ['/api/'] as const;
