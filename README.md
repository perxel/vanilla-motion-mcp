# Vanilla Motion MCP

The remote MCP server for [vanilla-motion.com](https://vanilla-motion.com), Perxel's library of UI and web motion
effects in plain code. An agent in any project can find an effect, read how it works, and add it correctly: the
embed for plain sites, Webflow, Framer and WordPress, or the source and `mount()` for bundled apps, with the real
param names and ranges.

**Add it:** `https://mcp.vanilla-motion.com/mcp` as an MCP server (or custom connector) in Claude, ChatGPT, Cursor,
VS Code or any app that supports MCP. Public, no sign-in.

| Tool | What it returns |
|---|---|
| `search_effects` | Compact hits by words, tags or tech, with matching case-study passages on the top 3 |
| `get_effect` | Params (data-* attribute, default, range, help), embed snippet, install commands, mount() usage, links |
| `get_skill` | The effect's `skill.md`: code reference written for agents |
| `get_case_study` | The effect's case study as Markdown |
| `list_tags` | The tag and tech vocabulary, grouped by category |

Prompt: `add_effect` ("a hover effect for the logo") runs search → get_effect → get_skill and writes the integration.

## How it works

Built from [perxel-mcp-kit](https://github.com/perxel/perxel-mcp-kit) (kit docs: `KIT-README.md`, the checklist:
`STANDARD.md`; `kit/` is never edited here, updates come from `pnpm kit:update`). Everything the MCP knows comes from
`https://vanilla-motion.com/content.json`, which the site writes on every build (`scripts/build-content.mjs` in
`perxel/vanilla-motion`, plan 003). The Worker re-checks it about every 10 minutes with `If-None-Match`, so a site
deploy reaches the MCP with no redeploy here. `get_skill` and `get_case_study` fetch the per-effect Markdown from the
site and cache it the same way. Draft and unlisted effects never reach `content.json`.

- Worker `vm-mcp` on `mcp.vanilla-motion.com`: `/mcp`, `/` (docs), `/health`, `/dash` (Access-protected).
- `src/content.ts`: the zod schema of `content.json`; `src/fixtures/content.json` is a copy of a real one for tests
  (refresh it from the site's `dist/content.json` when the shape changes).
- `src/tools/`, `src/prompts.ts`, `mcp.config.ts`, `evals/questions.md`.

## Commands

`pnpm dev` (local Worker on :8788 + Inspector), `pnpm typecheck && pnpm test`, `pnpm eval --url
http://localhost:8788/mcp`, `pnpm setup:cloudflare` (owner only; see `KIT-README.md` → Deploy). Pushes to `main`
deploy through `.github/workflows/deploy.yml` once its two secrets are set.
