"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiErrorCode } from '@sjolystinnovation/app-kit/api';
import { Alert } from '@sjolystinnovation/app-kit/ui';
import { localeHref, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import ShopService from '@/services/shopService';
import VippsButtonArt, { VIPPS_BUTTON, VIPPS_DISABLED } from './VippsButtonArt';

/** The Vipps button on the pay page. It starts a new payment for the order and sends the buyer to Vipps. */
export default function PayLinkButton({ token, locale }: { token: string; locale: Locale }) {
    const dict = getDictionary(locale);
    const text = dict.shop.payLink;
    const [submitting, setSubmitting] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);
    const [invalid, setInvalid] = useState(false);

    // Back from the Vipps page can restore this page from the bfcache with the button still waiting.
    useEffect(() => {
        const reset = (event: PageTransitionEvent) => {
            if (event.persisted) setSubmitting(false);
        };
        window.addEventListener('pageshow', reset);
        return () => window.removeEventListener('pageshow', reset);
    }, []);

    const pay = async () => {
        setFailure(null);
        setSubmitting(true);
        try {
            const { redirectUrl } = await ShopService.payWithLink(token);
            window.location.assign(redirectUrl);
        } catch (err) {
            const code = apiErrorCode(err);
            if (code === 'paymentLinkInvalid') setInvalid(true);
            setFailure(code !== undefined && Object.hasOwn(text.apiErrors, code) ? text.apiErrors[code as keyof typeof text.apiErrors] : dict.shop.failed);
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            {failure && (
                <Alert variant="error">
                    {failure}
                    {invalid && (
                        <>
                            {' '}
                            <Link href={localeHref(locale, '/contact')} className="font-semibold underline">{text.contact}</Link>
                        </>
                    )}
                </Alert>
            )}
            {/* A link that turned out invalid keeps the button in place, disabled. */}
            <button
                type="button"
                disabled={submitting || invalid}
                aria-busy={submitting}
                onClick={() => void pay()}
                className={`${VIPPS_BUTTON} ${submitting || invalid ? VIPPS_DISABLED : ''}`}
            >
                <VippsButtonArt verb="pay" locale={locale} alt={dict.shop.pay} />
            </button>
            <p role="status" className="sr-only">{submitting ? dict.shop.paying : ''}</p>
        </div>
    );
}
