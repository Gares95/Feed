"use client";

import { Rss, FileText, BookOpen } from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ElementType;
  message: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Icon className="h-8 w-8" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function AppShell() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        {/* Sidebar — feed list */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          collapsible
          className="bg-card"
        >
          <div className="flex h-full flex-col">
            <div className="flex h-12 items-center border-b px-4">
              <h1 className="text-sm font-semibold tracking-tight">Feed</h1>
            </div>
            <div className="flex-1 overflow-auto">
              <EmptyState icon={Rss} message="No feeds yet" />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Article list */}
        <ResizablePanel
          defaultSize={30}
          minSize={20}
          className="bg-background"
        >
          <div className="flex h-full flex-col">
            <div className="flex h-12 items-center border-b px-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Articles
              </h2>
            </div>
            <div className="flex-1 overflow-auto">
              <EmptyState icon={FileText} message="No articles" />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Reading pane */}
        <ResizablePanel defaultSize={50} minSize={30} className="bg-background">
          <div className="flex h-full flex-col">
            <div className="flex h-12 items-center border-b px-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Reader
              </h2>
            </div>
            <div className="flex-1 overflow-auto">
              <EmptyState icon={BookOpen} message="Select an article to read" />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
