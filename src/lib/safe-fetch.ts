import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type SafeFetchErrorCode =
  | "blocked"
  | "too_large"
  | "timeout"
  | "bad_status"
  | "bad_protocol"
  | "bad_url"
  | "too_many_redirects"
  | "redirect_loop";

export class SafeFetchError extends Error {
  code: SafeFetchErrorCode;
  status?: number;
  constructor(code: SafeFetchErrorCode, message: string, status?: number) {
    super(message);
    this.name = "SafeFetchError";
    this.code = code;
    this.status = status;
  }
}

export interface SafeFetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  accept?: string;
}

export interface SafeFetchResult {
  url: string;
  status: number;
  headers: Headers;
  body: Uint8Array;
  text(): string;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_UA = "Feed/1.0 (Local RSS Reader)";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * IPv4 CIDR blocks that must never be reached from a server-side fetch:
 * "this host", RFC1918 private space, loopback, link-local, carrier-grade
 * NAT, benchmarking, multicast, reserved, and cloud metadata (169.254/16
 * covers 169.254.169.254 and friends).
 */
const V4_BLOCKED: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return -1;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function v4InCidr(ip: string, cidr: [string, number]): boolean {
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(cidr[0]);
  if (ipInt < 0 || baseInt < 0) return false;
  const mask = cidr[1] === 0 ? 0 : (~0 << (32 - cidr[1])) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

function normaliseV6(ip: string): number[] | null {
  const kind = isIP(ip);
  if (kind !== 6) return null;
  // Expand :: and handle embedded IPv4 (::ffff:a.b.c.d form).
  const v4MappedMatch = ip.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  let hex = ip;
  if (v4MappedMatch) {
    const v4Int = ipv4ToInt(v4MappedMatch[2]);
    if (v4Int < 0) return null;
    const hi = (v4Int >>> 16) & 0xffff;
    const lo = v4Int & 0xffff;
    hex = `${v4MappedMatch[1]}${hi.toString(16)}:${lo.toString(16)}`;
  }
  const [left, right] = hex.split("::");
  const leftGroups = left ? left.split(":").filter(Boolean) : [];
  const rightGroups = right ? right.split(":").filter(Boolean) : [];
  const missing = 8 - leftGroups.length - rightGroups.length;
  if (missing < 0) return null;
  const groups = [
    ...leftGroups,
    ...Array(missing).fill("0"),
    ...rightGroups,
  ].map((g) => parseInt(g, 16));
  if (groups.length !== 8 || groups.some((g) => !Number.isInteger(g) || g < 0 || g > 0xffff)) {
    return null;
  }
  return groups;
}

function v6MatchesPrefix(groups: number[], prefix: number[], bits: number): boolean {
  let remaining = bits;
  for (let i = 0; i < 8 && remaining > 0; i++) {
    const take = Math.min(16, remaining);
    const mask = take === 16 ? 0xffff : (0xffff << (16 - take)) & 0xffff;
    if ((groups[i] & mask) !== (prefix[i] & mask)) return false;
    remaining -= take;
  }
  return true;
}

/**
 * True when `ip` is a literal IPv4 or IPv6 address we refuse to reach.
 * Exported so callers (and tests) can check addresses directly.
 */
export function isPrivateIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) {
    return V4_BLOCKED.some((cidr) => v4InCidr(ip, cidr));
  }
  if (kind === 6) {
    const groups = normaliseV6(ip);
    if (!groups) return true; // malformed: refuse
    // ::1/128 and ::/128
    if (v6MatchesPrefix(groups, normaliseV6("::1")!, 128)) return true;
    if (v6MatchesPrefix(groups, normaliseV6("::")!, 128)) return true;
    // ::ffff:0:0/96 — IPv4-mapped: recheck as IPv4
    if (v6MatchesPrefix(groups, normaliseV6("::ffff:0:0")!, 96)) {
      const v4 = `${(groups[6] >> 8) & 0xff}.${groups[6] & 0xff}.${(groups[7] >> 8) & 0xff}.${groups[7] & 0xff}`;
      return V4_BLOCKED.some((cidr) => v4InCidr(v4, cidr));
    }
    // 64:ff9b::/96 (NAT64)
    if (v6MatchesPrefix(groups, normaliseV6("64:ff9b::")!, 96)) return true;
    // fc00::/7 (ULA)
    if (v6MatchesPrefix(groups, normaliseV6("fc00::")!, 7)) return true;
    // fe80::/10 (link-local)
    if (v6MatchesPrefix(groups, normaliseV6("fe80::")!, 10)) return true;
    // ff00::/8 (multicast)
    if (v6MatchesPrefix(groups, normaliseV6("ff00::")!, 8)) return true;
    return false;
  }
  return false;
}

async function assertHostAllowed(url: URL): Promise<void> {
  // URL class keeps IPv6 hostnames bracketed (e.g. "[::1]") — strip before checks.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) !== 0) {
    if (isPrivateIp(host)) {
      throw new SafeFetchError("blocked", `Blocked address: ${host}`);
    }
    return;
  }
  let addrs: Array<{ address: string; family: number }>;
  try {
    addrs = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new SafeFetchError("blocked", `DNS lookup failed for ${host}`);
  }
  if (addrs.length === 0) {
    throw new SafeFetchError("blocked", `No addresses for ${host}`);
  }
  for (const a of addrs) {
    if (isPrivateIp(a.address)) {
      throw new SafeFetchError("blocked", `Blocked address ${a.address} for ${host}`);
    }
  }
}

function parseUrl(input: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new SafeFetchError("bad_url", `Invalid URL: ${input}`);
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new SafeFetchError("bad_protocol", `Disallowed protocol: ${parsed.protocol}`);
  }
  return parsed;
}

async function readCapped(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      throw new SafeFetchError("too_large", `Response exceeded ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

export async function safeFetch(
  input: string,
  opts: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentUrl = parseUrl(input);
    const visited = new Set<string>();
    let hops = 0;

    while (true) {
      if (visited.has(currentUrl.href)) {
        throw new SafeFetchError("redirect_loop", `Redirect loop at ${currentUrl.href}`);
      }
      visited.add(currentUrl.href);

      await assertHostAllowed(currentUrl);

      const headers: Record<string, string> = {
        "User-Agent": DEFAULT_UA,
        ...(opts.accept ? { Accept: opts.accept } : {}),
        ...(opts.headers ?? {}),
      };

      let res: Response;
      try {
        res = await fetch(currentUrl.toString(), {
          headers,
          signal: controller.signal,
          redirect: "manual",
        });
      } catch (err) {
        if (err instanceof SafeFetchError) throw err;
        if ((err as { name?: string })?.name === "AbortError") {
          throw new SafeFetchError("timeout", `Fetch timed out after ${timeoutMs}ms`);
        }
        throw new SafeFetchError("blocked", `Fetch failed: ${(err as Error).message}`);
      }

      // Manual redirect handling.
      if (res.status >= 300 && res.status < 400 && res.headers.has("location")) {
        hops++;
        if (hops > maxRedirects) {
          throw new SafeFetchError("too_many_redirects", `Exceeded ${maxRedirects} redirects`);
        }
        const location = res.headers.get("location")!;
        let next: URL;
        try {
          next = new URL(location, currentUrl);
        } catch {
          throw new SafeFetchError("bad_url", `Invalid redirect target: ${location}`);
        }
        if (!ALLOWED_PROTOCOLS.has(next.protocol)) {
          throw new SafeFetchError("bad_protocol", `Disallowed redirect protocol: ${next.protocol}`);
        }
        currentUrl = next;
        // Drain body so the socket can be reused.
        try {
          await res.body?.cancel();
        } catch {
          // ignore
        }
        continue;
      }

      if (!res.ok) {
        throw new SafeFetchError("bad_status", `Upstream returned ${res.status}`, res.status);
      }

      const advertised = Number(res.headers.get("content-length") ?? 0);
      if (advertised && advertised > maxBytes) {
        throw new SafeFetchError("too_large", `Content-Length ${advertised} > ${maxBytes}`);
      }

      if (!res.body) {
        return {
          url: currentUrl.toString(),
          status: res.status,
          headers: res.headers,
          body: new Uint8Array(),
          text() {
            return "";
          },
        };
      }

      const body = await readCapped(res.body, maxBytes);
      return {
        url: currentUrl.toString(),
        status: res.status,
        headers: res.headers,
        body,
        text() {
          return new TextDecoder("utf-8").decode(body);
        },
      };
    }
  } finally {
    clearTimeout(timer);
  }
}
