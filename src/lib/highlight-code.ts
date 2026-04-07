import hljs from "highlight.js";
import { JSDOM } from "jsdom";

/**
 * Finds <pre><code> blocks in the given HTML and runs highlight.js over them.
 * If a `language-xxx` class is present on the <code>, that language is used;
 * otherwise auto-detection is attempted. Failures fall back silently.
 */
export function highlightCodeBlocks(html: string): string {
  if (!html.includes("<pre")) return html;

  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  const doc = dom.window.document;
  const blocks = doc.querySelectorAll("pre code");

  blocks.forEach((block) => {
    const code = block.textContent ?? "";
    if (!code.trim()) return;

    const langClass = Array.from(block.classList).find((c) =>
      c.startsWith("language-"),
    );
    const lang = langClass?.replace("language-", "");

    try {
      const result =
        lang && hljs.getLanguage(lang)
          ? hljs.highlight(code, { language: lang, ignoreIllegals: true })
          : hljs.highlightAuto(code);
      block.innerHTML = result.value;
      block.classList.add("hljs");
      if (result.language) block.classList.add(`language-${result.language}`);
    } catch {
      /* leave block untouched on failure */
    }
  });

  return doc.body.innerHTML;
}
