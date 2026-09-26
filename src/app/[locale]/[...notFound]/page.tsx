import { notFound } from 'next/navigation';

/** Any path under a locale that no other route claims. Renders the locale's not-found page. */
export default function CatchAll() {
    notFound();
}
