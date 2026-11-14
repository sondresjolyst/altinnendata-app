/**
 * A phone number from the checkout in E.164, such as `+4712345678`, for TikTok's Advanced Matching. Spaces, dashes,
 * dots and brackets are dropped. Eight digits are a Norwegian number and get `+47`. A number with `+`, with `00` before
 * the country code, or with `47` before eight digits keeps its country code. Anything else gives undefined, so no
 * guess is sent.
 */
export function toE164(raw: string | null | undefined): string | undefined {
    const compact = (raw ?? '').replace(/[\s\-.()]/g, '');
    if (/^[0-9]{8}$/.test(compact)) return `+47${compact}`;
    if (/^47[0-9]{8}$/.test(compact)) return `+${compact}`;
    const international = /^(?:\+|00)([1-9][0-9]{6,14})$/.exec(compact);
    return international ? `+${international[1]}` : undefined;
}
