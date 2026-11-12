import { z } from "zod";
import { foldText } from "../../kit/core/fold-text.js";
import { defineTool } from "../../kit/core/tool.js";
import { loadContent } from "../content.js";

export const listTagsTool = defineTool({
  name: "list_tags",
  title: "List the tags and tech",
  description:
    "The closed list of tag and tech slugs vanilla-motion.com uses (CSS technique, Interaction, Rendering, Tech…), grouped by category, each with its label and how many public effects carry it. Use the slugs as search_effects' tags or tech filters.",
  access: "public",
  inputSchema: z.object({
    category: z.string().optional().describe("Only this category, e.g. 'CSS technique' (case ignored)"),
  }),
  example: "What kinds of effects are there?",
  async execute(input, ctx) {
    const content = await loadContent(ctx.env);
    const uses = new Map<string, number>();
    for (const item of content.items) for (const t of new Set([...item.tags])) uses.set(t, (uses.get(t) ?? 0) + 1);
    const want = input.category ? foldText(input.category) : null;
    const groups: { category: string; tags: { slug: string; label: string; effects: number }[] }[] = [];
    for (const t of content.taxonomy) {
      if (want && foldText(t.category) !== want) continue;
      let g = groups.find((x) => x.category === t.category);
      if (!g) groups.push((g = { category: t.category, tags: [] }));
      g.tags.push({ slug: t.slug, label: t.label, effects: uses.get(t.slug) ?? 0 });
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
