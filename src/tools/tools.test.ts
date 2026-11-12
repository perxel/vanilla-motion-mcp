import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../../kit/core/env.js";
import type { ToolContext } from "../../kit/core/tool.js";
import feed from "../fixtures/content.json" with { type: "json" };
import { parseContent } from "../content.js";
import { addEffectPrompt } from "../prompts.js";
import { getCaseStudyTool, getSkillTool } from "./get-docs.js";
import { getEffectTool } from "./get-effect.js";
import { listTagsTool } from "./list-tags.js";
import { searchEffectsTool } from "./search-effects.js";
import { clearDocCache, MAX_DOC_CHARS } from "./shared.js";

const CONTENT_URL = "https://vanilla-motion.com/content.json";
const ctx: ToolContext = { env: { CONTENT_URL } as Env, auth: null, requestId: "test", log: () => {} };

const fetched: string[] = [];
let docBody = (url: string) => `# Doc\n\nMarkdown for ${url}`;
const realFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    fetched.push(url);
    if (url === CONTENT_URL) return new Response(JSON.stringify(feed), { status: 200, headers: { etag: '"v1"' } });
    if (url.endsWith(".md")) return new Response(docBody(url), { status: 200 });
    return new Response("nope", { status: 404 });
  }) as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
});
beforeEach(() => {
  clearDocCache();
  fetched.length = 0;
  docBody = (url: string) => `# Doc\n\nMarkdown for ${url}`;
});

const run = <T extends { inputSchema: { parse: (x: unknown) => unknown }; execute: (i: never, c: ToolContext) => Promise<{ data: unknown; count?: number }> }>(
  tool: T,
  input: Record<string, unknown>,
) => tool.execute(tool.inputSchema.parse(input) as never, ctx);

type Hit = { slug: string; title: string; tags: string[]; passages?: string[] };
const hits = (r: { data: unknown }) => (r.data as { results: Hit[] }).results;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const effectOf = (r: { data: unknown }) => (r.data as { effect: any }).effect;

describe("content.json", () => {
  it("parses the real site file", () => {
    const c = parseContent(feed);
    expect(c.items.length).toBeGreaterThan(0);
    expect(c.siteUrl).toBe("https://vanilla-motion.com");
  });

  it("parses a file from before section and kind", () => {
    const old = { ...feed, items: feed.items.map(({ section, kind, kindLabel, summary, ...rest }) => rest) };
    const c = parseContent(old);
    expect(c.items[0]!.section).toBeNull();
    expect(c.items[0]!.kind).toBeNull();
  });

  it("rejects another version", () => {
    expect(() => parseContent({ ...feed, version: 2 })).toThrow(/not supported/);
  });

  it("holds public effects only: no unlisted demo URL", () => {
    expect(JSON.stringify(feed)).not.toMatch(/vanilla-motion\.com\/d\//);
  });
});

describe("search_effects", () => {
  it("finds by words", async () => {
    const r = await run(searchEffectsTool, { query: "ice logo" });
    expect(hits(r)[0]!.slug).toBe("ice-logo");
    expect(r.count).toBe(hits(r).length);
  });

  it("returns compact hits: no body, no params", async () => {
    const r = await run(searchEffectsTool, { query: "mask" });
    const keys = Object.keys(hits(r)[0]!);
    expect(keys).not.toContain("body");
    expect(keys).not.toContain("params");
  });

  it("adds passages from the case study to the top hits", async () => {
    const r = await run(searchEffectsTool, { query: "voronoi" });
    expect(hits(r)[0]!.slug).toBe("ice-logo");
    expect(hits(r)[0]!.passages?.join(" ")).toMatch(/Voronoi/);
  });

  it("filters by tag slug or label", async () => {
    const bySlug = hits(await run(searchEffectsTool, { tags: ["css-mask"], limit: 20 })).map((h) => h.slug);
    const byLabel = hits(await run(searchEffectsTool, { tags: ["CSS Mask"], limit: 20 })).map((h) => h.slug);
    expect(bySlug.length).toBeGreaterThan(0);
    expect(byLabel).toEqual(bySlug);
    expect(bySlug).toContain("venetian-blind");
    expect(bySlug).not.toContain("ice-logo");
  });

  it("filters by tech", async () => {
    const r = await run(searchEffectsTool, { tech: ["webgl"], limit: 20 });
    expect(hits(r).map((h) => h.slug)).toEqual(expect.arrayContaining(["ice-logo", "ripple-reveal-webgl"]));
  });

  it("lists newest first with no query, and caps the limit", async () => {
    const r = await run(searchEffectsTool, { limit: 99 });
    expect(hits(r).length).toBe(Math.min(20, feed.items.length));
    const dates = feed.items.map((i) => i.date).sort().reverse();
    expect(dates[0]).toBeTruthy();
  });

  it("filters by section, slug or label", async () => {
    const ui = hits(await run(searchEffectsTool, { section: "ui", limit: 20 })).map((h) => h.slug);
    const uiLabel = hits(await run(searchEffectsTool, { section: "UI", limit: 20 })).map((h) => h.slug);
    expect(ui).toEqual(["css-tab-shape"]);
    expect(uiLabel).toEqual(ui);
    const web = hits(await run(searchEffectsTool, { section: "Web design", limit: 20 })).map((h) => h.slug);
    expect(web).not.toContain("css-tab-shape");
    expect(web).toContain("ice-logo");
  });

  it("filters by kind and returns it on each hit", async () => {
    const r = await run(searchEffectsTool, { kind: "transition", limit: 20 });
    const slugs = hits(r).map((h) => h.slug);
    expect(slugs).toEqual(expect.arrayContaining(["venetian-blind", "ripple-reveal", "ripple-reveal-webgl"]));
    expect(slugs).not.toContain("ice-logo");
    expect((hits(r)[0] as Hit & { kind: string }).kind).toBe("Transition");
    const cursor = hits(await run(searchEffectsTool, { kind: "Cursor", section: "web" })).map((h) => h.slug);
    expect(cursor).toEqual(["ice-logo"]);
  });

  it("says so when nothing matches", async () => {
    const r = await run(searchEffectsTool, { query: "zzzz-nothing" });
    expect(hits(r)).toEqual([]);
    expect((r.data as { note: string }).note).toMatch(/list_tags/);
  });
});

describe("get_effect", () => {
  it("gives params with ranges and help, embed, install and usage", async () => {
    const e = effectOf(await run(getEffectTool, { slug: "ice-logo" }));
    const maxBroken = e.params.find((p: { key: string }) => p.key === "maxBroken");
    expect(maxBroken).toMatchObject({ attr: "data-max-broken", type: "number", default: 30, min: 2, max: 100 });
    expect(maxBroken.help).toMatch(/Toughness/);
    expect(e.embed.html).toContain('<script src="https://vanilla-motion.com/embed/ice-logo/1.0.0/ice-logo.js"></script>');
    expect(e.embed.html).toContain("<div data-ice-logo");
    expect(e.install.anyProject).toBe("npx vanilla-motion add ice-logo");
    expect(e.install.shadcn).toBe("npx shadcn@latest add https://vanilla-motion.com/r/ice-logo.json");
    expect(e.install.dependencies).toContain("three@0.185.1");
    expect(e.usage).toContain("mount(");
    expect(e.links.skill).toBe("https://vanilla-motion.com/ice-logo/skill.md");
  });

  it("leaves unknown values out instead of null", async () => {
    const e = effectOf(await run(getEffectTool, { slug: "venetian-blind" }));
    for (const p of e.params) expect(Object.values(p)).not.toContain(null);
  });

  it("not_found with the closest slugs", async () => {
    await expect(run(getEffectTool, { slug: "ice-logos" })).rejects.toMatchObject({ code: "not_found", message: expect.stringMatching(/ice-logo/) });
  });

  it("a draft effect is not_found", async () => {
    await expect(run(getEffectTool, { slug: "moving-border" })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("get_skill / get_case_study", () => {
  it("fetches skill.md from the site and caches it", async () => {
    const r = await run(getSkillTool, { slug: "ice-logo" });
    expect((r.data as { markdown: string }).markdown).toContain("https://vanilla-motion.com/ice-logo/skill.md");
    await run(getSkillTool, { slug: "ice-logo" });
    expect(fetched.filter((u) => u.endsWith("ice-logo/skill.md")).length).toBe(1);
  });

  it("fetches case-study.md", async () => {
    const r = await run(getCaseStudyTool, { slug: "venetian-blind" });
    expect((r.data as { url: string }).url).toBe("https://vanilla-motion.com/venetian-blind/case-study.md");
  });

  it("caps long Markdown with truncated", async () => {
    docBody = () => "x".repeat(MAX_DOC_CHARS + 10);
    const r = await run(getCaseStudyTool, { slug: "ice-logo" });
    expect((r.data as { markdown: string; truncated: boolean }).truncated).toBe(true);
    expect((r.data as { markdown: string }).markdown.length).toBe(MAX_DOC_CHARS);
  });

  it("unknown slug is not_found", async () => {
    await expect(run(getSkillTool, { slug: "nope" })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("list_tags", () => {
  it("groups the taxonomy by category with effect counts", async () => {
    const r = await run(listTagsTool, {});
    const groups = (r.data as { groups: { category: string; tags: { slug: string; effects: number }[] }[] }).groups;
    const css = groups.find((g) => g.category === "CSS technique")!;
    expect(css.tags.find((t) => t.slug === "css-mask")!.effects).toBeGreaterThan(0);
    const section = groups.find((g) => g.category === "Section")!;
    expect(section.tags.find((t) => t.slug === "ui")!.effects).toBe(1);
    const kind = groups.find((g) => g.category === "Kind")!;
    expect(kind.tags.find((t) => t.slug === "transition")!.effects).toBe(3);
  });

  it("filters by category, case ignored", async () => {
    const r = await run(listTagsTool, { category: "rendering" });
    const groups = (r.data as { groups: { category: string }[] }).groups;
    expect(groups.map((g) => g.category)).toEqual(["Rendering"]);
  });
});

describe("add_effect prompt", () => {
  it("names the tools and the request", () => {
    const text = addEffectPrompt.render({ what: "a hover effect for the logo" });
    expect(text).toContain("a hover effect for the logo");
    for (const t of ["search_effects", "get_effect", "get_skill"]) expect(text).toContain(t);
  });
});
