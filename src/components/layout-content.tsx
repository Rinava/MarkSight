"use client";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { useContent } from "@/contexts/content-context";
import { Toaster } from "sonner";
import { SidebarTrigger, SidebarInset } from "./ui/sidebar";

interface LayoutContentProps {
  children: React.ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  const { content } = useContent();

  return (
    <div className="flex min-h-dvh bg-background">
      <SidebarInset className="flex-1">
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SidebarTrigger className="ml-2" />
          </div>
        </header>
        <main className="flex-1 min-h-0">{children}</main>
      </SidebarInset>
      <AppSidebar content={content} />
      <Toaster />
    </div>
  );
}
