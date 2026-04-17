"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type RestoreState = "idle" | "confirm" | "restoring" | "success" | "error";

export function BackupSettings() {
  const [restoreState, setRestoreState] = useState<RestoreState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setRestoreState(file ? "confirm" : "idle");
    setErrorMsg("");
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

            {restoreState === "confirm" && selectedFile && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      This will replace all current data
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {selectedFile.name}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRestore}
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
