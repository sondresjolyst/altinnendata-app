import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import "../globals.css";
import Providers from "../providers";
import Navbar from "./navbar";
import Footer from "./footer";
import { COMPANY } from "@/lib/company";
import { publicGet } from "@/lib/publicApi";
import { Branding } from "@/services/brandingService";
import { LOCALES, LOCALE_TAGS, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { DictionaryProvider } from "@/i18n/DictionaryProvider";

export function generateStaticParams() {
    return LOCALES.map(locale => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    const dict = getDictionary(locale);

    return {
        metadataBase: new URL(COMPANY.url),
        title: {
            default: `${COMPANY.name} — ${dict.meta.tagline}`,
            template: `%s — ${COMPANY.name}`,
        },
        description: dict.meta.description,
        manifest: "/manifest.json",
        alternates: {
            canonical: `/${locale}`,
            languages: Object.fromEntries(LOCALES.map(l => [LOCALE_TAGS[l], `/${l}`])),
        },
        robots: { index: true, follow: true },
        openGraph: {
            type: "website",
            siteName: COMPANY.name,
            url: `${COMPANY.url}/${locale}`,
            locale: LOCALE_TAGS[locale],
            title: `${COMPANY.name} — ${dict.meta.tagline}`,
            description: dict.meta.description,
        },
    };
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();

    const branding = await publicGet<Branding>("/branding") ?? {};

    return (
        <html lang={LOCALE_TAGS[locale as Locale]}>
            <Script src="/register-sw.js" />
            <body className="min-h-screen flex flex-col bg-background text-foreground">
                <DictionaryProvider locale={locale}>
                    <Providers initialBranding={branding}>
                        <Navbar />
                        <main className="flex-1">{children}</main>
                        <Footer />
                    </Providers>
                </DictionaryProvider>
            </body>
        </html>
    );
}
