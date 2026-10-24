/** The mailto: href for an email address of a plain shape, or null so the address shows as text. */
export function mailtoHref(email: string): string | null {
    return /^[^\s@?&]+@[^\s@?&]+$/.test(email) ? `mailto:${email}` : null;
}

/**
 * The tel: href for a phone number, without a "(0)" trunk prefix, spaces, dashes and dots. It is null when the
 * rest is not 8 to 15 digits with an optional leading +, so the number shows as text.
 */
export function telHref(phone: string): string | null {
    const digits = phone.replace(/\(0\)/g, '').replace(/[\s.-]/g, '');
    return /^\+?\d{8,15}$/.test(digits) ? `tel:${digits}` : null;
}
