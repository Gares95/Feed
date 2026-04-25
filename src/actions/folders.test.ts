import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    folder: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    feed: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createFolder,
  renameFolder,
  deleteFolder,
  moveFeedToFolder,
} from "./folders";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createFolder", () => {
  it("creates a folder with trimmed name and current count as position", async () => {
    vi.mocked(prisma.folder.count).mockResolvedValue(3);
    vi.mocked(prisma.folder.create).mockResolvedValue({
      id: "f1",
      name: "Tech",
      position: 3,
    } as never);

    await createFolder("  Tech  ");

    expect(prisma.folder.create).toHaveBeenCalledWith({
      data: { name: "Tech", position: 3 },
    });
  });

  it("rejects empty or whitespace-only names", async () => {
    await expect(createFolder("   ")).rejects.toThrow(
      "Folder name cannot be empty",
    );
    expect(prisma.folder.create).not.toHaveBeenCalled();
  });
});

describe("renameFolder", () => {
  it("updates with trimmed name", async () => {
    await renameFolder("f1", "  News  ");
    expect(prisma.folder.update).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { name: "News" },
    });
  });

  it("rejects empty names", async () => {
    await expect(renameFolder("f1", "  ")).rejects.toThrow(
      "Folder name cannot be empty",
    );
    expect(prisma.folder.update).not.toHaveBeenCalled();
  });
});

describe("deleteFolder", () => {
  it("deletes by id", async () => {
    await deleteFolder("f1");
    expect(prisma.folder.delete).toHaveBeenCalledWith({ where: { id: "f1" } });
  });
});

describe("moveFeedToFolder", () => {
  it("updates the feed's folderId", async () => {
    await moveFeedToFolder("feed1", "f1");
    expect(prisma.feed.update).toHaveBeenCalledWith({
      where: { id: "feed1" },
      data: { folderId: "f1" },
    });
  });

  it("accepts null to uncategorize", async () => {
    await moveFeedToFolder("feed1", null);
    expect(prisma.feed.update).toHaveBeenCalledWith({
      where: { id: "feed1" },
      data: { folderId: null },
    });
  });
});
