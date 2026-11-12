import { z } from "zod";
import { defineTool } from "../../kit/core/tool.js";
import { findEffect, loadContent } from "../content.js";
import { embedSnippet, mountUsage, paramView } from "./shared.js";

export const getEffectTool = defineTool({
  name: "get_effect",
  title: "Get one effect, ready to add",
  description:
    "Everything needed to put one vanilla-motion.com effect into a project: description, version, tags and tech, every param (key, its data-* attribute, type, default, min/max/step/unit or options, label, help), the public demos, the embed snippet for plain HTML sites, Webflow, Framer and WordPress (one <script> + one element; params go in as data-* attributes in kebab-case), the install commands for code projects (`npx vanilla-motion add <slug>`, or shadcn), the mount()/setParams()/dispose() usage, its npm dependencies, and the URLs of its case study, code reference (skill.md) and tuning app. Use only param keys listed here. Find slugs with search_effects. Snapshot refreshed about every 10 minutes (generatedAt).",
  access: "public",
  inputSchema: z.object({
    slug: z.string().min(1).describe("The effect's slug, e.g. 'ice-logo'"),
  }),
  example: "How do I add ice-logo to a plain HTML page?",
  async execute(input, ctx) {
    const content = await loadContent(ctx.env);
    const item = findEffect(content, input.slug);
    return {
      data: {
        generatedAt: content.generatedAt,
        effect: {
          slug: item.slug,
          title: item.title,
          description: item.excerpt,
          url: item.url,
          version: item.version,
          published: item.date,
          tags: item.labels,
          params: item.params.map(paramView),
          demos: item.demos,
          embed: {
            html: embedSnippet(item),
            note: `Each param is a data-* attribute on the element (e.g. ${item.params[0]?.attr ?? "data-…"}="…"); booleans are "true"/"false". The script starts every [${item.embed.attribute}] element on load; window.${item.embed.globalName}.init(root) starts elements added later.`,
            scriptUrl: item.embed.scriptUrl,
            requires: item.embed.requires,
          },
          install: {
            anyProject: `npx vanilla-motion add ${item.slug}`,
            shadcn: `npx shadcn@latest add ${item.registryUrl}`,
            dependencies: item.dependencies,
            files: "TypeScript source, copied into ./vanilla-motion/<slug>/ (or src/lib/vanilla-motion/<slug>/ with shadcn); any bundler compiles it.",
          },
          usage: mountUsage(item),
          links: {
            caseStudy: item.caseStudyUrl,
            skill: item.skillUrl,
            params: item.paramsUrl,
            app: item.appUrl,
          },
          next: "get_skill gives the code reference (structure, key code, how to adapt it); get_case_study explains how it works.",
        },
      },
    };
  },
});
