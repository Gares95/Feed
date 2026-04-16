"use client";

import { useRef, useState } from "react";
import { ArrowDownUp, Upload, Download, FileJson, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
} from "@/components/ui/menu";

interface OpmlActionsProps {
  onImportComplete: () => void;
}

export function OpmlActions({ onImportComplete }: OpmlActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/opml", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Import failed");
        return;
      }

      const { results } = data;
      alert(
        `Import complete: ${results.added} added, ${results.skipped} skipped (already exist), ${results.failed} failed`,
      );
      onImportComplete();
    } catch {
      alert("Failed to import OPML file");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".opml,.xml"
        className="hidden"
        onChange={handleImport}
      />
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={isImporting}
              title="Import / Export"
            />
          }
        >
          <ArrowDownUp className="h-4 w-4" />
        </MenuTrigger>
        <MenuContent>
          <MenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload />
            Import OPML…
          </MenuItem>
          <MenuLinkItem href="/api/opml" download="feed-subscriptions.opml">
            <Download />
            Export OPML
          </MenuLinkItem>
          <MenuSeparator />
          <MenuLinkItem
            href="/api/export/starred?format=md"
            download="starred-articles.md"
          >
            <FileText />
            Export starred as Markdown
          </MenuLinkItem>
          <MenuLinkItem
            href="/api/export/starred?format=json"
            download="starred-articles.json"
          >
            <FileJson />
            Export starred as JSON
          </MenuLinkItem>
        </MenuContent>
      </Menu>
    </>
  );
}
