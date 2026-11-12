import { z } from "zod";
import { defineTool, ToolError } from "../../kit/core/tool.js";
import { findEffect, loadContent } from "../content.js";
import { fetchDoc, MAX_DOC_CHARS } from "./shared.js";

const slugInput = z.object({ slug: z.string().min(1).describe("The effect's slug, e.g. 'venetian-blind'") });

export const getCaseStudyTool = defineTool({
  name: "get_case_study",
  title: "Read an effect's case study",
  description: `The case study of one vanilla-motion.com effect as Markdown: how it works, why it was built that way, when to use it, with code and links to live demos. Capped at ${MAX_DOC_CHARS} characters (truncated is true when the url has the rest). Find slugs with search_effects.`,
  access: "public",
  inputSchema: slugInput,
  example: "Explain how venetian-blind staggers its strips.",
  async execute(input, ctx) {
    const content = await loadContent(ctx.env);
    const item = findEffect(content, input.slug);
    if (!item.caseStudyUrl) throw new ToolError("not_found", `${item.slug} has no case study yet: see ${item.url}`);
    const doc = await fetchDoc(item.caseStudyUrl, content.siteUrl, ctx.env);
    return { data: { slug: item.slug, url: item.caseStudyUrl, markdown: doc.text, truncated: doc.truncated } };
  },
});

export const getSkillTool = defineTool({
  name: "get_skill",
  title: "Read an effect's code reference",
  description: `The code reference (skill.md) of one vanilla-motion.com effect as Markdown, written for agents: how to use it (embed and mount()), a params table, the markup, the key CSS/JS/shader code with comments, variants, how to adapt it, browser support and accessibility. Read it before writing the integration. Capped at ${MAX_DOC_CHARS} characters. Find slugs with search_effects.`,
  access: "public",
  inputSchema: slugInput,
  example: "Show me the key code of horizontal-sticky-stack.",
  async execute(input, ctx) {
    const content = await loadContent(ctx.env);
    const item = findEffect(content, input.slug);
    if (!item.skillUrl) throw new ToolError("not_found", `${item.slug} has no skill.md yet: use get_effect and get_case_study`);
    const doc = await fetchDoc(item.skillUrl, content.siteUrl, ctx.env);
    return { data: { slug: item.slug, url: item.skillUrl, markdown: doc.text, truncated: doc.truncated } };
  },
});
