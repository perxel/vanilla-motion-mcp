import { z } from "zod";
import { definePrompt } from "../kit/core/prompt.js";

export const addEffectPrompt = definePrompt({
  name: "add_effect",
  title: "Add a motion effect",
  description:
    "Finds a vanilla-motion.com effect for what you describe and adds it to the current project the right way: the embed script for plain sites, Webflow, Framer and WordPress, or the source and mount() for bundled apps. Uses search_effects, get_effect and get_skill.",
  argsSchema: z.object({
    what: z.string().describe("What you want, e.g. 'a hover effect for the logo' or 'ice-logo'"),
  }),
  render: ({ what }) =>
    [
      `Add this to my project: ${what}`,
      "",
      "Use the Vanilla Motion MCP:",
      "1. search_effects to find the effect that fits (or use the slug if I named one). If two fit, say which and why, then pick one.",
      "2. get_effect for its params, embed snippet and install commands, then get_skill for its code reference.",
      "3. Look at this project before writing anything: is it a plain HTML site or a no-code builder (use the embed snippet), or does it have a bundler and package.json (run `npx vanilla-motion add <slug>`, install the listed dependencies, and call mount() from the right place in its framework, calling dispose() on unmount)?",
      "4. Write the integration. Use only param keys and data-* attributes that get_effect lists, with values inside their min/max; set only the params that matter for what I asked.",
      "5. Tell me what you added, where, and which params I may want to tune, with the effect's tuning app link.",
    ].join("\n"),
});
