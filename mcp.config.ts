import { defineConfig } from "./kit/core/config.js";
import { addEffectPrompt } from "./src/prompts.js";
import { getCaseStudyTool, getSkillTool } from "./src/tools/get-docs.js";
import { getEffectTool } from "./src/tools/get-effect.js";
import { listTagsTool } from "./src/tools/list-tags.js";
import { searchEffectsTool } from "./src/tools/search-effects.js";

export default defineConfig({
  slug: "vanilla-motion",
  name: "Vanilla Motion MCP",
  version: "0.1.0",
  description:
    "Find a motion effect on vanilla-motion.com, learn how it works, and add it to any project: the embed for plain sites, Webflow, Framer and WordPress, or the source and mount() for code. Public, no sign-in.",
  instructions:
    "Vanilla Motion is Perxel's library of UI and web motion effects in plain code. To add one: search_effects, then get_effect (params, embed, install), then get_skill (code reference). Use only the param keys get_effect lists. Embed for no-code sites; `npx vanilla-motion add <slug>` + mount() for bundled apps.",
  scopes: {},
  tools: [searchEffectsTool, getEffectTool, getSkillTool, getCaseStudyTool, listTagsTool],
  prompts: [addEffectPrompt],
  docs: { contact: "hello@perxel.com" },
});
