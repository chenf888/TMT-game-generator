# TMT Game Generator — an agent skill for The Modding Tree

A [SKILL.md-format](https://agentskills.io) agent skill that generates **complete, playable,
balanced [The Modding Tree](https://github.com/Acamaeda/The-Modding-Tree) (TMT v2.7) incremental
games** from a short conversation. Load it into any agent tool that supports skills
(ZCode, Claude Code, Codex, Cursor, …), say "make me an incremental game about X", and the
agent runs the full pipeline: interview → data-driven design brief → scaffold → code
generation → static checks → balance walkthrough → test handoff.

The skill is **self-contained and portable**: the AI handbook, machine-readable design
parameters, checker scripts, and the TMT engine template itself all ship inside this folder.
No dataset downloads, no workspace-specific paths — install it anywhere.

## What you get

Games are held to a concrete quality bar (verified across **nine full generated games**
during development — a 25-layer large blueprint, a 10-layer medium, a 104-layer postmortem
source, a one-layer 100-hour monolith, a 16.7-million-layer colour cube, and more):

- Opens `index.html` and plays immediately: full prestige-layer chain, balanced number
  curves, automation milestones, achievements, reachable endgame, zero console errors,
  working save/load.
- **Theme is structure** — the theme dictates the tree topology, currencies, and ceilings
  (hard caps for exam scores, percentages, etc.), not just names.
- **Data-driven balance** — requires ladders, cost curves, exponent falloff, and automation
  ladders come from measured statistics across 132 real published TMT games.
- **Fun-density quotas** — effect-kind diversity (K1–K9), microtabs content organization,
  and mechanic variety (M1–M21: farm challenges, bosses, gacha, casino, story chapters,
  crafting, check-backs, erosion, …) are quota-checked per blueprint, because measured 8+/10
  games separate on mechanic variety, not layer count.
- **The engine author's own design notes, built in.** Acamaeda's guidance (2020–2023) is
  folded in as `references/design/12`: pacing targets, upgrade/buyable discipline, cost-before-
  softcap, threshold gates, readability. Where it disagreed with our corpus statistics, **it won**
  — four previously-taught positions were corrected, and §0 of chapter 12 lists them.
- **Corpus-calibrated numbers** — measured over **every component of 329 real TMT game
  files** (132 games; 1,156 layers, 29,141 components, every figure traceable to file +
  line). This is what produced the wiring rule: **54.4% of real upgrades carry no `effect()`
  at all**, because their power is a branch in the layer's `gainMult()`. See
  `references/design/11`.
- **Type recognition, then per-type generation** — the interview locks a *game type*
  alongside the scale blueprint (interaction model, orthogonal to small/medium/large):
  `passive-prestige`, `active-click`, `active-tick`, or `board-minigame`. The type decides
  which components are mandatory, which are forbidden, and which acceptance rules apply —
  a passive game is explicitly **exempt** from the "you need tick logic" rule, while an
  active-click game must pass a clickable contract the old checker never checked. Ten
  stackable **modifiers** (registry v1.1.0) add optional mechanics with hard dependencies:
  `score-attack`, `minigame`, `boss-rush`, `gacha`, `casino`, `story`, and the structural
  `sim`/`board`/`challenges`/`caps`. See `references/design/13`.
- **The pipeline verifies the game, not just the source.** An 84-rule static checker reads the
  code; a load-time harness runs it and a pacing simulator plays it. All three were added because
  real briefs kept passing every text-level rule and then failing in play.
- **84-rule static checker** — every hard rule and every regression caught in real
  generated games is automated (`scripts/static_checks.js`): Decimal discipline, row
  contiguity, requires monotonicity, dead-end unlock upgrades, self-scaling compounding
  budgets, achievement visibility, **effects that nothing consumes**, unread engine fields,
  flat cost ladders, all-flat gain curves, the three type rules
  (`T-CLICKABLE`, `T-GRID`, `T-TICKREG`), pattern guardrails from the 63-pattern library
  (softcap-segment typos, gacha bus arrays, farm-challenge pairing, implicit globals,
  layer-knockout coverage, per-tick +1 auto-buys), and **D-QLEDGER** — the audit that every
  interview question was actually asked and answered by the user. Rules are gated per type:
  a game with no declared type is checked exactly as before.

## Requirements

- Any agent tool that loads SKILL.md skills (see Install).
- **Node.js ≥ 18** on PATH — used by `scripts/scaffold.js` (scaffolding),
  `scripts/static_checks.js` (post-generation checks), `scripts/i18n_check.js` (text-layer
  integrity) and the two harness scripts under `assets/harness/`. No npm packages; all five are
  dependency-free.
- Any static file server to play the result (`npx http-server <folder>`,
  `python -m http.server`, VS Code Live Server, …).

## Install

Build the package first, then install it:

```bash
node scripts/pack.js          # -> dist/tmt-game-generator/  (fails if name ≠ directory name)
```

The package **is** the skill: copy that directory, keeping its name, into your tool's skills
directory. `pack.js` exists because the platform requires `SKILL.md`'s `name` to equal the
shipped directory name, and a development checkout is rarely named that way — the script builds
the conformant directory and refuses to build one where the two disagree. It also reports the
size against the 3 MB package limit and the 64 KB body limit.

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
| 1. Interview | ≤8 structured questions: theme-structure confirmation, scale (locks a small/medium/large blueprint), natural ceilings, pacing & interactivity, side content, automation/timewall tolerance, language & style, **endgame flavor** — plus **Q4b locks the game type**: `node scripts/classify.js` proposes a route, the user confirms it, and a **modifier multi-select** (boss-rush / gacha / casino / story / …) asks which optional mechanics to include. Every answer lands in the brief's question ledger; nothing is ever auto-answered on the user's behalf |
| 2. Design brief | `design-brief.md` written **into the game folder**: a layer-chain table (one row per layer — the code-generation contract) filled from `assets/blueprints.json` + `assets/type-registry.json` + `assets/balance-defaults.json` + `assets/fun-quota.json`, self-checked against 23 rules, then **confirmed by the user** before any code exists |
| 3. Scaffold | `node scripts/scaffold.js "Game Name" <dir> --type <id> --modifier a,b` copies the bundled TMT template, patches `js/mod.js` (unique permanent `modInfo.id`, name, author, modFiles, charset meta), writes `.tmt-profile.json`, self-verifies and syntax-checks the result. A modifier whose hard dependency is unmet is **downgraded with a reason, never silently dropped** |
| 4. Generate | Layer files bottom-row-first per the brief: Decimal-safe code, **every upgrade classified token-vs-value and wired to a consumer**, effect-kind diversity plan, tabFormat/microtabs organization, M1–M21 mechanics, automation ladder, softcaps, theming |
| 5. Static checks | `node scripts/static_checks.js <game-folder>` — reads `.tmt-profile.json` and applies that type's gates, exemptions and per-blueprint thresholds; FAIL blocks manual testing; WARNs need a written justification in the brief. Plus `node scripts/i18n_check.js` when the game has a `js/lang/` text layer |
| 5.5 Load-time smoke | `node tools/smoke.js` (copied from `assets/harness/`) — the real mod files loaded in Node: load-time throws, duplicate layer ids, `startData` contract, NaN/undefined hooks against a fresh save. 0 FAIL before the browser opens |
| 6. Balance walkthrough | **Measured, not estimated.** `node tools/simulate.js` drives the real economy and reports the first-purchase time, each layer's first prestige and the total to `isEndgame()`. Three real briefs passed every static rule and were then overturned by play (8–18 h promised → 2.5 h delivered; 28-second detonation; six automation steps with unreachable thresholds). Rebalance the brief, not the code |
| 6.5 Browser verification | The generator itself opens the served game: `__bootErrors` empty, every layer tab and microtab opens, one real prestige per layer kind, save→reload intact, console clean. Three builds shipped browser-only breakages before this stage existed (boot race, self-wiping prestige, a render throw that froze the page on "Loading..."). Fixes are recorded in brief §12 |
| 7. Test handoff | Serve, play, and verify against the checklist (console clean, first prestige in minutes, save/load, offline cap, endgame) |

References load **on demand** (`references/core/00–08` engine handbook,
`references/design/09–15` — 63 design patterns (P1–P63, from the corpus crawl plus full-game
deep-reads), fun mechanics & content organization (M1–M21), corpus-calibrated numeric design,
the engine author's own notes, the game-type judgment guide, measurement & harness, and the
text layer), keeping context small.

## Folder layout

```
tmt-game-generator/
├── SKILL.md                  # the skill: frontmatter + full 7-stage pipeline
├── references/
│   ├── core/                 # 00–08: engine + coding handbook (Decimal rules, layers API,
│   │                         #   components, UI, idioms, pitfalls checklist, real-game catalog)
│   └── design/               # 09–15: design patterns + blueprints, fun-mechanics handbook,
│                             #   corpus-calibrated numerics, author's notes, game-type guide,
│                             #   14 measurement & harness (stage 6 is a measurement),
│                             #   15 the text layer / localisation beyond a two-way ternary
├── assets/
│   ├── blueprints.json       # small/medium/large progress blueprints (per-field corpus sources)
│   ├── type-registry.json    # game types: verdict signals, code contracts, rule exemptions,
│   │                         #   10 modifiers + hard dependencies (v1.1.0), routing weights
│   │                         #   (add a type here)
│   ├── balance-defaults.json # measured balance defaults + when-to-deviate policy
│   ├── fun-quota.json        # per-blueprint fun-density quotas + the thresholds the
│   │                         #   checker READS AT RUN TIME
│   ├── design-brief-template.md  # with the §2 question ledger the checker audits (D-QLEDGER)
│   └── harness/              # copy into <game>/tools/ — these RUN the game, they don't read it
│       ├── smoke.js          #   load-time harness (stage 5.5): loads the real mod files with
│       │                     #   engine stubs; catches load-time throws, duplicate ids,
│       │                     #   startData contract breaks, NaN hooks on a fresh save
│       └── simulate.js       #   headless greedy playthrough (stage 6): ports js/game.js's
│                             #   prestige formulas and reports real pacing numbers
├── scripts/
│   ├── classify.js           # game-type scorer (exit 0 routed / 3 ask / 1 error);
│   │                         #   also reads an existing design brief
│   ├── scaffold.js           # template copy + mod.js patcher + .tmt-profile.json writer
│   ├── pack.js               # builds dist/<name>/ — the shippable package the platform
│   │                         #   requires (frontmatter + directory name must match `name`)
│   ├── static_checks.js      # 84-rule mod-code checker (FAIL/WARN/PASS report, --json,
│   │                         #   --profile <typeId> | --no-profile)
│   └── i18n_check.js         # text-layer integrity (missing keys, duplicate language codes,
│                             #   duplicate endonyms, pack parity, placeholder tokens);
│                             #   silent no-op when the game has no js/lang/ directory
├── tests/
│   ├── run_tests.js          # smoke suite: fixtures + scaffold e2e + the type layer
│   ├── types.test.js         # type routing, registry contract, T-* rules
│   ├── fixture-good/         # must pass with zero findings
│   ├── fixture-bad/          # injects every rule's defect; each must be caught exactly
│   ├── fixture-bad/js/defects.js  # the phase-⑨ structural defects: a runtime factory, a
│   │                         #   duplicate component id, a self-funding buyable, a
│   │                         #   componentStyles `this`, a lying display, a dead automation
│   │                         #   promise, a sub-1e-4 price, untranslatable engine chrome
│   ├── fixture-ghost/        # unread engine fields (own fixture: adding a challenge here
│   │                         #   would mask fixture-bad's D-MECHQUOTA regression)
│   └── fixture-types/        # interactive/ (one defect per T-* rule), passive/ (proves the
│                             #   D-NOUPDATE exemption), unprofiled/ (byte-level control)
└── template/                 # bundled TMT v2.7 engine template (upstream MIT licenses inside)
```

## Verifying your install

```bash
node tests/run_tests.js
```

Five smoke groups should all pass: good fixture clean, bad fixture catches every rule with
zero false positives, a freshly scaffolded game (from the bundled template) passes the
checker, the ghost fixture flags exactly the unread engine fields (and does NOT flag the
valid ones — `completionLimit`, `canComplete`), and the type layer routes correctly and
enforces its own rules. The last group includes the check that matters most for backwards
compatibility: **a game with no declared type produces no `T-*` output at all**, so its
report is byte-identical to what it was before types existed. This works from any directory the skill is installed in — no environment variables
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
