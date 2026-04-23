"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type RestoreState =
  | "idle"
  | "parsing"
  | "confirm"
  | "parse-error"
  | "restoring"
  | "success"
  | "error";

interface BackupPreview {
  version: number | null;
  exportedAt: string | null;
  folders: number;
  feeds: number;
  articles: number;
  highlights: number;
  settings: number;
}

const EXPECTED_VERSION = 1;

function parsePreview(text: string): BackupPreview | null {
  try {
    const data = JSON.parse(text);
    if (typeof data !== "object" || data === null) return null;
    const d = data as Record<string, unknown>;
    return {
      version: typeof d.version === "number" ? d.version : null,
      exportedAt: typeof d.exportedAt === "string" ? d.exportedAt : null,
      folders: Array.isArray(d.folders) ? d.folders.length : 0,
      feeds: Array.isArray(d.feeds) ? d.feeds.length : 0,
      articles: Array.isArray(d.articles) ? d.articles.length : 0,
      highlights: Array.isArray(d.highlights) ? d.highlights.length : 0,
      settings: Array.isArray(d.settings) ? d.settings.length : 0,
    };
  } catch {
    return null;
  }
}

function formatExportedAt(iso: string | null): string {
  if (!iso) return "unknown date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown date";
  return d.toLocaleString();
}

export function BackupSettings() {
  const [restoreState, setRestoreState] = useState<RestoreState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setErrorMsg("");
    setPreview(null);

    if (!file) {
      setRestoreState("idle");
      return;
    }

    setRestoreState("parsing");
    let text: string;
    try {
      text = await file.text();
    } catch {
      setRestoreState("parse-error");
      setErrorMsg("Could not read the selected file.");
      return;
    }

    const p = parsePreview(text);
    if (!p) {
      setRestoreState("parse-error");
      setErrorMsg(
        "This file isn't a valid Feed backup. Expected a JSON document with folders, feeds, articles, highlights, and settings arrays.",
      );
      return;
    }
    setPreview(p);
    setRestoreState("confirm");
  }

  async function handleRestore() {
    if (!selectedFile) return;
    setRestoreState("restoring");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/backup", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setRestoreState("error");
        setErrorMsg(json.error ?? "Unknown error");
      } else {
        setRestoreState("success");
      }
    } catch {
      setRestoreState("error");
      setErrorMsg("Network error — check the console for details.");
    }
  }

  function handleCancel() {
    setRestoreState("idle");
    setSelectedFile(null);
    setPreview(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Backup & restore</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Export all feeds, articles, highlights, and settings to a JSON file.
        Restoring replaces all current data.
      </p>

      <div className="mt-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Download backup</p>
            <p className="text-xs text-muted-foreground">
              Feeds, articles, highlights, and settings
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/api/backup")}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium">Restore from backup</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Replaces all current data. This cannot be undone.
          </p>

          <div className="mt-3">
            <input
              ref={fileInputRef}
              id="restore-file-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />

            {restoreState === "idle" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Choose backup file
              </Button>
            )}

            {restoreState === "parsing" && (
              <p className="text-sm text-muted-foreground">
                Reading backup file…
              </p>
            )}

            {restoreState === "parse-error" && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{errorMsg}</p>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Choose a different file
                </Button>
              </div>
            )}

            {restoreState === "confirm" && selectedFile && preview && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-destructive">
                      This will replace all current data
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {selectedFile.name}
                    </p>

                    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Exported</dt>
                        <dd>{formatExportedAt(preview.exportedAt)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Feeds</dt>
                        <dd>{preview.feeds.toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Folders</dt>
                        <dd>{preview.folders.toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Articles</dt>
                        <dd>{preview.articles.toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Highlights</dt>
                        <dd>{preview.highlights.toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Settings</dt>
                        <dd>{preview.settings.toLocaleString()}</dd>
                      </div>
                    </dl>

                    {preview.version !== EXPECTED_VERSION && (
                      <div className="mt-3 space-y-1 text-xs text-destructive">
                        <p>
                          This backup uses format v{String(preview.version)},
                          but this version of Feed reads format v
                          {EXPECTED_VERSION}.
                        </p>
                        <p>
                          These formats aren&apos;t compatible — restoring
                          could corrupt your database, so it&apos;s blocked.
                          Run the restore in a matching version of Feed, or
                          export a fresh backup from this installation.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRestore}
                    disabled={preview.version !== EXPECTED_VERSION}
                  >
                    Restore
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {restoreState === "restoring" && (
              <p className="text-sm text-muted-foreground">Restoring…</p>
            )}

            {restoreState === "success" && (
              <div className="space-y-2">
                <p className="text-sm text-green-400">
                  Restore complete. Reload to see your data.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = "/")}
                >
                  Go to reader
                </Button>
              </div>
            )}

            {restoreState === "error" && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{errorMsg}</p>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Try again
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
