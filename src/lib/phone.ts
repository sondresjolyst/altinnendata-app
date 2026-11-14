import { normalizeNoPhone } from '@sjolystinnovation/app-kit/validation';

/**
 * A phone number from the checkout in E.164, such as `+4712345678`, for TikTok's Advanced Matching. It reads the number
 * as the checkout's own check does, so TikTok gets the Norwegian number the form accepted. Anything the form refuses
 * gives undefined, so no guess is sent.
 */
export function toE164(raw: string | null | undefined): string | undefined {
    const digits = normalizeNoPhone(raw);
    return digits ? `+${digits}` : undefined;
}
