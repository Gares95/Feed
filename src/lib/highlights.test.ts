// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  applyHighlights,
  highlightStillMatches,
  rangeTextOffset,
} from "./highlights";

function makeContainer(html: string): HTMLElement {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
}

describe("highlightStillMatches", () => {
  it("returns true when offset and text align", () => {
    expect(highlightStillMatches("hello world", 6, "world")).toBe(true);
  });
  it("returns false when offset is wrong", () => {
    expect(highlightStillMatches("hello world", 5, "world")).toBe(false);
  });
  it("returns false when offset is out of bounds", () => {
    expect(highlightStillMatches("hi", 0, "hello")).toBe(false);
  });
});

describe("applyHighlights", () => {
  it("wraps a single text node slice in a <mark>", () => {
    const c = makeContainer("<p>The quick brown fox</p>");
    applyHighlights(c, [
      { id: "h1", text: "quick brown", textOffset: 4, note: null },
    ]);
    const mark = c.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark!.textContent).toBe("quick brown");
    expect(mark!.dataset.highlightId).toBe("h1");
  });

  it("attaches the note as a tooltip when present", () => {
    const c = makeContainer("<p>Hello world</p>");
    applyHighlights(c, [
      { id: "h1", text: "world", textOffset: 6, note: "noun" },
    ]);
    const mark = c.querySelector("mark");
    expect(mark!.getAttribute("title")).toBe("noun");
  });

  it("supports multiple non-overlapping highlights", () => {
    const c = makeContainer("<p>alpha beta gamma</p>");
    applyHighlights(c, [
      { id: "h1", text: "alpha", textOffset: 0, note: null },
      { id: "h2", text: "gamma", textOffset: 11, note: null },
    ]);
    const marks = c.querySelectorAll("mark");
    expect(marks.length).toBe(2);
    expect(marks[0].textContent).toBe("alpha");
    expect(marks[1].textContent).toBe("gamma");
  });

  it("spans across multiple text nodes / inline elements", () => {
    const c = makeContainer("<p>foo <em>bar</em> baz</p>");
    // textContent = "foo bar baz" — highlight "bar baz" starting at 4
    applyHighlights(c, [
      { id: "h1", text: "bar baz", textOffset: 4, note: null },
    ]);
    const marks = c.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThanOrEqual(2);
    const combined = Array.from(marks)
      .map((m) => m.textContent)
      .join("");
    expect(combined).toBe("bar baz");
  });
});

describe("rangeTextOffset", () => {
  it("computes the offset of a Range start within the container", () => {
    const c = makeContainer("<p>foo <em>bar</em> baz</p>");
    document.body.appendChild(c);
    const em = c.querySelector("em")!;
    const range = document.createRange();
    range.setStart(em.firstChild!, 1); // points at "ar" inside "bar"
    range.setEnd(em.firstChild!, 3);
    expect(rangeTextOffset(c, range)).toBe(5); // "foo " (4) + 1
  });
});
