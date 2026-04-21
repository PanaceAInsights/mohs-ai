import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://mohs.panacea-i.com",
  ),
  title: {
    default: "MOHS AI — Predict ≥13 sections in Mohs surgery",
    template: "%s · MOHS AI",
  },
  description:
    "Evidence-based clinical decision support for Mohs micrographic surgery. Ensemble ML predicts which cases will require ≥13 tissue sections. n=408, AUC 0.891.",
  authors: [
    { name: "Yagiz Alp Aksoy" },
    { name: "Simon Lee" },
    { name: "Gilberto Moreno-Bonilla" },
  ],
  keywords: [
    "Mohs micrographic surgery",
    "MMS",
    "machine learning",
    "clinical decision support",
    "dermatology",
    "keratinocyte cancer",
    "BCC",
    "SCC",
  ],
  openGraph: {
    title: "MOHS AI — Predict ≥13 sections in Mohs surgery",
    description:
      "30 ML algorithms trained on 408 procedures. Live predictor, SHAP explainability, and clinical tools for Mohs surgery planning.",
    type: "website",
    siteName: "MOHS AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "MOHS AI",
    description:
      "Evidence-based ML for Mohs micrographic surgery planning.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "oklch(0.13 0.018 240)" },
    { media: "(prefers-color-scheme: light)", color: "oklch(0.99 0.004 240)" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delay={200}>
            <div className="flex min-h-screen flex-col">
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-sm focus:text-primary-foreground"
              >
                Skip to content
              </a>
              <SiteHeader />
              <main id="main" className="flex-1">
                {children}
              </main>
              <SiteFooter />
            </div>
            <ChatWidget />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
