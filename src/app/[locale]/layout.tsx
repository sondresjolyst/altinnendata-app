import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import "../globals.css";
import Providers from "../providers";
import Navbar from "./navbar";
import Footer from "./footer";
import { publicGetOptional } from "@/lib/publicApi";
import { REVALIDATE_TARGETS } from "@/lib/cacheTags";
import { Branding } from "@/services/brandingService";
import { LOCALES, LOCALE_TAGS, isLocale, type Locale } from "@/i18n/config";
import { siteMetadata } from "@/lib/seo/metadata";
import JsonLd from "@/components/JsonLd";
import { organizationNode, webSiteNode } from "@/lib/seo/schema/organization";
import { getCompanyInfo } from "@/lib/companyInfo";
import { DictionaryProvider } from "@/i18n/DictionaryProvider";
import { getDictionary } from "@/i18n/dictionaries";

export const viewport: Viewport = {
    themeColor: "#00887a",
};

export function generateStaticParams() {
    return LOCALES.map(locale => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    return siteMetadata(locale);
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

    const dict = getDictionary(locale);
    const [branding, company] = await Promise.all([
        publicGetOptional<Branding>("/branding", { tags: [REVALIDATE_TARGETS.branding] }),
        getCompanyInfo(),
    ]);

    return (
        <html lang={LOCALE_TAGS[locale as Locale]}>
            {/* Both inside body: React only accepts head or body as children of html. */}
            <body className="min-h-screen flex flex-col bg-background text-foreground">
                <Script src="/register-sw.js" />
                {/* Business and site identity, on every page so page-scoped nodes can reference them. */}
                <JsonLd nodes={[organizationNode(company), webSiteNode(locale)]} />
                <DictionaryProvider locale={locale}>
                    {/* Undefined when the API was unreachable, so the client fetches it instead. */}
                    <Providers initialBranding={branding ?? undefined}>
                        {/* Visible only when focused, so keyboard users can jump past the navbar. */}
                        <a
                            href="#main"
                            className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:ring-2 focus:ring-primary"
                        >
                            {dict.nav.skipToContent}
                        </a>
                        <Navbar />
                        <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
                        <Footer company={company} />
                    </Providers>
                </DictionaryProvider>
            </body>
        </html>
    );
}
