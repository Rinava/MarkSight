import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ContentProvider } from "@/contexts/content-context";
import { SkillMetaProvider } from "@/contexts/skill-meta-context";
import { Toaster } from "@/components/ui/sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://marksight.laramateo.com"),
  title: {
    default: "MarkSight - Advanced Markdown Editor with Real-time Preview",
    template: "%s | MarkSight - Markdown Editor"
  },
  description: "Free, open source markdown editor with real-time preview, smart toolbar, keyboard shortcuts, document outline, and HTML/PDF export.",
  keywords: [
    "markdown editor",
    "markdown preview",
    "real-time preview",
    "HTML export",
    "PDF export",
    "open source markdown editor",
    "free markdown editor",
  ],
  authors: [{ name: "Lara Mateo", url: "https://laramateo.com" }],
  creator: "Lara Mateo",
  publisher: "laramateo.com",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://marksight.laramateo.com",
    siteName: "MarkSight",
    title: "MarkSight - Advanced Markdown Editor with Real-time Preview",
    description: "Open source markdown editor with real-time preview, smart toolbar, keyboard shortcuts, document outline, and export options. Free to use and contribute to on GitHub.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MarkSight - Advanced Markdown Editor with Real-time Preview",
    description: "Open source markdown editor with real-time preview, smart toolbar, keyboard shortcuts, and export options. Free to use and contribute to on GitHub.",
    creator: "@laramateo",
  },
  alternates: {
    canonical: "https://marksight.laramateo.com",
  },
  category: "productivity",
  classification: "Web Application",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f8f2" },
    { media: "(prefers-color-scheme: dark)", color: "#19231a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "MarkSight",
    "description": "Open source markdown editor with real-time preview, smart toolbar, keyboard shortcuts, document outline, and export options. Free to use and contribute to on GitHub.",
    "url": "https://marksight.laramateo.com",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Person",
      "name": "Lara Mateo",
      "url": "https://laramateo.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "laramateo.com",
      "url": "https://laramateo.com"
    },
    "featureList": [
      "Real-time markdown preview",
      "Smart formatting toolbar",
      "Keyboard shortcuts",
      "Document outline navigation",
      "HTML export",
      "PDF export",
      "Dark/light theme toggle",
      "Local storage persistence",
      "Open source and free",
      "GitHub collaboration"
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* JSON-LD is non-executable data, so CSP script-src does not apply and
            no nonce is needed (a manual nonce also breaks hydration). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh bg-background text-foreground`}
      >
        <ThemeProvider nonce={nonce}>
          <ContentProvider>
            <SkillMetaProvider>
              {children}
              <Toaster position="bottom-center" />
            </SkillMetaProvider>
          </ContentProvider>
        </ThemeProvider>
        <Analytics />
        <GoogleAnalytics gaId="G-YYGPWZ1WF7" />
      </body>
    </html>
  );
}
