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

  const feed = (overrides: Record<string, unknown>) => ({
    id: "feed1",
    title: "T",
    url: "https://blog.test/feed.xml",
    siteUrl: null,
    description: null,
    favicon: null,
    lastFetched: null,
    errorCount: 0,
    refreshInterval: null,
    folderId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });
  const article = (overrides: Record<string, unknown>) => ({
    id: "a1",
    feedId: "feed1",
    guid: "g",
    title: "t",
    link: "https://blog.test/post",
    content: "",
    summary: null,
    author: null,
    imageUrl: null,
    publishedAt: "2026-01-01T00:00:00.000Z",
    isRead: false,
    readAt: null,
    isStarred: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });

  it("rejects feeds with non-http(s) url", () => {
    expect(
      validateBackup({
        ...minimalBackup,
        feeds: [feed({ url: "file:///etc/passwd" })],
      }),
    ).toBe(false);
    expect(
      validateBackup({
        ...minimalBackup,
        feeds: [feed({ url: "javascript:alert(1)" })],
      }),
    ).toBe(false);
  });

  it("rejects feeds with malformed siteUrl", () => {
    expect(
      validateBackup({
        ...minimalBackup,
        feeds: [feed({ siteUrl: "not a url" })],
      }),
    ).toBe(false);
  });

  it("accepts feeds with null siteUrl and empty-string siteUrl", () => {
    expect(
      validateBackup({
        ...minimalBackup,
        feeds: [feed({ siteUrl: null })],
      }),
    ).toBe(true);
    expect(
      validateBackup({
        ...minimalBackup,
        feeds: [feed({ siteUrl: "" })],
      }),
    ).toBe(true);
  });

  it("rejects articles with non-http(s) link or imageUrl", () => {
    expect(
      validateBackup({
        ...minimalBackup,
        feeds: [feed({})],
        articles: [article({ link: "javascript:alert(1)" })],
      }),
    ).toBe(false);
    expect(
      validateBackup({
        ...minimalBackup,
        feeds: [feed({})],
        articles: [article({ imageUrl: "data:image/png;base64,AAAA" })],
      }),
    ).toBe(false);
  });

  it("rejects a feed entry that is not an object", () => {
    expect(
      validateBackup({ ...minimalBackup, feeds: ["not-an-object"] }),
    ).toBe(false);
    expect(
      validateBackup({ ...minimalBackup, feeds: [null] }),
    ).toBe(false);
  });
});
