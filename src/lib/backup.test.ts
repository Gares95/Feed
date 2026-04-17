import { describe, it, expect } from "vitest";
import { validateBackup, BACKUP_VERSION, type BackupData } from "./backup";

const minimalBackup: BackupData = {
  version: BACKUP_VERSION,
  exportedAt: "2026-04-17T12:00:00.000Z",
  folders: [],
  feeds: [],
  articles: [],
  highlights: [],
  settings: [],
};

describe("validateBackup", () => {
  it("accepts a valid minimal backup", () => {
    expect(validateBackup(minimalBackup)).toBe(true);
  });

  it("accepts a backup with data", () => {
    const backup: BackupData = {
      ...minimalBackup,
      folders: [
        {
          id: "f1",
          name: "Tech",
          position: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      feeds: [
        {
          id: "feed1",
          title: "Example",
          url: "https://blog.test/feed.xml",
          siteUrl: null,
          description: null,
          favicon: null,
          lastFetched: null,
          errorCount: 0,
          refreshInterval: null,
          folderId: "f1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    expect(validateBackup(backup)).toBe(true);
  });

  it("rejects null", () => {
    expect(validateBackup(null)).toBe(false);
  });

  it("rejects non-object", () => {
    expect(validateBackup("string")).toBe(false);
    expect(validateBackup(42)).toBe(false);
  });

  it("rejects wrong version", () => {
    expect(validateBackup({ ...minimalBackup, version: 2 })).toBe(false);
    expect(validateBackup({ ...minimalBackup, version: 0 })).toBe(false);
  });

  it("rejects missing exportedAt", () => {
    const { exportedAt: _, ...rest } = minimalBackup;
    expect(validateBackup(rest)).toBe(false);
  });

  it("rejects missing required arrays", () => {
    const { folders: _, ...noFolders } = minimalBackup;
    expect(validateBackup(noFolders)).toBe(false);

    const { articles: __, ...noArticles } = minimalBackup;
    expect(validateBackup(noArticles)).toBe(false);

    const { highlights: ___, ...noHighlights } = minimalBackup;
    expect(validateBackup(noHighlights)).toBe(false);
  });

  it("rejects arrays replaced with non-arrays", () => {
    expect(validateBackup({ ...minimalBackup, feeds: "not-an-array" })).toBe(
      false,
    );
    expect(validateBackup({ ...minimalBackup, settings: null })).toBe(false);
  });
});
