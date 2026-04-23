import { describe, it, expect } from "vitest";
import { parseOpml, generateOpml } from "./opml";

describe("parseOpml", () => {
  it("round-trips feeds through generateOpml", () => {
    const feeds = [
      { title: "Hacker News", url: "https://news.ycombinator.com/rss", siteUrl: "https://news.ycombinator.com" },
      { title: "XKCD", url: "https://xkcd.com/rss.xml", siteUrl: null },
    ];
    const xml = generateOpml(feeds);
    const parsed = parseOpml(xml);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      title: "Hacker News",
      xmlUrl: "https://news.ycombinator.com/rss",
      htmlUrl: "https://news.ycombinator.com",
    });
    expect(parsed[1]).toMatchObject({ title: "XKCD", xmlUrl: "https://xkcd.com/rss.xml" });
  });

  it("ignores outlines without xmlUrl", () => {
    const xml = `<?xml version="1.0"?>
<opml version="2.0">
  <body>
    <outline text="Category" />
    <outline text="Real Feed" xmlUrl="https://feed.invalid/rss" />
  </body>
</opml>`;
    const parsed = parseOpml(xml);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].xmlUrl).toBe("https://feed.invalid/rss");
  });

  // XXE / entity-expansion safety. Each of these malicious payloads should
  // either be ignored by the parser, throw, or produce an outline whose
  // attributes do not contain sensitive data — but must never read local
  // files, trigger outbound HTTP, or explode memory.

  it("does not expand SYSTEM entities pointing at local files (XXE)", () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE opml [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<opml version="2.0">
  <body>
    <outline text="&xxe;" xmlUrl="https://feed.invalid/rss" />
  </body>
</opml>`;

    let parsed: ReturnType<typeof parseOpml> = [];
    try {
      parsed = parseOpml(xml);
    } catch {
      // Throwing is also a valid outcome — means the parser refused the DTD.
      return;
    }

    for (const outline of parsed) {
      expect(outline.title).not.toMatch(/root:/);
      expect(outline.title).not.toMatch(/\/bin\/(ba)?sh/);
    }
  });

  it("does not fetch SYSTEM entities pointing at URLs (SSRF via XXE)", () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE opml [
  <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">
]>
<opml version="2.0">
  <body>
    <outline text="&xxe;" xmlUrl="https://feed.invalid/rss" />
  </body>
</opml>`;

    // The test completes quickly — which is itself part of the assertion.
    // An entity-expanding parser would hang on the unreachable address for
    // its connect timeout. If the parser throws or returns early, that's
    // fine; what we must not see is a real network call.
    try {
      parseOpml(xml);
    } catch {
      // Acceptable — parser rejected the DOCTYPE.
    }
  }, 2000);

  it("handles billion-laughs DTDs without exploding memory", () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
  <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
  <!ENTITY lol5 "&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;">
  <!ENTITY lol6 "&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;">
  <!ENTITY lol7 "&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;">
  <!ENTITY lol8 "&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;">
  <!ENTITY lol9 "&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;">
]>
<opml version="2.0">
  <body>
    <outline text="&lol9;" xmlUrl="https://feed.invalid/rss" />
  </body>
</opml>`;

    // If the parser expanded the entities we'd allocate ~3 GB before the
    // test runner killed us; if it ignores or rejects them we return
    // promptly. Either outcome is safe; a hang is not.
    try {
      parseOpml(xml);
    } catch {
      // Acceptable — parser rejected the DOCTYPE.
    }
  }, 2000);
});
