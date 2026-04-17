import { NextRequest, NextResponse } from "next/server";
import { createBackup, validateBackup, restoreBackup } from "@/lib/backup";

export async function GET() {
  const backup = await createBackup();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="feed-backup-${date}.json"`,
    },
  });
}

export async function POST(request: NextRequest) {
  let data: unknown;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
  }

  if (!validateBackup(data)) {
    return NextResponse.json(
      {
        error:
          "Invalid backup format or version mismatch. Only version 1 backups are supported.",
      },
      { status: 400 },
    );
  }

  try {
    await restoreBackup(data);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Restore failed:", err);
    return NextResponse.json({ error: "Restore failed" }, { status: 500 });
  }
}
