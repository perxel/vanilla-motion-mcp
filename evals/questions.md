# Eval questions

Each `##` section is one question: the heading is the question, each `- tool:`
line names a tool and its JSON arguments, each `- expect:` line a fact that must
appear in the tool result. All tools are public.

## Which effects use CSS mask?

- tool: search_effects {"tags": ["css-mask"], "limit": 10}
- expect: venetian-blind
- expect: ripple-reveal

## How do I add ice-logo to a plain HTML page?

- tool: get_effect {"slug": "ice-logo"}
- expect: https://vanilla-motion.com/embed/ice-logo/1.0.0/ice-logo.js
- expect: data-ice-logo

## What does maxBroken do and what's its range?

- tool: get_effect {"slug": "ice-logo"}
- expect: data-max-broken
- expect: Toughness
- expect: 100

## How do I install venetian-blind in a Vite project?

- tool: get_effect {"slug": "venetian-blind"}
- expect: npx vanilla-motion add venetian-blind

## Explain how venetian-blind staggers its strips

- tool: get_case_study {"slug": "venetian-blind"}
- expect: @property
- tool: get_skill {"slug": "venetian-blind"}
- expect: Skill Reference

## Is there a WebGL effect that reacts to the cursor?

- tool: search_effects {"query": "cursor", "tech": ["webgl"]}
- expect: ice-logo

## What tags can I filter by?

- tool: list_tags {}
- expect: css-mask
- expect: CSS technique

## An effect that doesn't exist

- tool: get_effect {"slug": "fire-logo"}
- expect: No public effect

## A draft effect stays hidden

- tool: get_effect {"slug": "moving-border"}
- expect: No public effect
