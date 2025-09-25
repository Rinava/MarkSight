import type { Metadata } from "next";
import { Nunito, Fira_Code } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ContentProvider } from "@/contexts/content-context";
import { LayoutContent } from "@/components/layout-content";

const nunito = Nunito({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const firaCode = Fira_Code({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://marksight.laramateo.com"),
  title: {
    default: "MarkSight - Advanced Markdown Editor with Real-time Preview",
    template: "%s | MarkSight - Markdown Editor"
  },
  description: "Open source markdown editor with real-time preview, smart toolbar, keyboard shortcuts, document outline, and export options. Free to use and contribute to on GitHub. Create beautiful documents with HTML and PDF export capabilities.",
  keywords: [
    "markdown editor",
    "markdown preview",
    "real-time preview",
    "markdown exporter",
    "HTML export",
    "PDF export",
    "document editor",
    "text editor",
    "markdown tool",
    "writing tool",
    "documentation tool",
    "markdown converter",
    "open source",
    "github",
    "collaborate",
    "contribute",
    "free markdown editor"
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
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "MarkSight - Markdown Editor with Real-time Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MarkSight - Advanced Markdown Editor with Real-time Preview",
    description: "Open source markdown editor with real-time preview, smart toolbar, keyboard shortcuts, and export options. Free to use and contribute to on GitHub.",
    images: ["/og-image.svg"],
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
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  other: {
    "msapplication-TileColor": "#000000",
    "theme-color": "#000000",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body
        className={`${nunito.variable} ${firaCode.variable} antialiased min-h-dvh bg-background text-foreground`}
      >
        <ThemeProvider>
          <ContentProvider>
            <SidebarProvider>
              <LayoutContent>{children}</LayoutContent>
            </SidebarProvider>
          </ContentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
