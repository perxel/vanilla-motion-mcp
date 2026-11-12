<p align="center">
  <a href="https://vanilla-motion.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/perxel/vanilla-motion-cli/main/.github/assets/logo-white.svg">
      <img src="https://raw.githubusercontent.com/perxel/vanilla-motion-cli/main/.github/assets/logo.svg" alt="Vanilla Motion" width="160">
    </picture>
  </a>
</p>

<h1 align="center">Vanilla Motion MCP</h1>

<p align="center">
  The remote MCP server for <a href="https://vanilla-motion.com">vanilla-motion.com</a>, Perxel's library of UI and web
  motion effects in plain code.<br>
  Public, no sign-in: <code>https://mcp.vanilla-motion.com/mcp</code>
</p>

---

An agent in any project can find an effect, read how it works, and add it correctly: the embed for plain sites,
Webflow, Framer and WordPress, or the source and `mount()` for bundled apps, with the real param names and ranges.

## Add it

**Claude Code**

```sh
claude mcp add --transport http vanilla-motion https://mcp.vanilla-motion.com/mcp
```

**Claude, ChatGPT:** add a custom connector with the URL `https://mcp.vanilla-motion.com/mcp`.

**Cursor, VS Code and other MCP clients**

```json
{
  "mcpServers": {
    "vanilla-motion": {
      "url": "https://mcp.vanilla-motion.com/mcp"
    }
  }
}
```

Then ask for what you want, e.g. *"add a hover effect to the logo"* or *"a slideshow transition with a ripple"*.

## Tools

| Tool             | What it returns                                                                                          |
|------------------|----------------------------------------------------------------------------------------------------------|
| `search_effects` | Compact hits by words, tags or tech, with matching case-study passages on the top 3                      |
| `get_effect`     | Params (`data-*` attribute, default, range, help), embed snippet, install commands, `mount()` usage, links |
| `get_skill`      | The effect's `skill.md`: code reference written for agents                                               |
| `get_case_study` | The effect's case study as Markdown                                                                      |
| `list_tags`      | The tag and tech vocabulary, grouped by category                                                         |

**Prompt:** `add_effect` ("a hover effect for the logo") runs `search_effects` → `get_effect` → `get_skill` and writes
the integration.

Prefer the terminal? [`npx vanilla-motion add <slug>`](https://github.com/perxel/vanilla-motion-cli) copies an
effect's source into your project.

## How it works

Built from [perxel-mcp-kit](https://github.com/perxel/perxel-mcp-kit) (kit docs: `KIT-README.md`, the checklist:
`STANDARD.md`; `kit/` is never edited here, updates come from `pnpm kit:update`). Everything the MCP knows comes from
`https://vanilla-motion.com/content.json`, which the site writes on every build (`scripts/build-content.mjs` in
[perxel/vanilla-motion](https://github.com/perxel/vanilla-motion), plan 003). The Worker re-checks it about every 10
minutes with `If-None-Match`, so a site deploy reaches the MCP with no redeploy here. `get_skill` and `get_case_study`
fetch the per-effect Markdown from the site and cache it the same way. Draft and unlisted effects never reach
`content.json`.

- Worker `vm-mcp` on `mcp.vanilla-motion.com`: `/mcp`, `/` (docs), `/health`, `/dash` (Access-protected).
- `src/content.ts`: the zod schema of `content.json`; `src/fixtures/content.json` is a copy of a real one for tests
  (refresh it from the site's `dist/content.json` when the shape changes).
- `src/tools/`, `src/prompts.ts`, `mcp.config.ts`, `evals/questions.md`.

## Development

| Command                                          |                                                     |
|--------------------------------------------------|-----------------------------------------------------|
| `pnpm dev`                                       | local Worker on `:8788` + MCP Inspector on `:8002`  |
| `pnpm typecheck && pnpm test`                    | types and tests                                     |
| `pnpm eval --url http://localhost:8788/mcp`      | run the eval questions against a server             |
| `pnpm setup:cloudflare`                          | owner only; see `KIT-README.md` → Deploy            |

Pushes to `main` deploy through `.github/workflows/deploy.yml` (Markdown-only pushes are skipped).

## License

MIT © [Perxel](https://perxel.com)
