"use client";

import { useRef, useState } from "react";
import { Upload, Download, FileJson, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex items-center gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept=".opml,.xml"
        className="hidden"
        onChange={handleImport}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        title="Import OPML"
      >
        <Upload className="h-4 w-4" />
      </Button>
      <a
        href="/api/opml"
        download="feed-subscriptions.opml"
        title="Export OPML"
      >
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Download className="h-4 w-4" />
        </Button>
      </a>
      <a
        href="/api/export/starred?format=md"
        download="starred-articles.md"
        title="Export starred (Markdown)"
      >
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <FileText className="h-4 w-4" />
        </Button>
      </a>
      <a
        href="/api/export/starred?format=json"
        download="starred-articles.json"
        title="Export starred (JSON)"
      >
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <FileJson className="h-4 w-4" />
        </Button>
      </a>
    </div>
  );
}
