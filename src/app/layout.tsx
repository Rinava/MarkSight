import type { Metadata } from "next";
import { Nunito, Fira_Code } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "sonner";

const nunito = Nunito({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300","400","500","600","700","800","900"],
});

const firaCode = Fira_Code({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["300","400","500","600","700"],
});

export const metadata: Metadata = {
  title: "MarkSight",
  description: "Markdown Preview & Exporter",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunito.variable} ${firaCode.variable} antialiased min-h-dvh bg-background text-foreground`}>
        <ThemeProvider>
          <SidebarProvider>
            <div className="flex min-h-dvh flex-col">
              <header className="flex items-center justify-between px-4 py-3 border-b">
                <Logo />
                <ThemeToggle />
              </header>
              <Toaster />
              <main className="flex-1">{children}</main>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
