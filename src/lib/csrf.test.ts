import { describe, it, expect } from "vitest";
import { isSameOriginRequest } from "./csrf";

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/feeds", {
    method: "POST",
    headers,
  });
}

describe("isSameOriginRequest", () => {
  it("accepts when Origin matches Host", () => {
    expect(
      isSameOriginRequest(
        req({ host: "localhost:3000", origin: "http://localhost:3000" }),
      ),
    ).toBe(true);
  });

  it("rejects when Origin points at a different host", () => {
    expect(
      isSameOriginRequest(
        req({ host: "localhost:3000", origin: "http://evil.test" }),
      ),
    ).toBe(false);
  });

  it("falls back to Referer when Origin is absent", () => {
    expect(
      isSameOriginRequest(
        req({ host: "localhost:3000", referer: "http://localhost:3000/" }),
      ),
    ).toBe(true);
  });

  it("rejects when Referer points at a different host", () => {
    expect(
      isSameOriginRequest(
        req({ host: "localhost:3000", referer: "http://evil.test/x" }),
      ),
    ).toBe(false);
  });

  it("rejects when both Origin and Referer are missing", () => {
    expect(isSameOriginRequest(req({ host: "localhost:3000" }))).toBe(false);
  });

  it("rejects a malformed Origin value", () => {
    expect(
      isSameOriginRequest(
        req({ host: "localhost:3000", origin: "not a url" }),
      ),
    ).toBe(false);
  });

  it("rejects when Host header is missing", () => {
    expect(
      isSameOriginRequest(req({ origin: "http://localhost:3000" })),
    ).toBe(false);
  });
});
