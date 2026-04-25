import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    highlight: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  addHighlight,
  deleteHighlight,
  updateHighlightNote,
  getHighlights,
} from "./highlights";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addHighlight", () => {
  it("creates a highlight with the given fields", async () => {
    vi.mocked(prisma.highlight.create).mockResolvedValue({ id: "h1" } as never);

    await addHighlight({
      articleId: "a1",
      text: "important text",
      textOffset: 42,
      note: "look here",
    });

    expect(prisma.highlight.create).toHaveBeenCalledWith({
      data: {
        articleId: "a1",
        text: "important text",
        textOffset: 42,
        note: "look here",
      },
    });
  });

  it("rejects empty/whitespace text", async () => {
    await expect(
      addHighlight({ articleId: "a1", text: "   ", textOffset: 0 }),
    ).rejects.toThrow("Highlight text cannot be empty");
    expect(prisma.highlight.create).not.toHaveBeenCalled();
  });

  it("rejects negative offsets", async () => {
    await expect(
      addHighlight({ articleId: "a1", text: "ok", textOffset: -1 }),
    ).rejects.toThrow("Invalid offset");
    expect(prisma.highlight.create).not.toHaveBeenCalled();
  });
});

describe("deleteHighlight", () => {
  it("deletes by id", async () => {
    await deleteHighlight("h1");
    expect(prisma.highlight.delete).toHaveBeenCalledWith({
      where: { id: "h1" },
    });
  });
});

describe("updateHighlightNote", () => {
  it("trims the note", async () => {
    await updateHighlightNote("h1", "  a thought  ");
    expect(prisma.highlight.update).toHaveBeenCalledWith({
      where: { id: "h1" },
      data: { note: "a thought" },
    });
  });

  it("normalizes empty/whitespace to null", async () => {
    await updateHighlightNote("h1", "   ");
    expect(prisma.highlight.update).toHaveBeenCalledWith({
      where: { id: "h1" },
      data: { note: null },
    });
  });
});

describe("getHighlights", () => {
  it("returns highlights ordered by textOffset asc", async () => {
    vi.mocked(prisma.highlight.findMany).mockResolvedValue([
      {
        id: "h1",
        text: "x",
        textOffset: 0,
        note: null,
        createdAt: new Date("2026-01-01"),
      },
    ] as never);

    const result = await getHighlights("a1");

    expect(prisma.highlight.findMany).toHaveBeenCalledWith({
      where: { articleId: "a1" },
      orderBy: { textOffset: "asc" },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("h1");
  });
});
