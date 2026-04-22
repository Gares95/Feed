import { describe, expect, it } from "vitest";
import { buildFtsQuery } from "./fts-query";

describe("buildFtsQuery", () => {
  it("returns null for empty input", () => {
    expect(buildFtsQuery("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(buildFtsQuery("   \t  ")).toBeNull();
  });

  it("returns null when only special characters are present", () => {
    expect(buildFtsQuery('"\'*^~()[]{}')).toBeNull();
  });

  it("wraps a single term with quotes and prefix wildcard", () => {
    expect(buildFtsQuery("foo")).toBe('"foo"*');
  });

  it("wraps each term of a multi-term query", () => {
    expect(buildFtsQuery("foo bar")).toBe('"foo"* "bar"*');
  });

  it("strips FTS5 special characters from terms", () => {
    expect(buildFtsQuery('foo"bar*')).toBe('"foobar"*');
  });

  it("collapses repeated whitespace", () => {
    expect(buildFtsQuery("  foo   bar  ")).toBe('"foo"* "bar"*');
  });

  it("returns null when input exceeds the length cap", () => {
    expect(buildFtsQuery("a".repeat(201))).toBeNull();
  });

  it("accepts input exactly at the length cap", () => {
    expect(buildFtsQuery("a".repeat(200))).toBe(`"${"a".repeat(200)}"*`);
  });
});
