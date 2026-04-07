"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function addHighlight(input: {
  articleId: string;
  text: string;
  textOffset: number;
  note?: string | null;
}) {
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error("Highlight text cannot be empty");
  if (input.textOffset < 0) throw new Error("Invalid offset");

  const highlight = await prisma.highlight.create({
    data: {
      articleId: input.articleId,
      text: input.text,
      textOffset: input.textOffset,
      note: input.note ?? null,
    },
  });
  revalidatePath("/");
  return highlight;
}

export async function deleteHighlight(id: string) {
  await prisma.highlight.delete({ where: { id } });
  revalidatePath("/");
}

export async function updateHighlightNote(id: string, note: string | null) {
  const trimmed = note?.trim() || null;
  await prisma.highlight.update({ where: { id }, data: { note: trimmed } });
  revalidatePath("/");
}

export async function getHighlights(articleId: string) {
  const highlights = await prisma.highlight.findMany({
    where: { articleId },
    orderBy: { textOffset: "asc" },
  });
  return highlights.map((h) => ({
    id: h.id,
    text: h.text,
    textOffset: h.textOffset,
    note: h.note,
    createdAt: h.createdAt,
  }));
}
