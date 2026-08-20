import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import "../globals.css";
import Providers from "../providers";
import Navbar from "./navbar";
import Footer from "./footer";
import { publicGetOptional } from "@/lib/publicApi";
import { Branding } from "@/services/brandingService";
import { LOCALES, LOCALE_TAGS, isLocale, type Locale } from "@/i18n/config";
import { siteMetadata } from "@/lib/seo/metadata";
import JsonLd from "@/components/JsonLd";
import { organizationNode, webSiteNode } from "@/lib/seo/schema/organization";
import { getCompanyInfo } from "@/lib/companyInfo";
import { DictionaryProvider } from "@/i18n/DictionaryProvider";

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

    const [branding, company] = await Promise.all([
        publicGetOptional<Branding>("/branding").then(value => value ?? {}),
        getCompanyInfo(),
    ]);

    return (
        <html lang={LOCALE_TAGS[locale as Locale]}>
            <Script src="/register-sw.js" />
            {/* Business and site identity, on every page so page-scoped nodes can reference them. */}
            <JsonLd nodes={[organizationNode(company), webSiteNode(locale)]} />
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
