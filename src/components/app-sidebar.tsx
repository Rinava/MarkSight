"use client";

import { DocumentOutline } from "@/components/document-outline";
import { MarkdownHints } from "@/components/markdown-hints";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  content: string;
  onHeadingClick?: (headingId: string) => void;
}

export function AppSidebar({ content, onHeadingClick }: AppSidebarProps) {
  return (
    <Sidebar side="right" variant="floating">
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between p-2">
          <h2 className="text-lg font-semibold text-sidebar-foreground">
            MarkSight
          </h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Contents</SidebarGroupLabel>
          <SidebarGroupContent>
            <DocumentOutline
              content={content}
              onHeadingClick={onHeadingClick}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Help</SidebarGroupLabel>
          <SidebarGroupContent>
            <MarkdownHints />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="p-2 text-xs text-sidebar-foreground/70 text-center">
          Press
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-sidebar-foreground bg-sidebar-accent border border-sidebar-border rounded-md">
            ⌘
          </kbd>
          +
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-sidebar-foreground bg-sidebar-accent border border-sidebar-border rounded-md">
            B
          </kbd>
          to toggle
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
