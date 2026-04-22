import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("strips disallowed tags", () => {
    const out = sanitizeHtml('<p>keep</p><script>alert(1)</script>');
    expect(out).toContain("<p>keep</p>");
    expect(out).not.toContain("script");
  });

  it("routes absolute image src through the proxy", () => {
    const out = sanitizeHtml('<img src="https://cdn.example/a.jpg" alt="x">');
    expect(out).toContain("/api/image-proxy?url=");
    expect(out).toContain(encodeURIComponent("https://cdn.example/a.jpg"));
  });

  it("leaves relative image src untouched", () => {
    const out = sanitizeHtml('<img src="/local.jpg">');
    expect(out).toContain('src="/local.jpg"');
    expect(out).not.toContain("image-proxy");
  });

  it("removes BBC-style placeholder images", () => {
    const html =
      '<figure>' +
      '<img src="https://ichef.bbci.co.uk/images/ic/960x540/grey-placeholder.png">' +
      '<img srcset="https://ichef.bbci.co.uk/news/480/a.jpg 480w, https://ichef.bbci.co.uk/news/960/a.jpg 960w" alt="Mountain">' +
      '</figure>';
    const out = sanitizeHtml(html);
    expect(out).not.toContain("grey-placeholder");
    expect(out).toContain('alt="Mountain"');
  });

  it("preserves and proxies srcset URLs", () => {
    const out = sanitizeHtml(
      '<img srcset="https://a.test/1.jpg 480w, https://a.test/2.jpg 960w" sizes="100vw" alt="x">',
    );
    expect(out).toContain("srcset=");
    expect(out).toContain("sizes=");
    expect(out).toContain(encodeURIComponent("https://a.test/1.jpg"));
    expect(out).toContain(encodeURIComponent("https://a.test/2.jpg"));
    expect(out).toMatch(/480w/);
    expect(out).toMatch(/960w/);
  });

  it("removes figures left empty after placeholder removal", () => {
    const out = sanitizeHtml(
      '<figure><img src="https://x.test/1x1/pixel.gif"></figure><p>after</p>',
    );
    expect(out).not.toContain("<figure");
    expect(out).toContain("<p>after</p>");
  });

  it("keeps figure when a caption remains", () => {
    const out = sanitizeHtml(
      '<figure><img src="https://x.test/spacer.gif"><figcaption>A caption</figcaption></figure>',
    );
    expect(out).toContain("<figcaption>A caption</figcaption>");
  });

  it("forces rel=noopener noreferrer nofollow on anchors", () => {
    const out = sanitizeHtml(
      '<a href="https://evil.test/" rel="opener">link</a>',
    );
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).not.toContain('rel="opener"');
  });

  it("adds rel even when input omits it", () => {
    const out = sanitizeHtml('<a href="https://x.test/">x</a>');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });
});
