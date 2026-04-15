import { describe, expect, it } from "vitest";
import { estimateReadingTime } from "./reading-time";

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
}

describe("estimateReadingTime", () => {
  it("returns null for empty content", () => {
    expect(estimateReadingTime("")).toBeNull();
    expect(estimateReadingTime("   ")).toBeNull();
  });

  it("returns null for content below the minimum word threshold", () => {
    expect(estimateReadingTime(`<p>${words(50)}</p>`)).toBeNull();
    expect(estimateReadingTime(`<p>${words(149)}</p>`)).toBeNull();
  });

  it("estimates minutes once over the threshold (200 wpm)", () => {
    expect(estimateReadingTime(`<p>${words(200)}</p>`)).toBe(1);
    expect(estimateReadingTime(`<p>${words(400)}</p>`)).toBe(2);
    expect(estimateReadingTime(`<p>${words(1000)}</p>`)).toBe(5);
  });

  it("strips tags and whitespace before counting", () => {
    const html = `<div><p>${words(300)}</p><p>${words(100)}</p></div>`;
    expect(estimateReadingTime(html)).toBe(2);
  });

  it("returns null when content ends with an ellipsis", () => {
    const bracketEllipsis = "[" + "..." + "]";
    expect(estimateReadingTime(`<p>${words(500)}…</p>`)).toBeNull();
    expect(estimateReadingTime(`<p>${words(500)}...</p>`)).toBeNull();
    expect(
      estimateReadingTime(`<p>${words(500)} ${bracketEllipsis}</p>`),
    ).toBeNull();
  });

  it("returns null when content ends with a 'read more'-style phrase", () => {
    expect(
      estimateReadingTime(`<p>${words(500)} Continue reading.</p>`),
    ).toBeNull();
    expect(
      estimateReadingTime(`<p>${words(500)} Read the full story.</p>`),
    ).toBeNull();
    expect(
      estimateReadingTime(`<p>${words(500)} Read more</p>`),
    ).toBeNull();
  });

  it("returns null when content ends with a 'read more' link", () => {
    const html = `<p>${words(500)}</p><p><a href="https://publisher.test/post">Continue reading</a></p>`;
    expect(estimateReadingTime(html)).toBeNull();
  });

  it("does not flag legitimate full posts that happen to contain the word 'more'", () => {
    const html = `<p>There is more to say about this topic. ${words(500)}</p>`;
    expect(estimateReadingTime(html)).toBe(3);
  });
});
