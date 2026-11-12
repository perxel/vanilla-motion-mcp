import { z } from "zod";
import { foldText } from "../../kit/core/fold-text.js";
import { defineTool } from "../../kit/core/tool.js";
import { loadContent } from "../content.js";

export const listTagsTool = defineTool({
  name: "list_tags",
  title: "List the tags and tech",
  description:
    "The closed list of slugs vanilla-motion.com uses, grouped by category, each with its label and how many public effects carry it: Section and Kind (one each per effect: search_effects' section and kind filters), then tag and tech categories (CSS technique, Interaction, Rendering…: search_effects' tags and tech filters).",
  access: "public",
  inputSchema: z.object({
    category: z.string().optional().describe("Only this category, e.g. 'CSS technique' (case ignored)"),
  }),
  example: "What kinds of effects are there?",
  async execute(input, ctx) {
    const content = await loadContent(ctx.env);
    // Section and Kind are fields of their own (a kind slug like "scroll" can also be a tag), so
    // they are counted by category.
    const uses = new Map<string, number>();
    const add = (key: string) => uses.set(key, (uses.get(key) ?? 0) + 1);
    for (const item of content.items) {
      for (const t of new Set(item.tags)) add(`tag:${t}`);
      if (item.section) add(`Section:${item.section}`);
      if (item.kind) add(`Kind:${item.kind}`);
    }
    const count = (t: { slug: string; category: string }) =>
      uses.get(t.category === "Section" || t.category === "Kind" ? `${t.category}:${t.slug}` : `tag:${t.slug}`) ?? 0;
    const want = input.category ? foldText(input.category) : null;
    const groups: { category: string; tags: { slug: string; label: string; effects: number }[] }[] = [];
    for (const t of content.taxonomy) {
      if (want && foldText(t.category) !== want) continue;
      let g = groups.find((x) => x.category === t.category);
      if (!g) groups.push((g = { category: t.category, tags: [] }));
      g.tags.push({ slug: t.slug, label: t.label, effects: count(t) });
    }
    return {
      data: {
        groups,
        ...(groups.length ? {} : { note: `No category "${input.category}". Categories: ${[...new Set(content.taxonomy.map((t) => t.category))].join(", ")}` }),
      },
      count: groups.reduce((n, g) => n + g.tags.length, 0),
    };
  },
});
