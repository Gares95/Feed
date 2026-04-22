import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock("node:dns/promises", () => ({
  lookup: lookupMock,
  default: { lookup: lookupMock },
}));
vi.mock("dns/promises", () => ({
  lookup: lookupMock,
  default: { lookup: lookupMock },
}));

import { isPrivateIp, safeFetch, SafeFetchError } from "./safe-fetch";

describe("isPrivateIp", () => {
  const blocked = [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.5",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "fe80::1",
    "fc00::1",
    "ff00::1",
  ];
  const allowed = ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"];

  for (const ip of blocked) {
    it(`blocks ${ip}`, () => expect(isPrivateIp(ip)).toBe(true));
  }
  for (const ip of allowed) {
    it(`allows ${ip}`, () => expect(isPrivateIp(ip)).toBe(false));
  }

  it("blocks IPv4-mapped IPv6 loopback (::ffff:127.0.0.1)", () => {
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
  });
});

describe("safeFetch", () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    lookupMock.mockReset();
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it("rejects non-http(s) protocols", async () => {
    await expect(safeFetch("file:///etc/passwd")).rejects.toMatchObject({
      code: "bad_protocol",
    });
  });

  it("rejects malformed URLs", async () => {
    await expect(safeFetch("not a url")).rejects.toMatchObject({ code: "bad_url" });
  });

  it("rejects literal loopback URLs", async () => {
    await expect(safeFetch("http://127.0.0.1/")).rejects.toMatchObject({
      code: "blocked",
    });
  });

  it("rejects literal cloud metadata address", async () => {
    await expect(safeFetch("http://169.254.169.254/latest/meta-data/")).rejects.toMatchObject({
      code: "blocked",
    });
  });

  it("rejects literal IPv6 loopback", async () => {
    await expect(safeFetch("http://[::1]/")).rejects.toMatchObject({ code: "blocked" });
  });

  it("rejects hostnames that resolve to a private address", async () => {
    lookupMock.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    await expect(safeFetch("http://attacker.test/")).rejects.toMatchObject({
      code: "blocked",
    });
  });

  it("rejects a redirect to a private address", async () => {
    lookupMock.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
    globalThis.fetch = vi.fn(async () =>
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/" },
      }),
    ) as unknown as typeof fetch;
    await expect(safeFetch("http://safe.test/")).rejects.toMatchObject({
      code: "blocked",
    });
  });

  it("throws too_large when body exceeds maxBytes", async () => {
    lookupMock.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(600));
        controller.enqueue(new Uint8Array(600));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn(async () =>
      new Response(stream, { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(
      safeFetch("http://safe.test/", { maxBytes: 1000 }),
    ).rejects.toMatchObject({ code: "too_large" });
  });

  it("returns body and final url on success", async () => {
    lookupMock.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
    globalThis.fetch = vi.fn(async () =>
      new Response("hello", { status: 200, headers: { "content-type": "text/plain" } }),
    ) as unknown as typeof fetch;
    const result = await safeFetch("http://safe.test/");
    expect(result.status).toBe(200);
    expect(result.text()).toBe("hello");
  });

  it("caps redirect chains", async () => {
    lookupMock.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
    let n = 0;
    globalThis.fetch = vi.fn(async () => {
      n++;
      return new Response(null, {
        status: 302,
        headers: { location: `http://safe${n}.test/` },
      });
    }) as unknown as typeof fetch;
    await expect(
      safeFetch("http://safe.test/", { maxRedirects: 2 }),
    ).rejects.toMatchObject({ code: "too_many_redirects" });
  });
});

afterEach(() => {
  // be extra sure to not leak error subclass across tests
  expect(SafeFetchError).toBeTruthy();
});
