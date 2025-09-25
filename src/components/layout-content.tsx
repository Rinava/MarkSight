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
    <div className="flex min-h-dvh">
      <SidebarInset>
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </SidebarInset>
      <AppSidebar content={content} />
      <Toaster />
    </div>
  );
}
