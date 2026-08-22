/**
 * Brand colours as literals: the share image renders outside the browser and cannot read CSS
 * custom properties. Keep in sync with `--color-*` in `src/app/globals.css`.
 */
export const BRAND = {
    background: '#131313',
    foreground: '#ffffff',
    primary: '#00887a',
} as const;
