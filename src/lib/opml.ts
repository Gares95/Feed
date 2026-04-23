import { JSDOM } from "jsdom";

export interface OpmlOutline {
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
}

export function generateOpml(
  feeds: { title: string; url: string; siteUrl: string | null }[],
): string {
  const outlines = feeds
    .map((feed) => {
      const attrs = [
        `text="${escapeXml(feed.title)}"`,
        `title="${escapeXml(feed.title)}"`,
        `type="rss"`,
        `xmlUrl="${escapeXml(feed.url)}"`,
      ];
      if (feed.siteUrl) {
        attrs.push(`htmlUrl="${escapeXml(feed.siteUrl)}"`);
      }
      return `      <outline ${attrs.join(" ")} />`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Feed Subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
    <outline text="Subscriptions" title="Subscriptions">
${outlines}
    </outline>
  </body>
</opml>
`;
}

// jsdom's XML parser ignores external entity declarations, SYSTEM URLs,
// and billion-laughs-style DTD expansion — see opml.test.ts for the
// attack vectors we verify against. Keep using jsdom rather than a raw
// XML parser that might expand entities.
export function parseOpml(xml: string): OpmlOutline[] {
  const dom = new JSDOM(xml, { contentType: "text/xml" });
  const doc = dom.window.document;
  const outlines = doc.querySelectorAll("outline[xmlUrl]");

  const feeds: OpmlOutline[] = [];
  for (const outline of outlines) {
    const xmlUrl = outline.getAttribute("xmlUrl");
    if (!xmlUrl) continue;

    feeds.push({
      title:
        outline.getAttribute("title") ||
        outline.getAttribute("text") ||
        xmlUrl,
      xmlUrl,
      htmlUrl: outline.getAttribute("htmlUrl") || undefined,
    });
  }

  return feeds;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
