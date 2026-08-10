'use client';

import Link from 'next/link';

export default function SmartLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
    if (href.startsWith('#')) {
        const id = href.slice(1);
        return (
            <a
                href={href}
                className={className}
                onClick={(e) => {
                    const el = document.getElementById(id);
                    if (el) {
                        e.preventDefault();
                        el.scrollIntoView({ behavior: 'smooth' });
                        history.replaceState(null, '', href);
                    }
                }}
            >
                {children}
            </a>
        );
    }
    return (
        <Link href={href} className={className}>
            {children}
        </Link>
    );
}
