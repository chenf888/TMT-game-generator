# TMT Game Generator — an agent skill for The Modding Tree

A [SKILL.md-format](https://agentskills.io) agent skill that generates **complete, playable,
balanced [The Modding Tree](https://github.com/Acamaeda/Modding-Tree) (TMT v2.7) incremental
games** from a short conversation. Load it into any agent tool that supports skills
(ZCode, Claude Code, Codex, Cursor, …), say "make me an incremental game about X", and the
agent runs the full pipeline: interview → data-driven design brief → scaffold → code
generation → static checks → balance walkthrough → test handoff.

The skill is **self-contained and portable**: the AI handbook, machine-readable design
parameters, checker scripts, and the TMT engine template itself all ship inside this folder.
No dataset downloads, no workspace-specific paths — install it anywhere.

## What you get

Games are held to a concrete quality bar (verified by two full play-throughs during
development — a 25-layer and a 10-layer generated game):

- Opens `index.html` and plays immediately: full prestige-layer chain, balanced number
  curves, automation milestones, achievements, reachable endgame, zero console errors,
  working save/load.
- **Theme is structure** — the theme dictates the tree topology, currencies, and ceilings
  (hard caps for exam scores, percentages, etc.), not just names.
- **Data-driven balance** — requires ladders, cost curves, exponent falloff, and automation
  ladders come from measured statistics across 132 real published TMT games.
- **Fun-density quotas** — effect-kind diversity (K1–K8), microtabs content organization,
  and mechanic variety (challenges, clickables, bars, secondary currencies, active loops)
  are quota-checked per blueprint, because measured 8+/10 games separate on mechanic
  variety, not layer count.
- **The engine author's own design notes, built in.** Acamaeda's guidance (2020–2023) is
  folded in as `references/design/12`: pacing targets, upgrade/buyable discipline, cost-before-
  softcap, threshold gates, readability. Where it disagreed with our corpus statistics, **it won**
  — four previously-taught positions were corrected, and §0 of chapter 12 lists them.
- **Corpus-calibrated numbers** — measured over **every component of 329 real TMT games**
  (1,156 layers, 29,141 components, every figure traceable to file + line). This is what
  produced the wiring rule: **54.4% of real upgrades carry no `effect()` at all**, because
  their power is a branch in the layer's `gainMult()`. See `references/design/11`.
- **53-rule static checker** — every hard rule and every regression caught in real
  generated games is automated (`scripts/static_checks.js`): Decimal discipline, row
  contiguity, requires monotonicity, dead-end unlock upgrades, self-scaling compounding
  budgets, achievement visibility, **effects that nothing consumes**, unread engine fields,
  flat cost ladders, and all-flat gain curves.

## Requirements

- Any agent tool that loads SKILL.md skills (see Install).
- **Node.js ≥ 18** on PATH — used by `scripts/scaffold.js` (scaffolding) and
  `scripts/static_checks.js` (post-generation checks). No npm packages; both scripts are
  dependency-free.
- Any static file server to play the result (`npx http-server <folder>`,
  `python -m http.server`, VS Code Live Server, …).

## Install

The folder **is** the skill — copy it (keeping the folder name) into your tool's skills
directory:

| Tool | User-level (all projects) | Project-level (this repo only) |
|---|---|---|
| **ZCode** | `~/.zcode/skills/tmt-game-generator/` or `~/.agents/skills/tmt-game-generator/` | `<repo>/.zcode/skills/tmt-game-generator/` or `<repo>/.agents/skills/tmt-game-generator/` |
| **Claude Code** | `~/.claude/skills/tmt-game-generator/` | `<repo>/.claude/skills/tmt-game-generator/` |
| **Other tools** (Codex, Cursor, anything reading Agent Skills) | the tool's user skills directory | the tool's project skills directory |

On Windows, `~` is your user folder (`C:\Users\<you>`). After installing, start a new
session and the skill triggers on requests like:

- "Make me an incremental game about bees"
- "Build a prestige tree game where you breed dragons"
- "Generate a TMT mod tree / modding tree game"

You can also invoke it explicitly where the tool supports it (`/tmt-game-generator`).

## How the pipeline works

| Stage | What happens |
|---|---|
| 1. Interview | ≤7 structured questions: theme-structure confirmation, scale (locks a small/medium/large blueprint), natural ceilings, pacing & interactivity, side content, automation/timewall tolerance, language & style |
| 2. Design brief | A layer-chain table (one row per layer — the code-generation contract) filled from `assets/blueprints.json` + `assets/balance-defaults.json` + `assets/fun-quota.json`, self-checked against 11 rules before any code exists |
| 3. Scaffold | `node scripts/scaffold.js "Game Name" <dir>` copies the bundled TMT template, patches `js/mod.js` (unique permanent `modInfo.id`, name, author, modFiles, charset meta), self-verifies and syntax-checks the result |
| 4. Generate | Layer files bottom-row-first per the brief: Decimal-safe code, **every upgrade classified token-vs-value and wired to a consumer**, effect-kind diversity plan, tabFormat/microtabs organization, M1–M10 mechanics, automation ladder, softcaps, theming |
| 5. Static checks | `node scripts/static_checks.js <game-folder>` — FAIL blocks manual testing; WARNs need a written justification in the brief |
| 6. Balance walkthrough | Era-by-era reachability estimate against the measured heuristics + multiplier-zone compounding audit; rebalance the brief, not the code |
| 7. Test handoff | Serve, play, and verify against the checklist (console clean, first prestige in minutes, save/load, offline cap, endgame) |

References load **on demand** (`references/core/00–08` engine handbook,
`references/design/09–12` design patterns, fun mechanics, corpus-calibrated numeric
design, and the engine author's own notes), keeping context small.

## Folder layout

```
tmt-game-generator/
├── SKILL.md                  # the skill: frontmatter + full 7-stage pipeline
├── references/
│   ├── core/                 # 00–08: engine + coding handbook (Decimal rules, layers API,
│   │                         #   components, UI, idioms, pitfalls checklist, real-game catalog)
│   └── design/               # 09–10: 17 design patterns + blueprints, fun-mechanics handbook
├── assets/
│   ├── blueprints.json       # small/medium/large progress blueprints (per-field corpus sources)
│   ├── balance-defaults.json # measured balance defaults + when-to-deviate policy
│   ├── fun-quota.json        # per-blueprint fun-density quotas + checker thresholds
│   └── design-brief-template.md
├── scripts/
│   ├── scaffold.js           # template copy + mod.js patcher (self-verifying)
│   └── static_checks.js      # 53-rule mod-code checker (FAIL/WARN/PASS report, --json)
├── tests/
│   ├── run_tests.js          # smoke suite: fixtures + scaffold e2e  → node tests/run_tests.js
│   ├── fixture-good/         # must pass with zero findings
│   ├── fixture-bad/          # injects every rule's defect; each must be caught exactly
│   └── fixture-ghost/        # unread engine fields (own fixture: adding a challenge here
│                             # would mask fixture-bad's D-MECHQUOTA regression)
└── template/                 # bundled TMT v2.7 engine template (upstream MIT licenses inside)
```

## Verifying your install

```bash
node tests/run_tests.js
```

Four smoke groups should all pass: good fixture clean, bad fixture catches every rule with
zero false positives, the ghost fixture flags exactly the unread engine fields (and does NOT
flag the valid ones — `completionLimit`, `canComplete`), and a freshly scaffolded game
(from the bundled template) passes the checker. This works from any directory the skill is installed in — no environment variables
needed. To point the scaffolder at a different engine template anyway, use
`--from <template-dir>` or the `TMT_TEMPLATE` environment variable.

## Updating the bundled template

`template/` is the upstream TMT v2.7 engine, pruned to the runnable skeleton (`docs/`,
`demo.html`, and the demo mod are omitted; both upstream MIT license files are kept). To
re-target a newer TMT release, copy the new `js/`, `css/`, `index.html`, and image assets
over `template/` (keep `js/mod.js` patchable — `scaffold.js` greps for its literals and will
tell you if the template drifted), then re-run `node tests/run_tests.js`.

## License & credits

- The skill itself (SKILL.md, references, assets, scripts, tests): **MIT** — see [LICENSE](LICENSE).
- The bundled engine template (`template/`): The Modding Tree, MIT © 2020 Acamaeda — see
  `template/LICENSE` and `template/Prestige-tree-license` (Prestige Tree, MIT © 2020 Jacorb).
- Design heuristics were extracted from a corpus of 132 public TMT games; their authors own
  their games. This skill generates original games and does not redistribute any of them.

Built with The Modding Tree by Acamaeda & contributors. Incremental-game community catalogs
(gityx.com, yhvr's list) made the corpus crawl possible.
