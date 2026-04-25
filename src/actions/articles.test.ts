import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      update: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  markRead,
  markUnread,
  toggleStar,
  markAllRead,
} from "./articles";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("markRead", () => {
  it("sets isRead=true and stamps readAt", async () => {
    await markRead("a1");
    const call = vi.mocked(prisma.article.update).mock.calls[0][0];
    expect(call.where).toEqual({ id: "a1" });
    expect(call.data?.isRead).toBe(true);
    expect(call.data?.readAt).toBeInstanceOf(Date);
  });
});

describe("markUnread", () => {
  it("sets isRead=false and clears readAt", async () => {
    await markUnread("a1");
    expect(prisma.article.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { isRead: false, readAt: null },
    });
  });
});

describe("toggleStar", () => {
  it("flips isStarred from false to true", async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      isStarred: false,
    } as never);

    await toggleStar("a1");

    expect(prisma.article.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { isStarred: true },
    });
  });

  it("throws if article does not exist", async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null);
    await expect(toggleStar("missing")).rejects.toThrow("Article not found");
    expect(prisma.article.update).not.toHaveBeenCalled();
  });
});

describe("markAllRead", () => {
  it("scopes to a feed when feedId is provided", async () => {
    await markAllRead("feed1");
    const call = vi.mocked(prisma.article.updateMany).mock.calls[0][0];
    expect(call.where).toEqual({ feedId: "feed1", isRead: false });
  });

  it("targets all unread articles when feedId is omitted", async () => {
    await markAllRead();
    const call = vi.mocked(prisma.article.updateMany).mock.calls[0][0];
    expect(call.where).toEqual({ isRead: false });
  });
});
