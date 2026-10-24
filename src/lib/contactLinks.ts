/** The mailto: href for an address made only of the usual characters, or null so the address shows as text. */
export function mailtoHref(email: string): string | null {
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) ? `mailto:${email}` : null;
}

/**
 * The tel: href for a phone number, without a "(0)" trunk prefix, spaces, dashes and dots. It is null when the
 * rest is not 8 to 15 digits with an optional leading +, so the number shows as text.
 */
export function telHref(phone: string): string | null {
    const digits = phone.replace(/\(0\)/g, '').replace(/[\s.-]/g, '');
    return /^\+?\d{8,15}$/.test(digits) ? `tel:${digits}` : null;
}
