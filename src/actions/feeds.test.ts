import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    feed: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    article: {
      upsert: vi.fn(),
    },
  },
}));
vi.mock("@/lib/feed-parser", () => ({ parseFeed: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { updateFeed, deleteFeed } from "./feeds";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateFeed", () => {
  it("updates the trimmed title", async () => {
    await updateFeed("feed1", { title: "  My Feed  " });
    expect(prisma.feed.update).toHaveBeenCalledWith({
      where: { id: "feed1" },
      data: { title: "My Feed" },
    });
  });

  it("rejects empty titles", async () => {
    await expect(updateFeed("feed1", { title: "   " })).rejects.toThrow(
      "Title cannot be empty",
    );
    expect(prisma.feed.update).not.toHaveBeenCalled();
  });

  it("updates refreshInterval (including null to clear)", async () => {
    await updateFeed("feed1", { refreshInterval: 60 });
    expect(prisma.feed.update).toHaveBeenLastCalledWith({
      where: { id: "feed1" },
      data: { refreshInterval: 60 },
    });

    await updateFeed("feed1", { refreshInterval: null });
    expect(prisma.feed.update).toHaveBeenLastCalledWith({
      where: { id: "feed1" },
      data: { refreshInterval: null },
    });
  });

  it("only writes provided fields", async () => {
    await updateFeed("feed1", {});
    expect(prisma.feed.update).toHaveBeenCalledWith({
      where: { id: "feed1" },
      data: {},
    });
  });
});

describe("deleteFeed", () => {
  it("deletes by id", async () => {
    await deleteFeed("feed1");
    expect(prisma.feed.delete).toHaveBeenCalledWith({ where: { id: "feed1" } });
  });
});

// refreshFeed / refreshDueFeeds / refreshAllFeeds are covered indirectly via
// integration: they orchestrate parseFeed (network) plus retention autoprune,
// which would require fixture HTML and a test database to exercise meaningfully.
// Skipped here; happy path is the smoke target only.
