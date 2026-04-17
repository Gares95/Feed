import { prisma } from "./prisma";

export const BACKUP_VERSION = 1;

export interface BackupData {
  version: number;
  exportedAt: string;
  folders: FolderBackup[];
  feeds: FeedBackup[];
  articles: ArticleBackup[];
  highlights: HighlightBackup[];
  settings: SettingBackup[];
}

interface FolderBackup {
  id: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface FeedBackup {
  id: string;
  title: string;
  url: string;
  siteUrl: string | null;
  description: string | null;
  favicon: string | null;
  lastFetched: string | null;
  errorCount: number;
  refreshInterval: number | null;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ArticleBackup {
  id: string;
  feedId: string;
  guid: string;
  title: string;
  link: string;
  content: string;
  summary: string | null;
  author: string | null;
  imageUrl: string | null;
  publishedAt: string;
  isRead: boolean;
  readAt: string | null;
  isStarred: boolean;
  createdAt: string;
}

interface HighlightBackup {
  id: string;
  articleId: string;
  text: string;
  textOffset: number;
  note: string | null;
  createdAt: string;
}

interface SettingBackup {
  key: string;
  value: string;
}

export async function createBackup(): Promise<BackupData> {
  const [folders, feeds, articles, highlights, settings] = await Promise.all([
    prisma.folder.findMany({ orderBy: { position: "asc" } }),
    prisma.feed.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.article.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.highlight.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.setting.findMany(),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      position: f.position,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    feeds: feeds.map((f) => ({
      id: f.id,
      title: f.title,
      url: f.url,
      siteUrl: f.siteUrl,
      description: f.description,
      favicon: f.favicon,
      lastFetched: f.lastFetched?.toISOString() ?? null,
      errorCount: f.errorCount,
      refreshInterval: f.refreshInterval,
      folderId: f.folderId,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    articles: articles.map((a) => ({
      id: a.id,
      feedId: a.feedId,
      guid: a.guid,
      title: a.title,
      link: a.link,
      content: a.content,
      summary: a.summary,
      author: a.author,
      imageUrl: a.imageUrl,
      publishedAt: a.publishedAt.toISOString(),
      isRead: a.isRead,
      readAt: a.readAt?.toISOString() ?? null,
      isStarred: a.isStarred,
      createdAt: a.createdAt.toISOString(),
    })),
    highlights: highlights.map((h) => ({
      id: h.id,
      articleId: h.articleId,
      text: h.text,
      textOffset: h.textOffset,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    })),
    settings: settings.map((s) => ({ key: s.key, value: s.value })),
  };
}

export function validateBackup(data: unknown): data is BackupData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d.version !== BACKUP_VERSION) return false;
  if (typeof d.exportedAt !== "string") return false;
  if (!Array.isArray(d.folders)) return false;
  if (!Array.isArray(d.feeds)) return false;
  if (!Array.isArray(d.articles)) return false;
  if (!Array.isArray(d.highlights)) return false;
  if (!Array.isArray(d.settings)) return false;
  return true;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export async function restoreBackup(data: BackupData): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await tx.highlight.deleteMany();
      await tx.article.deleteMany();
      await tx.feed.deleteMany();
      await tx.folder.deleteMany();
      await tx.setting.deleteMany();

      if (data.folders.length > 0) {
        await tx.folder.createMany({
          data: data.folders.map((f) => ({
            id: f.id,
            name: f.name,
            position: f.position,
            createdAt: new Date(f.createdAt),
            updatedAt: new Date(f.updatedAt),
          })),
        });
      }

      if (data.feeds.length > 0) {
        await tx.feed.createMany({
          data: data.feeds.map((f) => ({
            id: f.id,
            title: f.title,
            url: f.url,
            siteUrl: f.siteUrl,
            description: f.description,
            favicon: f.favicon,
            lastFetched: f.lastFetched ? new Date(f.lastFetched) : null,
            errorCount: f.errorCount,
            refreshInterval: f.refreshInterval,
            folderId: f.folderId,
            createdAt: new Date(f.createdAt),
            updatedAt: new Date(f.updatedAt),
          })),
        });
      }

      for (const batch of chunk(data.articles, 500)) {
        await tx.article.createMany({
          data: batch.map((a) => ({
            id: a.id,
            feedId: a.feedId,
            guid: a.guid,
            title: a.title,
            link: a.link,
            content: a.content,
            summary: a.summary,
            author: a.author,
            imageUrl: a.imageUrl,
            publishedAt: new Date(a.publishedAt),
            isRead: a.isRead,
            readAt: a.readAt ? new Date(a.readAt) : null,
            isStarred: a.isStarred,
            createdAt: new Date(a.createdAt),
          })),
        });
      }

      if (data.highlights.length > 0) {
        await tx.highlight.createMany({
          data: data.highlights.map((h) => ({
            id: h.id,
            articleId: h.articleId,
            text: h.text,
            textOffset: h.textOffset,
            note: h.note,
            createdAt: new Date(h.createdAt),
          })),
        });
      }

      if (data.settings.length > 0) {
        await tx.setting.createMany({ data: data.settings });
      }
    },
    { timeout: 120_000 },
  );
}
