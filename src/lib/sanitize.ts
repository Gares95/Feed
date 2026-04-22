import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

const { window } = new JSDOM("");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const purify = DOMPurify(window as any);

const ALLOWED_TAGS = [
  "a", "abbr", "b", "blockquote", "br", "code", "del", "em",
  "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "i", "img", "li", "ol", "p", "pre", "s", "strong",
  "sub", "sup", "table", "tbody", "td", "th", "thead", "tr", "ul",
];

const ALLOWED_ATTR = [
  "href", "src", "srcset", "sizes", "alt", "title", "width", "height",
  "class", "target", "rel",
];

const PLACEHOLDER_PATTERN =
  /placeholder|\/1x1\b|\/spacer\b|\/blank\.(gif|png)|transparent\.(gif|png)/i;

export function sanitizeHtml(dirty: string): string {
  const clean = purify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ["target"],
    ALLOW_DATA_ATTR: false,
  });
  return postProcessImages(clean);
}

/**
 * Post-processes sanitized HTML to:
 *  1. Drop lazy-loading placeholder images (BBC's grey-placeholder.png, etc.)
 *     that would otherwise render as small grey/white boxes.
 *  2. Rewrite absolute image URLs (both src and srcset) through our local
 *     image proxy to sidestep mixed-content / hotlink-blocking.
 *  3. Remove figures left empty after step 1.
 */
function postProcessImages(html: string): string {
  const doc = new window.DOMParser().parseFromString(
    `<!DOCTYPE html><html><body>${html}</body></html>`,
    "text/html",
  );

  doc.body.querySelectorAll("a[href]").forEach((a) => {
    a.setAttribute("rel", "noopener noreferrer nofollow");
  });

  doc.body.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    const srcset = img.getAttribute("srcset") ?? "";

    const srcIsPlaceholder = src !== "" && PLACEHOLDER_PATTERN.test(src);
    const onlySrcsetAndPlaceholder =
      src === "" && srcset !== "" && PLACEHOLDER_PATTERN.test(srcset);

    if (srcIsPlaceholder || onlySrcsetAndPlaceholder) {
      img.remove();
      return;
    }

    if (/^https?:\/\//i.test(src)) {
      img.setAttribute("src", proxyUrl(src));
    }

    if (srcset) {
      img.setAttribute("srcset", rewriteSrcset(srcset));
    }
  });

  doc.body.querySelectorAll("figure").forEach((fig) => {
    if (!fig.querySelector("img") && !fig.textContent?.trim()) {
      fig.remove();
    }
  });

  return doc.body.innerHTML;
}

function proxyUrl(url: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

/**
 * srcset is a comma-separated list of "<url> <descriptor>" pairs,
 * e.g. "https://a.jpg 480w, https://b.jpg 960w" or "https://a.jpg 2x".
 * Each absolute URL gets routed through the image proxy; the descriptor
 * is preserved verbatim.
 */
function rewriteSrcset(srcset: string): string {
  return srcset
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return "";
      const match = trimmed.match(/^(\S+)(\s+.+)?$/);
      if (!match) return trimmed;
      const [, url, descriptor = ""] = match;
      if (!/^https?:\/\//i.test(url)) return trimmed;
      return `${proxyUrl(url)}${descriptor}`;
    })
    .filter(Boolean)
    .join(", ");
}
