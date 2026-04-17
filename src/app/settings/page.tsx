import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRetentionConfig } from "@/actions/retention";
import { RetentionSettings } from "@/components/settings/RetentionSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const retentionConfig = await getRetentionConfig();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8">
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to reader
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </div>

        <RetentionSettings initial={retentionConfig} />
      </div>
    </div>
  );
}
