export interface HighlightRecord {
  id: string;
  text: string;
  textOffset: number;
  note: string | null;
}

/**
 * Compute the character offset of a Range's start within a container's
 * concatenated textContent. Returns -1 if the start is not inside the container.
 */
export function rangeTextOffset(container: Node, range: Range): number {
  if (!container.contains(range.startContainer)) return -1;

  let offset = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node === range.startContainer) {
      return offset + range.startOffset;
    }
    offset += (node.textContent ?? "").length;
    node = walker.nextNode();
  }
  return -1;
}

/**
 * Wrap a slice of a container's textContent (starting at `offset`, length
 * `length`) with <mark> elements. Splits across text nodes as needed. The
 * resulting mark(s) carry data-highlight-id and a class for styling.
 */
export function applyHighlight(
  container: Node,
  offset: number,
  length: number,
  attrs: { id: string; note: string | null },
): void {
  if (length <= 0) return;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let cursor = 0;
  let remaining = length;
  let started = false;
  const toWrap: { node: Text; start: number; end: number }[] = [];

  let node = walker.nextNode() as Text | null;
  while (node && remaining > 0) {
    const text = node.textContent ?? "";
    const nodeEnd = cursor + text.length;

    if (!started && offset >= cursor && offset < nodeEnd) {
      started = true;
      const start = offset - cursor;
      const end = Math.min(text.length, start + remaining);
      toWrap.push({ node, start, end });
      remaining -= end - start;
    } else if (started) {
      const end = Math.min(text.length, remaining);
      toWrap.push({ node, start: 0, end });
      remaining -= end;
    }

    cursor = nodeEnd;
    node = walker.nextNode() as Text | null;
  }

  for (const piece of toWrap) {
    const { node, start, end } = piece;
    const original = node.textContent ?? "";
    const before = original.slice(0, start);
    const middle = original.slice(start, end);
    const after = original.slice(end);
    const parent = node.parentNode;
    if (!parent) continue;

    const mark = document.createElement("mark");
    mark.className = "feed-highlight";
    mark.dataset.highlightId = attrs.id;
    if (attrs.note) mark.title = attrs.note;
    mark.textContent = middle;

    if (before) parent.insertBefore(document.createTextNode(before), node);
    parent.insertBefore(mark, node);
    if (after) {
      const afterNode = document.createTextNode(after);
      parent.insertBefore(afterNode, node);
    }
    parent.removeChild(node);
  }
}

/**
 * Apply many highlights to a container in descending offset order so that
 * earlier offsets remain valid as later ones are inserted.
 */
export function applyHighlights(
  container: Node,
  highlights: HighlightRecord[],
): void {
  const sorted = [...highlights].sort((a, b) => b.textOffset - a.textOffset);
  for (const h of sorted) {
    applyHighlight(container, h.textOffset, h.text.length, {
      id: h.id,
      note: h.note,
    });
  }
}

/**
 * Pure helper: given the plaintext of a container, validate that a stored
 * highlight offset still matches its text. Used in tests and as a sanity
 * check before applying.
 */
export function highlightStillMatches(
  plain: string,
  offset: number,
  text: string,
): boolean {
  if (offset < 0 || offset + text.length > plain.length) return false;
  return plain.slice(offset, offset + text.length) === text;
}
