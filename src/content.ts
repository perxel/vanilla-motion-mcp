import { z } from "zod";
import type { Env } from "../kit/core/env.js";
import { createStaticSource } from "../kit/core/static-source.js";
import type { StaticItem } from "../kit/core/search.js";
import { ToolError } from "../kit/core/tool.js";

/**
 * https://vanilla-motion.com/content.json, written by the site's scripts/build-content.mjs (plan 003
 * in perxel/vanilla-motion). The kit's static-source shape plus per-effect fields. Public effects
 * and public demos only: the site checks that before it publishes.
 */
const SUPPORTED_VERSION = 1;

const Param = z.object({
  key: z.string(),
  attr: z.string(),
  type: z.string(),
  default: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  min: z.number().nullable().default(null),
  max: z.number().nullable().default(null),
  step: z.number().nullable().default(null),
  unit: z.string().nullable().default(null),
  options: z.array(z.string()).nullable().default(null),
  label: z.string().nullable().default(null),
  section: z.string().nullable().default(null),
  help: z.string().nullable().default(null),
});
export type Param = z.infer<typeof Param>;

const Effect = z.object({
  type: z.literal("effect"),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  url: z.string(),
  category: z.string().nullable(),
  // Site plan 002: Section (ui / web, its label is category) and one kind per effect. Optional so a
  // content.json from before them still parses.
  section: z.string().nullable().default(null),
  kind: z.string().nullable().default(null),
  kindLabel: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  date: z.string().nullable(),
  tags: z.array(z.string()),
  body: z.string(),
  techUsed: z.array(z.string()).default([]),
  version: z.string(),
  caseStudyUrl: z.string().nullable(),
  skillUrl: z.string().nullable(),
  paramsUrl: z.string(),
  appUrl: z.string(),
  registryUrl: z.string(),
  embed: z.object({
    globalName: z.string(),
    scriptUrl: z.string(),
    attribute: z.string(),
    requires: z.array(z.string()).default([]),
  }),
  dependencies: z.array(z.string()).default([]),
  params: z.array(Param),
  demos: z.array(z.object({ name: z.string(), title: z.string(), url: z.string() })),
});

const TaxonomyEntry = z.object({ slug: z.string(), label: z.string(), category: z.string() });

const Feed = z.object({
  version: z.number(),
  generatedAt: z.string(),
  site: z.object({ name: z.string(), url: z.string() }).passthrough(),
  taxonomy: z.array(TaxonomyEntry).default([]),
  items: z.array(Effect),
});

/** One effect; `category` is "" when unknown so kit/core/search.ts can use it as a StaticItem. */
export interface EffectItem extends StaticItem, Omit<z.infer<typeof Effect>, "category" | "type"> {
  category: string;
  /** tags + techUsed as labels, searched alongside the slugs. */
  labels: string[];
}

export interface VmContent {
  generatedAt: string;
  siteUrl: string;
  taxonomy: z.infer<typeof TaxonomyEntry>[];
  items: EffectItem[];
}

export function parseContent(json: unknown): VmContent {
  const version = (json as { version?: unknown } | null)?.version;
  if (version !== SUPPORTED_VERSION) {
    throw new Error(`content.json version ${String(version)} is not supported (expected ${SUPPORTED_VERSION})`);
  }
  const feed = Feed.parse(json);
  const label = new Map(feed.taxonomy.map((t) => [t.slug, t.label]));
  const items = feed.items.map((e) => {
    const labels = [...new Set([...e.tags, ...e.techUsed].map((s) => label.get(s) ?? s))];
    return { ...e, category: e.category ?? "", labels, tags: [...new Set([...e.tags, ...e.techUsed, ...labels])] };
  });
  return { generatedAt: feed.generatedAt, siteUrl: feed.site.url.replace(/\/$/, ""), taxonomy: feed.taxonomy, items };
}

export const content = createStaticSource<VmContent>({
  name: "content",
  url: (env: Env) => env.CONTENT_URL ?? "",
  kvKey: "content",
  parse: parseContent,
});

export async function loadContent(env: Env): Promise<VmContent> {
  if (!env.CONTENT_URL) throw new ToolError("unavailable", "content: CONTENT_URL is not configured");
  return content.get(env);
}

/** Edit distance, for "did you mean" on an unknown slug. */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

/** The effect with this slug, or a not_found error naming the closest slugs. */
export function findEffect(data: VmContent, slug: string): EffectItem {
  const s = slug.trim().toLowerCase();
  const item = data.items.find((i) => i.slug === s);
  if (item) return item;
  const close = data.items
    .map((i) => ({ slug: i.slug, d: i.slug.includes(s) || s.includes(i.slug) ? 0 : distance(s, i.slug) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map((c) => c.slug);
  throw new ToolError("not_found", `No public effect "${slug}". Closest: ${close.join(", ")}. Use search_effects to find one.`);
}
