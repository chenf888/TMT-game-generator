---
name: tmt-game-generator
description: 通过对话生成完整、可游玩的 The Modding Tree (TMT) v2.7 增量放置游戏：采访定参 → 数据驱动的设计文档 → 内置引擎模板脚手架 → 生成 layers 代码 → 68 条静态规则加加载期冒烟 → 无头模拟器实测节奏 → 交付可测版本。适用场景：从零制作增量/放置/点击/声望树游戏；用户点名 The Modding Tree 或 TMT；需要开箱可玩、数值平衡、控制台零报错的成品。触发词：做增量游戏、制作放置游戏、生成点击游戏、idle game、incremental game、prestige tree、modding tree、The Modding Tree、TMT 游戏、帮我做个挂机游戏、声望树游戏、升级树游戏。不用于：给已有 TMT 游戏调数值或排错；其他框架（Profectus、ExpantaNum 系）的增量游戏。
description_zh: 通过对话生成完整、可游玩的 The Modding Tree (TMT) v2.7 增量放置游戏：采访定参 → 数据驱动的设计文档 → 内置引擎模板脚手架 → 生成 layers 代码 → 68 条静态规则加加载期冒烟 → 无头模拟器实测节奏 → 交付可测版本。适用场景：从零制作增量/放置/点击/声望树游戏，或用户点名 The Modding Tree / TMT。不用于给已有 TMT 游戏调数值、排错，以及其他框架的增量游戏。
description_en: Generate a complete, playable The Modding Tree (TMT) v2.7 incremental game from a short conversation: interview the player, write a data-driven design brief, scaffold from the bundled engine template, generate layer code, run 68 static checks plus a load-time harness, measure the pacing in a headless simulator, and hand off a tested build. Use for incremental, idle, clicker, prestige-tree and modding-tree games built from scratch, or when the user names The Modding Tree / TMT. Do not use to rebalance or debug an existing TMT game, or for incremental games on other frameworks (Profectus, ExpantaNum-based engines).
version: 1.0.0
author: TMT GG
---

# TMT Game Generator

Generate a complete, playable **The Modding Tree v2.7** incremental game: the player opens
`index.html` and gets a full prestige tree with balanced numbers, automation milestones,
achievements, and a reachable endgame — no console errors, working saves.

This skill is self-contained. Everything it needs is in this folder:

| Path | Role |
|---|---|
| `references/core/00–08` | Engine + coding handbook copies (00 overview, 01 Decimal rules, 02 mod.js, 03 layers API, 04 components, 05 UI, 06 idioms, 07 pitfalls/checklist, 08 real-game catalog) |
| `references/design/09-Layer-Design-Patterns.md` | Design patterns P1–P17, blueprints, measured heuristics, anti-patterns A1–A10 |
| `references/design/10-Fun-Mechanics-and-Content-Organization.md` | The fun pass: effect-kind taxonomy K1–K8, microtabs organization standard, mechanic catalog M1–M10, per-blueprint fun quotas |
| `references/design/11-Corpus-Numeric-Design.md` | **The wiring pass**: measured numeric baselines over all 329 real games — the 54.4%-no-effect finding, cost-ladder shapes, gain-curve ratios, softcap forms, and the ghost-field table |
| `references/design/12-Author-Design-Wisdom.md` | **The author's own design notes** (Acamaeda, 2020–2023): pacing, upgrade/buyable discipline, cost-vs-softcap, gates, readability. §0 lists the four places this skill previously taught the opposite |
| `references/design/13-Types.md` | Game-type judgment aid (Q4b): the four interaction models, modifiers + hard dependencies, routing |
| `references/design/14-Measurement-and-Harness.md` | **Stage 6 as a measurement**: the load-time smoke harness, the pacing simulator, calibration doctrine, and what only a simulation can find |
| `references/design/15-Text-Layer-and-Localisation.md` | The text layer beyond a two-way ternary: `js/lang/` convention, key namespacing, the seven integrity defects, T1–T4 tiers |
| `assets/blueprints.json` | Machine-readable progress blueprints (from 09 §3) |
| `assets/balance-defaults.json` | Machine-readable measured balance defaults (from 09 §4) + `corpusBaselines` (from 11) |
| `assets/fun-quota.json` | Machine-readable fun-density quotas per blueprint (from 10 §5) |
| `assets/design-brief-template.md` | The design document you fill BEFORE coding |
| `scripts/scaffold.js` | Creates the game folder from the TMT template |
| `scripts/static_checks.js` | Post-generation static checks (FAIL/WARN/PASS report) |
| `scripts/i18n_check.js` | Text-layer integrity (only when the game has `js/lang/`; exits 0 silently otherwise) |
| `assets/harness/smoke.js` | **Load-time harness** — copy to `<game>/tools/`, run before the browser (Stage 5.5) |
| `assets/harness/simulate.js` | **Pacing simulator** — copy to `<game>/tools/`, run before rebalancing (Stage 6) |
| `template/` | Bundled TMT v2.7 engine template (verbatim minus demo/docs — upstream MIT licenses included) |

The engine template ships **bundled** at `template/`, so the skill works from any install
location. `scaffold.js` resolves it as: `--from <dir>` > `TMT_TEMPLATE` env var > bundled
`template/` > sibling `The-Modding-Tree-master` folder > cwd.

---

## Pipeline (run all stages in order — never skip ahead)

| Stage | Output | Gate to next stage |
|---|---|---|
| 1. Interview | answers mapped to generation parameters | all 7 questions answered **+ a game type locked (Q4b)** |
| 2. Design brief & self-check | filled `design-brief` doc | every self-check passes (20 checks) |
| 3. Scaffold | game folder + recorded `modInfo.id` | scaffold exits 0 |
| 4. Generate code | js/mod.js, layer files, tree.js, theming | all files written & registered; **every upgrade classified token-vs-value and, if it has an effect, wired to a consumer** |
| 5. Static checks | check report (type profile applied) | 0 FAIL (WARNs justified in brief) |
| 5.5 Load-time smoke | harness report (`tools/smoke.js`) | 0 FAIL — every mod file loads, no duplicate ids, no fresh-save crash |
| 6. Balance walkthrough | annotated numbers, **measured in-sim** | heuristic table verified **and** the sim's early timeline matches the design intent |
| 7. Manual test handoff | test instructions for the user | 07 Part D checklist handed over |

**Load references on demand, not all at once** (keeps context small):

| When | Read |
|---|---|
| Stage 1, after Q4 | `references/design/13` (§1 types + §3 routing); run `scripts/classify.js` |
| Stage 2 | `references/design/09` (fully), `references/design/10` (fully), `references/design/11` (fully), `references/design/12` (fully), all `assets/*.json`, brief template |
| Stage 4, any code | `references/core/01` (Decimal rules — mandatory before ANY code), then `02` for mod.js, `03` + `04` for layers, `06` §3 wiring map + §7 per-layer directives |
| Stage 4, design rules | wiring discipline `references/design/11` §2; gates, costs, readability `12`; fun density `10` |
| Stage 4, language scope | `references/design/15` + `scripts/i18n_check.js` (T2 and above only) |
| Stage 4, theming/UI | `references/core/05` |
| Stage 5.5–6 | `references/design/14` (smoke harness, simulator, calibration doctrine) |
| Stage 5–7 | `references/core/07` (hard rules + Part C crash table + **Part F engine facts** + Part D checklist) |
| Design inspiration | `references/core/08` (real-game catalog) |

---

## Stage 1 — Interview

Goal: ≤7 structured questions, each locking concrete generation parameters. Ask via your
tool's question UI (2–4 options + free-text "Other") or plain conversation. Output the
question text **in the user's language**; record answers in English in the brief.

**Step 0 (only if the user gave no theme):** ask what the game is about (free text), then do Q1.
If the user said "you pick the theme", propose one, say so, and continue.

**Q1 — Theme-structure interview (confirmation).** Before asking, restate your structured
understanding of the theme in exactly three lines:

- **Currencies** — what the player accumulates, in order (e.g. "study hours → subject scores → exam rank")
- **Layer topology** — which layers exist, which reset which (e.g. "4 subject layers → one exam hub")
- **Ceilings** — any natural maximum per currency (e.g. "each subject score caps at 150")

Options: `Confirmed as described` / `Adjust (explain in Other)` / `Let the AI propose the structure`.
This is the theme-is-structure question (P14): the theme must dictate the tree, not just names.

**Q2 — Scale (locks the blueprint).**
- `Small — 5–7 layers, ~2–4h` → blueprint `small`
- `Medium — 10–16 layers, ~10–30h` → blueprint `medium`
- `Large — 25+ layers, 50h+` → blueprint `large`
- `Custom — the theme cannot be expressed as a layer chain at all` → see below
The answer locks ALL structure parameters from `assets/blueprints.json` (rows, per-layer
component counts, automation ladder, endgame). Do not improvise beyond it **except** through
the custom path, which has its own contract:

**Custom blueprint contract.** Two real requests legitimately needed it: *"one layer per color —
16,777,216 layers, made feasible"* (a medium tree carrying a colour-cube completion space) and
*"one single layer, enormous content, 100+ hours"* (a `monolith`). Both are honest designs that
`small`/`medium`/`large` cannot describe. If you take this path: (1) **ask the user to confirm the
substitution** — never silently reinterpret the request; (2) **name the stock blueprint whose quotas
you are bending** and draw the fun quota from it (the monolith used the `large` row); (3) write
`blueprint: "custom"` in `.tmt-profile.json` and record the substitution in brief §10; (4) **state
which self-checks become N/A** (a single layer has no requires ladder, no row pacing, no cross-layer
gainMult web) and which are **exceeded by design** — a check that is N/A is written down as N/A,
never quietly passed; (5) do not let the custom blueprint void the type axis — Q4b still applies.

**Q3 — Natural ceilings.** Does the theme have built-in upper limits (exam score 150,
percentages, levels, distance-to-zero)?
- `Yes, hard ceilings` → capped currencies use `type: "custom"` + `softcap(x, cap, 0)` hard
  caps; their ladders STOP at the cap (P8a Gaokao pattern)
- `No, unbounded` → standard normal/static chain + P12 triple softcaps
- `Mixed` → per-currency decision in the brief's cap table

**Q4 — Pacing & interactivity.**
- `Mostly idle/AFK-friendly` → logarithmic/custom gains allowed (P8b Incrementreeverse
  pattern) + longer automation ladder (8 steps); mechanics skew to M2 score-attack challenges
  and M5 secondary currencies (progress continues while away)
- `Mostly active` → standard sqrt chains; include an interactive mechanic (M3 risk-reward
  minigame OR M4 bar+clickable active production — handbook 10 §4); at most ONE `type: "none"`
  core-loop layer built from clickables/bars/update() (P15 — use sparingly, one max)
- `Balanced` → default blueprint behavior + the blueprint's fun-quota mechanics
  (`assets/fun-quota.json`) — **and Q4b will ask what the player actually does.** "Balanced"
  is not permission to install every mechanic in the quota list; the generated game picks its
  mechanics from the locked type plus modifiers.

**Q4b — Game type (interaction model).** Q2 locked the game's *scale*; Q4b locks its *shape*.
The two axes are independent — do not merge them, and do not change the blueprint.

Derive the type from what the player **does**, never from the theme. Run:

```bash
node scripts/classify.js --request "<the user's request verbatim>" \
                         --recap "<the Q1 three-line recap>" \
                         --q4 <idle|active|balanced> [--json]
```

Exit 0 = routed. Exit 3 = the script could not decide and returns a question — **ask the
user that question verbatim, in their language, then re-run with `--explicit <typeId>`.**
Never guess past an exit-3, and never let a keyword override an explicit request.

| Type | The player… | Layers | Exempt |
|---|---|---|---|
| `passive-prestige` | accumulates / unlocks / resets, never acts | `normal`, `static` | `D-NOUPDATE` |
| `active-click` | taps, chops, presses — a discrete action | + `clickables` | — |
| `active-tick` | pushes a continuous quantity that fills over time | + `bars` + `update()` | — |
| `board-minigame` | plays on a 2D board | + `grid` | — |

Then pick modifiers, checking each hard dependency:

| Modifier | Requires | Drop it (and log why in brief §10) if… |
|---|---|---|
| `sim` | — | more than 3 layers would use it |
| `score-attack` (M2) | type `active-*` **and** `sim` | the game has no tick — M2 records a peak inside `update()`, and the engine has **no** score-attack API |
| `minigame` (M3) | type `active-*` | there are no clickables to click |
| `board`, `challenges`, `caps` | — | never |

**At most one interaction type.** Everything else is a modifier. If the user wants all of
them, ask which one is the core and treat the rest as modifiers.

**The one sanctioned override.** If the *user's own words* put different interaction models in
different parts of the game ("arbitrary gameplay", "early clicking, then board games, then pure
idle"), that is a design the type axis cannot express rather than a routing failure — one real
build ran four eras (tick → click → board → passive) in a single layer. Only when the user asked
for it, and then: declare the **primary** type, demote the rest to modifiers with their
dependencies re-checked, **forfeit every exemption** (the tick must be real), keep all `T-*` rules
active, and log the override as a numbered deviation in brief §10.

Record in brief §2: the type, the confidence, and any modifier you dropped and why.
Full judgment aid: `references/design/13`.

**Q5 — Side content.**
- `Full — challenges (M2 score-attack hub for medium+) + achievements + story/dashboard side layer`
- `Standard — challenges (M1 classic) + achievements`
- `Light — achievements only`

**Q6 — Automation & timewall tolerance.**
- `Automate everything eventually; no long walls` → full 8-step ladder, walls < 15 min
- `Classic pacing` → 4–6-step ladder, walls up to 30 min mid-game
- `Speedrun-friendly` → short walls (< 5 min), earlier automation

**Q7 — Language scope & style.** Ask for the *scope*, not a language list — the tier decides how
much of Stage 4 changes (handbook 15):
- **T1 `Single language`** — write strings inline.
- **T2 `Two languages, one toggle`** — the `P17` convention: a `window.chinesemode` flag with
  `cond ? "中文" : "English"` ternaries on user-facing strings.
- **T3 `Several complete languages, switchable`** — the `js/lang/` text layer: one
  `t(key, fallback)` accessor, complete packs, a settings dropdown. Do **not** use ternaries here.
- **T4 `Mixed / polyglot`** — T3 plus a phrase pool assigning each sentence its own language (one
  real build: 370 sentences, 370 languages).
- Optional style notes via Other: colour mood, naming voice (feeds per-layer `color`/`symbol`).

T2 and above add four mandatory items regardless of tier: lang files load **before `js/mod.js`**;
descriptions/titles/tooltips/`winText` are **functions**, never module-scope values; `main-display`
is **overridden** (it hard-codes `You have` / `(x/sec)` — 07 Part F7); `scripts/i18n_check.js`
reports 0 FAIL.

Record every answer; they are inputs to Stage 2 and must be traceable in the brief's §2 table.

---

## Stage 2 — Design brief & self-check

**Write the brief BEFORE any code.** Copy `assets/design-brief-template.md` (next to the
future game folder or in your notes) and fill every section:

1. Select the blueprint from `assets/blueprints.json` per Q2 and copy its row plan, side
   layers, automation ladder, and endgame into the layer-chain table.
2. Pull numbers from `assets/balance-defaults.json`; every deviation must be written into
   brief §10 with the default it overrides and why.
3. Complete the layer chain table — one row per layer, bottom row first, EVERY column
   (id/name/row/position/type/base/requires/exponent/components/automation granted/softcap
   plan/doReset keeps/branches). This table is the code-generation contract.
4. Fill the brief's **§4.1 fun-density table** (effect-kind plan + organization + mechanics per
   layer) and **§4b game-level fun plan** against `assets/fun-quota.json` for the locked
   blueprint: label every upgrade/milestone with an effect kind K1–K8 (handbook 10 §2), choose
   the M1–M10 mechanics the theme supports, and plan each layer's tabFormat/microtabs sections
   (handbook 10 §3).

**Self-check the brief** (fix the table, not the code, when any fails):

| # | Check | Source |
|---|---|---|
| 1 | requires ladder monotonic; adjacent rows ×10–×100 | 09 P2, §4; A1 |
| 2 | first layer requires 2–10 (mode 10) | 09 P1 |
| 3 | every main layer ≥10 upgrades + ≥3 milestones | 09 §5 A4 |
| 4 | every new layer boosts ≥2 older layers in gainMult; ≥1 upgrade boosts layer 1 | 09 P10; A7 |
| 5 | automation ladder 4–8 steps, P4 order (resetsNothing → passiveGeneration → autoPrestige → autoUpgrade), one chore per step, cross-layer grants | 09 P4; A8 |
| 6 | softcap plan for every unbounded loop; hard caps for theme ceilings | 09 P12 |
| 7 | anti-pattern sweep A1–A10: none present | 09 §5 |
| 8 | effect diversity: K1 flat-mult share within `fun-quota.json` maxK1SharePerLayer; ≥3 distinct non-K1 kinds per layer (K7 unlocks excluded from the K1 count) | 10 §2 |
| 9 | organization: tabFormat on every main layer; microtabs planned once a layer has ≥3 content groups; context display-texts (base, best, softcap warning) above tabs | 10 §3 |
| 10 | game-level fun quota met (mechanics M1–M10 count, challenge style, clickables/bars/update floors for the blueprint) | 10 §5; fun-quota.json |
| 11 | multiplier budget: **every `.times()` source is an independent multiplicative zone and zones compound** — at most ONE self-scaling upgrade per layer (reads own points, pow ≤0.5, softcapped); Σ self-exponents wired into any gainMult ≤ 0.6; product of all multiplier zones reachable when layer N+1 unlocks must stay within the requires ladder's assumed production (if end-of-row-0 sugar mult > ~1e4 the ladder is fiction) | 09 P12; static rule N-SELFTOTAL |
| 12 | **wiring plan**: every upgrade is classified in the brief as token/gate (K7, no `effect`) or value (has `effect` → the brief names its consumer, e.g. "wired into layer N `gainMult` via `hasUpgrade`"). No upgrade may sit in neither column. | 11 §2; N-UNWIRED |
| 13 | cost ladder per layer spans ≥6 orders of magnitude, with at least one deliberate drop marked as a key upgrade; ≥30% of a layer's upgrades use a `pow`/`log` shape | 11 §3–§4; D-COSTSPAN, D-EFFECTSHAPE |
| 14 | component density 8–30 per layer; challenges ≤15% of the layer's upgrade count; a layer-level `softcap` on every unbounded loop | 11 §1, §5 |
| 15 | **author pacing**: first boost reachable within 10 seconds; every reset longer than a minute pays something; a major reset speeds the game up from the first second; no hard resets ever | 12 §1; `authorPacingTargets` |
| 16 | **upgrade discipline**: one production bonus per upgrade, never 3+; no upgrade boosts another upgrade's effect (boost resources or named mechanics); layers are gated by threshold, never behind a purchase you then also pay for | 12 §3 |
| 17 | **cost before softcap**: shape with `cost()`/`requires`; use softcaps only for genuine runaway loops, and only sell a cap raise if the cap is visible | 12 §2; 09 P12 (revised) |
| 18 | **row pacing written as two constants**: `per-row time = requires step ÷ output step`, target **×1.1–×1.6**. Both numbers appear in the brief with the resulting multiplier beside them. No static rule can check this — it spans layers and generator constants | 11 §4.1 |
| 19 | **reset lifecycle**: every layer whose milestones read `best`/`total` keeps both in `doReset`; `autoPrestige` implies `resetsNothing` (compare milestone sets); no `update()` assigns `player[layer].points`; every static layer has `canBuyMax()` | 03 §4.1; N-MSDESTROY, N-AUTOWIPE, N-POINTSWRITE, N-STATICMAX |
| 20 | **type contract (Q4b)**: every module the locked type makes mandatory is planned and every forbidden one is absent; each modifier's hard dependency holds (M2 needs a tick, M3 needs clickables); every dropped modifier has a reason in §10 | 13 §1–§3; `assets/type-registry.json`; T-CLICKABLE, T-GRID |
| 21 | **measurement plan**: the brief names the pacing constants and where they live (`js/tuning.js`, read by the game *and* the simulator), and every quantity the pacing depends on is exposed as a callable function — a pacing that cannot be simulated cannot be verified | 14 §3.3; Stage 6 |

Also check no two milestones of the same layer claim the same automation grant (the Mario
Maker 2 "conflict point" incident). Gate: proceed only when all 21 checks pass.

**Write the brief so it can be refuted.** These checks verify *internal consistency*; Stage 5.5
and Stage 6 verify *the game*, and three real briefs that passed all 21 were then overturned by
measurement. Write the numbers so a later simulation can contradict them, and expect it to.

---

## Stage 3 — Scaffold

```bash
node scripts/scaffold.js "Game Name" [output-dir] [--author Name] [--points-name points] [--from /path/to/The-Modding-Tree-master] [--type <typeId>] [--modifier id,id]
```

The script copies the whole TMT template and patches `js/mod.js` (name, a unique
`modInfo.id` = slug + random suffix, author, pointsName, modFiles, VERSION 0.1, changelog
and winText placeholders; `offlineLimit` stays 1 hour). It verifies the patch and
syntax-checks the result.

`--type` / `--modifier` are **optional**. With them, the scaffolder writes
`.tmt-profile.json` into the game folder; Stage 5's checker reads it and applies that type's
gates and thresholds automatically. Omit them and nothing changes.

- **Record `modInfo.id`** from the output — it keys the localStorage savefile and must never
  change afterwards (07 rule 3).
- If template lookup fails, pass `--from <template-dir>` explicitly.
- If the output dir exists, choose another or pass `--force`.

**Scaffolding from a UI fork (`--from`).** A user may hand you their own TMT fork (one real build
did: a restyled "Nebula" fork). Before generating a single layer:
1. **Diff the engine-critical files** against the bundled template — `js/game.js`, `js/utils.js`,
   `js/technical/layerSupport.js`, `js/technical/temp.js`, `js/utils/save.js`. The lifecycle rules
   (`N-MSDESTROY`, `N-AUTOWIPE`, `N-POINTSWRITE`, `N-STATICMAX`) cite those files by line number,
   so re-verify the lines you rely on or say in the brief that you did not. Only the UI files
   (`components.js`, `canvas.js`, `displays.js`, `systemComponents.js`, `treeView.js`, `options.js`)
   may differ freely.
2. **Re-apply the canonical patches the stock template already carries.** The one that bites:
   `js/technical/displays.js:45` — a stock-based fork keeps `visibility: hidden` for uncompleted
   achievements, which is exactly what `N-ACHVIS` (FAIL) exists for. Rules are not disabled
   because the template is a fork.
3. **Record the fork in brief §10** with the engine-file verification result, then run Stage 5 and
   5.5 against *your* output — both are template-agnostic.

On success you have a runnable (empty) game. Everything below upgrades it into the real one.

---

## Stage 4 — Generate code

Read `references/core/01` first — Decimal rules are absolute. Then generate in this order:

### 4.1 `js/mod.js` (references/core/02)
- `getPointGen()`: base gain `new Decimal(1)`/sec, then wire every promised boost (wiring
  map: references/core/06 §3 — point boosts HERE, layer-gain boosts in `gainMult()`,
  automation via milestone-gated `passiveGeneration`/`autoPrestige`/`autoUpgrade` flags).
- `isEndgame()`: the concrete Decimal target from brief §7 (not the placeholder).
- `initialStartPoints` small (10); `displayThings` status lines if useful; keep
  `doNotCallTheseFunctionsEveryTick` and register any custom action-function you invent.

### 4.2 Layer files, bottom row first (references/core/03, 04; directives: 06 §7)
One `addLayer(id, {…})` per layer — **always an inline object literal** (N-FACTORY) — in files
listed in `modInfo.modFiles`, and every file must be appended to modFiles. Per the brief's table:
- `startData()` with `unlocked` + `points: new Decimal(0)` (+ `best`/`total` if milestones gate
  on them — they should); `color`, `resource`, `symbol`, `row`, `position`.
- Prestige config per blueprint: `normal` (+`exponent` 0.5 → 1/3 → 0.25 by row), `static`
  (+`base`, `roundUpCost`, `canBuyMax()`), or `custom` (P8: `getResetGain`/`getNextAt`/`canReset`,
  multipliers placed AROUND `pow(exp)` so exponents do not amplify them). Always `baseResource` +
  `baseAmount()` + `requires`.
- Content to the density floor: ≥10 upgrades on a single-digit-column grid, first ~cost 1, last an
  exit ticket; ≥3 milestones chained by `unlocked()`, scoring on `.best`/`.total`; buyables with an
  exponential cost; challenges/bars/clickables per Q5 and the locked type.
- The four budget rules that are hard FAILs: **N-UNWIRED** (every `effect()` id must be consumed),
  **N-PGBOOL** (`passiveGeneration()` returns a plain number), **N-SELFTOTAL** (Σ self-scaling
  exponents ≤ 0.6, and `ln(effect)/ln(cost) < 1` for buyables), **N-UNLOCKDEAD** (every
  `layerShown` gate needs a writer).
- `gainMult()` = the P10 web: list every older layer's boost that reaches this layer, and make
  this layer boost ≥2 older layers.
- `doReset(resettingLayer)` only when keeping things (P9); softcaps per P12.
### 4.3 Tree, hotkeys, achievements side layer
- `js/tree.js` usually needs no change (default tree from rows/positions); add ghost spacers
  or `addNode` decorations only if the design wants them.
- Cap-raising upgrades (K5: "softcap starts N× later", tolerance raises) get **no** `effect()`
  wired anywhere near gains — the cap function reads `hasUpgrade(...)` directly and the
  upgrade's `effect()`, if any, only feeds its own `effectDisplay`. Wiring a cap value into
  `getPointGen()` multiplies the base currency BY the cap (a real generated game: sugar ×1e12).
- Side achievements layer (`row: "side"`, P13): grid of real, checkable goals; rewards =
  flat mults + ONE automation grant; any backfill `player.X.upgrades.push(id)` MUST be
  guarded: `if (hasAchievement("a", 12) && !hasUpgrade("p", 13)) player.p.upgrades.push(13)` (P11).
  **Achievements are always visible** — uncompleted ones show dimmed (`.locked` grey) with
  name + tooltip, completed ones color-highlight (`.bought` green); the template's
  `achievementStyle()` is patched to dim instead of `visibility: hidden` (static rule
  N-ACHVIS fails if that engine default reappears). Never define `unlocked()` to hide goals.

### 4.4 Theme pass (P14/P17)
- Theme = structure (already fixed in Q1/brief): themed resource names, `symbol`s (2 chars),
  one accent `color` per layer, `resetDescription`/`prestigeButtonText` in theme voice.
- Formula-on-Shift QoL: `["display-text", function() { if (shiftDown) return "…" }]`.
- Language scope per Q7: T2 = `window.chinesemode` ternaries; T3/T4 = the `js/lang/` text layer
  (**references/design/15**). T2+ must override `main-display` — it hard-codes English chrome.
- Numbers: EVERYTHING through `new Decimal(...)` (strings like `"1e10"` for big values);
  display via `format()`/`formatWhole()`; NO native operators on currencies; no `.mod()`;
  no `resetBuyables()`; Vue2 syntax only. Full red lines: references/core/07 Part A/B.

### 4.5 Structures no tool can see through (07 Part F)

Each of these shipped as a defect in a real build, and each is invisible to all 68 rules:
- **Never build a layer at runtime.** `addLayer(id, factory())` hides `row`, `startData` and every
  component from the checker and the harness (F11) — one build took 8 FAILs from this.
- **One home for pacing constants** (`js/tuning.js`), read by the game *and* the simulator: a
  literal inlined in a layer file is a constant Stage 6 cannot tune (14 §3.3).
- **Single-digit columns.** Ids are object keys; `row*10 + col` collides at col ≥ 10 and the engine
  drops entries without a word (F5).
- **Track lifetime totals by hand** — this engine has no `player.totalPoints` (F10).
- **Set `modInfo.allowSmall`** if any value can go below `1e-4`, or `format()` prints `0.00` (F1).
- **Price a discrete endgame purchase above the top of the ladder it ends** (F15); `layeradd` needs
  a plain number and `winText` must be a function (F2/F3).

---

## Stage 5 — Static checks

```bash
node scripts/static_checks.js "<game-folder>"
```

- **FAIL blocks manual testing.** Fix the code — or, for a design-assertion failure, fix the
  design — and re-run until 0 FAIL. Testing a build with open FAILs wastes the test.
- **WARN needs a written acceptance reason in brief §10.** An unexplained WARN counts as a
  failure. Legitimate reasons do exist: a deliberate ×150 requires leap for a multi-row jump, a
  hard-capped currency whose ladder cannot span three orders, a sink layer that must never reset.
- **The rule catalogue is the checker's own header, not this file.** `scripts/static_checks.js`
  documents all 68 ids with their level, their provenance and the incident that produced each.
  Read it there: a second copy here would drift, and had already (this section was 20 rules
  behind). `--json` gives machine-readable output; the rules span `M-*` mod.js completeness,
  `C-*` banned calls, `D-*` design assertions, `N-*` negative examples from real builds, and
  `T-*` type contracts.
- **Type gating.** The type locked in Q4b decides which rules are enforced and which are exempt.
  The checker reads `.tmt-profile.json` (written by `scaffold.js --type`), `--profile <typeId>`
  overrides it, `--no-profile` disables it. With no type declared the report is byte-identical to
  the pre-type checker.
- **Fixture-proof.** `tests/fixture-good` must stay clean, `tests/fixture-bad` must trigger every
  injected defect with zero false positives, `tests/fixture-ghost` covers the ghost-field table.
  Run `node tests/run_tests.js` after touching the checker or any fixture.
- **Text layer:** `node scripts/i18n_check.js <game-folder>` — 0 FAIL on missing keys, duplicate
  language codes, duplicate endonyms and placeholder tokens; a silent no-op without `js/lang/`.

- **Count the GENERATED code, not the generator edits.** When a fix is applied inside a
  generator/template rather than to the output, verify by counting occurrences in the finished
  files. Learned the hard way: a postmortem fixed a defect in 31 of 34 affected layers because
  the generator had *two* code paths producing them and only one was patched — the 3-layer miss
  only surfaced in a browser. After any bulk edit, re-run `static_checks.js` on the real game
  folder and compare counts against the number you intended to change; a rule that reports the
  same number after a "complete" fix is telling you the fix did not land everywhere.

- **Run the text-layer check when there is one:** `node scripts/i18n_check.js <game-folder>` —
  0 FAIL on missing keys, duplicate language codes, duplicate endonyms and placeholder tokens.
  It exits 0 silently for single-language games, so it is safe to run unconditionally.

---

---

## Stage 5.5 — Load-time smoke (gate: before the browser, before Stage 6)

The static checker reads source text. It cannot tell you that a file throws while loading, that two
`addLayer()` calls share an id, or that a hook returns NaN against a fresh save — all three shipped
from this pipeline and were only found by opening the page.

```bash
cp <skill>/assets/harness/smoke.js <game>/tools/smoke.js   # tools/ is never a modFile
node tools/smoke.js
```

- **0 FAIL is the gate.** Findings are named `S-LOAD`, `S-DUPID`, `S-STARTDATA`, `S-NAN`,
  `S-UNDEF`, `S-HOOKTHROW`, `S-UPDATETHROW`, `S-PRESTIGE`, `S-FACTORY`.
- The harness starts **every layer unlocked** on purpose, so a hook that only breaks once the layer
  is reachable is caught here instead of by a player.
- A finding that is really a *stub* gap is fixed in the script with a comment — never ignored. The
  stub fidelity rules behind every phantom finding are in `references/design/14 §2`.
- Load order matters: the harness follows `index.html`, so a text layer loaded before `js/mod.js`
  is loaded before it here too.

---

## Stage 6 — Balance walkthrough (a measurement, not an estimate)

**Read `references/design/14` before this stage.** Three real briefs passed all 21 checks and were
then overturned by play: one promised 8–18 h and delivered 2.5 h, one promised a sane multiplier
stack and detonated at 28 s, one promised six automation steps whose thresholds were unreachable.
Paper reachability is a consistency argument, not a prediction — run both passes and let the
measurement have the last word.

```bash
cp <skill>/assets/harness/simulate.js <game>/tools/simulate.js
node tools/simulate.js
```

Trust the **early timeline** (first affordable purchase, each layer's first prestige): it is
policy-independent and it is where the author rules bite. Do **not** quote the total until the
policy has been fitted to one known playthrough value — the script says so out loud when a run
finishes implausibly fast. Then complete the paper pass below and reconcile the two:
**where they disagree, the simulation wins and the brief is what changes.**

Go through brief §4's table against `assets/balance-defaults.json` and annotate each number
PASS/deviate-with-reason. Then do the reachability estimate (09 §4):

1. Estimate steady-state first-layer production `P` (points/sec × prestige gain multiplier
   at the layer's unlock point).
2. Walk the ladder: each row's requires ÷ (production at that era, including the automation
   steps granted by then) → rough minutes-per-era; sum them.
3. If the total misses the Q2 playtime target by more than ~10×, rebalance requires/cost
   exponents in the brief FIRST, then regenerate numbers — do not tune code directly.
4. Confirm every runaway loop (effect feeding its own source) has a softcap, and the
   endgame target is reachable but not instant (P12: first softcap ≈ next-layer unlock).
5. **Multiplier-zone walk** — per era, list every independent `.times()` zone active at
   that moment (pointGen lines, gainMult lines, milestone/achievement mults, layer effects)
   and MULTIPLY the guaranteed flat ones: if the product at end of row 0 exceeds ~1e4 (or
   any layer's Σ self-scaling exponent ≥ 0.75), the requires ladder is fiction — cut zones
   (merge flat mults into fewer, stronger ones), lower exponents, or tighten softcaps in
   the brief. Zones compound: ten "harmless" ×2s are ×1024.

---

## Stage 7 — Manual test handoff

Hand the user the 07 Part D checklist plus these four steps:
1. Serve the folder statically and open `index.html` — **the console must show no errors**.
2. Verify in this order: first prestige within minutes; hotkey works; upgrades purchasable and
   their effects visible in the numbers; resets cascade per the `doReset` contract; save → reload
   intact; export/import and hard reset work; offline time capped by `offlineLimit`; endgame
   fires `winText`.
3. Test with offline production **disabled** in options first, and tune `offlineLimit` last
   (07 rule 17).
4. NaN or a blank page → 07 Part C crash table, fix, re-run Stage 5.

---

## Failure playbook

Symptom → action for the failures that actually occur. The full table is
[07 Part G](references/core/07-Pitfalls-and-Generation-Checklist.md) — one table, one home.
Part C there is the crash table; Stages 5.5 and 6 above are what stop most rows from happening.

---

## Constraints (do not violate)

- Never edit engine files (`js/technical/*`, `components.js`, `game.js`, `utils*`) — modders
  own only `js/mod.js`, `modFiles`-registered files, `js/tree.js`, `css/`, images.
- Never copy numeric code from ExpantaNum-based mods (09 §6) — design yes, calls no.
- The `modInfo.id` chosen at scaffold time is permanent for the game's life.
- Do not balance around offline progress; `offlineLimit` stays small.
