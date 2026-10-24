import { requireEnv } from '@sjolystinnovation/app-kit';
import type { ConsentOptions } from '@sjolystinnovation/app-kit/consent';

/**
 * The rules a stored consent choice must meet, passed to the banner, the pixel and every read of the choice.
 * Change noticeVersion when the cookie page changes what the visitor agreed to, so every visitor is asked again.
 */
export const CONSENT_OPTIONS: ConsentOptions = { noticeVersion: '2026-10-meta' };

/** The API's consent log. The banner posts every choice there, with the random consent ID and the notice version. */
export const CONSENT_LOG_ENDPOINT = `${requireEnv('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL)}/consent`;
