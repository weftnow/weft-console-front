import { esES } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/shared/i18n/I18nProvider";
import { getI18n } from "@/shared/i18n/get-locale";
import { PoweredByWeft } from "@/shared/ui/powered-by-weft";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.common.metadata.title, description: dict.common.metadata.description };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, dict } = await getI18n();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <ClerkProvider localization={locale === "es" ? esES : undefined}>
          <I18nProvider locale={locale} dictionary={dict}>
            {children}
            <footer className="weft-page-branding"><PoweredByWeft /></footer>
          </I18nProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
