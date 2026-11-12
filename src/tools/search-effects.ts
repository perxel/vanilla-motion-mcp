import { z } from "zod";
import { foldText } from "../../kit/core/fold-text.js";
import { clampLimit, passages, searchItems } from "../../kit/core/search.js";
import { defineTool } from "../../kit/core/tool.js";
import { loadContent, type EffectItem } from "../content.js";
import { compactEffect } from "./shared.js";

/** Hits that get matching passages from their case study. */
export const PASSAGE_HITS = 3;

/** True when the effect carries every wanted tag (slug or label, case and accents ignored). */
function hasAll(item: EffectItem, wanted: string[] | undefined): boolean {
  if (!wanted?.length) return true;
  const have = new Set(item.tags.map((t) => foldText(t)));
  return wanted.every((w) => have.has(foldText(w)));
}

/** True when value is empty or matches the slug or its label (case and accents ignored). */
function isOne(slug: string | null, label: string | null, value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const v = foldText(value);
  return (slug !== null && foldText(slug) === v) || (label !== null && foldText(label) === v);
}

export const searchEffectsTool = defineTool({
  name: "search_effects",
  title: "Search Vanilla Motion effects",
  description:
    "Finds motion effects on vanilla-motion.com (hover, scroll, reveal, WebGL, CSS mask…) by words in their title, description, tags and case study, and/or by section (ui for interface parts like buttons and tabs, web for page and site effects), kind (reveal, transition, scroll, cursor, hover, shape…), tag and tech slugs or labels (list_tags gives the real ones). Returns compact hits, best first (newest first with no query): slug, title, excerpt, url, category (the section), kind, tags, version; the top 3 also carry passages, the case-study paragraphs that match the query. Call get_effect with a slug for params, the embed code and install commands. Default 5 results, max 20. Public effects only; the list is refreshed about every 10 minutes from the site (generatedAt in the result).",
  access: "public",
  inputSchema: z.object({
    query: z.string().optional().describe("Words to look for, e.g. 'image reveal on scroll' or 'mask'"),
    section: z.string().optional().describe("Only this section: 'ui' (interface parts: buttons, tabs, borders) or 'web' (page and site effects); labels 'UI' and 'Web design' work too"),
    kind: z.string().optional().describe("Only this kind of effect, slug or label, e.g. 'scroll', 'cursor', 'transition' (list_tags, category Kind)"),
    tags: z.array(z.string()).optional().describe("Every effect returned has all of these tags, e.g. ['css-mask']"),
    tech: z.array(z.string()).optional().describe("Every effect returned uses all of these, e.g. ['webgl'] or ['gsap']"),
    limit: z.number().optional().describe("Max results (default 5, max 20)"),
  }),
  example: "Which effects use CSS mask?",
  async execute(input, ctx) {
    const content = await loadContent(ctx.env);
    const pool = content.items.filter(
      (i) =>
        isOne(i.section, i.category || null, input.section) &&
        isOne(i.kind, i.kindLabel, input.kind) &&
        hasAll(i, input.tags) &&
        hasAll(i, input.tech),
    );
    const limit = clampLimit(input.limit);
    const query = input.query?.trim() ?? "";
    const bySlug = new Map(pool.map((i) => [i.slug, i]));
    const ranked = query
      ? searchItems(pool, query, { limit }).map((h) => bySlug.get(h.slug)!)
      : [...pool].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, limit);
    const results = ranked.map((item, i) => {
      const found = query && i < PASSAGE_HITS ? passages(item.body, query) : [];
      return { ...compactEffect(item), ...(found.length ? { passages: found } : {}) };
    });
    return {
      data: {
        generatedAt: content.generatedAt,
        results,
        ...(results.length ? {} : { note: "No effect matched. Try fewer words, or list_tags for the real tag slugs." }),
      },
      count: results.length,
    };
  },
});
