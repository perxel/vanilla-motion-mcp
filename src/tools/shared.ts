import type { Env } from "../../kit/core/env.js";
import { ToolError } from "../../kit/core/tool.js";
import type { EffectItem, Param } from "../content.js";

/** Compact list/search entry: no full text, no params (token rules in STANDARD.md). */
export function compactEffect(item: EffectItem) {
  return {
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt,
    url: item.url,
    category: item.category || null,
    kind: item.kindLabel,
    tags: item.labels,
    version: item.version,
  };
}

const kebabAttr = (p: Param) => p.attr;

/** `<script>` + `<div data-<slug>>` for plain sites, Webflow, Framer, WordPress. */
export function embedSnippet(item: EffectItem, overrides: Record<string, string | number | boolean> = {}): string {
  const attrs = item.params
    .filter((p) => p.key in overrides)
    .map((p) => ` ${kebabAttr(p)}="${String(overrides[p.key]).replace(/"/g, "&quot;")}"`)
    .join("");
  return [
    ...item.embed.requires.map((src) => `<script src="${src}"></script>`),
    `<div ${item.embed.attribute}${attrs} style="height:480px"></div>`,
    `<script src="${item.embed.scriptUrl}"></script>`,
  ].join("\n");
}

/** mount() usage for bundled apps, after `npx vanilla-motion add <slug>`. */
export function mountUsage(item: EffectItem): string {
  return [
    `import { mount } from "./vanilla-motion/${item.slug}/${item.slug}";`,
    "",
    `const fx = mount(document.querySelector("#my-effect"), { /* any params, e.g. ${item.params[0] ? `${item.params[0].key}: ${JSON.stringify(item.params[0].default)}` : ""} */ });`,
    `fx.setParams({ /* change params live */ });`,
    `fx.dispose(); // stops it and restores the element`,
  ].join("\n");
}

/** One param, without nulls, so the agent sees only what is known. */
export function paramView(p: Param) {
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== null));
}

/** How much Markdown get_case_study / get_skill return; the url carries the rest. */
export const MAX_DOC_CHARS = 30000;
const DOC_TTL_MS = 600_000;
const docs = new Map<string, { text: string; at: number }>();

/**
 * Fetch one of the site's Markdown files (case-study.md, skill.md), cached in memory about 10
 * minutes like the content source. Only URLs on the site itself are fetched.
 */
export async function fetchDoc(url: string, siteUrl: string, _env: Env): Promise<{ text: string; truncated: boolean }> {
  if (!url.startsWith(`${siteUrl}/`)) throw new ToolError("upstream", `refusing to fetch ${url}: not on ${siteUrl}`);
  const hit = docs.get(url);
  let text: string;
  if (hit && Date.now() - hit.at < DOC_TTL_MS) {
    text = hit.text;
  } else {
    let res: Response;
    try {
      res = await fetch(url, { headers: { accept: "text/markdown, text/plain" } });
    } catch {
      if (hit) return cut(hit.text);
      throw new ToolError("upstream", `could not fetch ${url}`);
    }
    if (res.status === 404) throw new ToolError("not_found", `${url} does not exist (yet)`);
    if (!res.ok) {
      if (hit) return cut(hit.text);
      throw new ToolError("upstream", `${url}: HTTP ${res.status}`);
    }
    text = await res.text();
    docs.set(url, { text, at: Date.now() });
  }
  return cut(text);
}

function cut(text: string) {
  return { text: text.slice(0, MAX_DOC_CHARS), truncated: text.length > MAX_DOC_CHARS };
}

/** Test hook: forget cached Markdown. */
export function clearDocCache() {
  docs.clear();
}
