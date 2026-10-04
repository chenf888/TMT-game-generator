---
name: tmt-game-generator
description: Generate a complete, playable The Modding Tree (TMT) incremental/idle game from scratch — interview the user, write a data-driven design brief, scaffold from the bundled TMT template, generate mod.js and layer code, run static checks, do a balance walkthrough, and hand off test instructions. Use when the user asks to make, build, or generate an incremental game, idle game, clicker game, prestige tree, or modding-tree game from scratch, or explicitly mentions The Modding Tree / TMT.
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
| `assets/blueprints.json` | Machine-readable progress blueprints (from 09 §3) |
| `assets/balance-defaults.json` | Machine-readable measured balance defaults (from 09 §4) + `corpusBaselines` (from 11) |
| `assets/fun-quota.json` | Machine-readable fun-density quotas per blueprint (from 10 §5) |
| `assets/design-brief-template.md` | The design document you fill BEFORE coding |
| `scripts/scaffold.js` | Creates the game folder from the TMT template |
| `scripts/static_checks.js` | Post-generation static checks (FAIL/WARN/PASS report) |
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
| 6. Balance walkthrough | annotated numbers | heuristics table verified |
| 7. Manual test handoff | test instructions for the user | 07 Part D checklist handed over |

**Load references on demand, not all at once** (keeps context small):

| When | Read |
|---|---|
| Stage 1, after Q4 | `references/design/13` (§1 types + §3 routing); run `scripts/classify.js` |
| Stage 2 | `references/design/09` (fully), `references/design/10` (fully), `references/design/11` (fully), `references/design/12` (fully), all `assets/*.json`, brief template |
| Stage 4, any code | `references/core/01` (Decimal rules — mandatory before writing ANY code) |
| Stage 4, mod.js | `references/core/02`; wiring map `references/core/06` §3 |
| Stage 4, layers | `references/core/03`, `04`; idioms `references/core/06`; **wiring discipline `references/design/11` §2**; **gates, costs and readability `references/design/12`** |
| Stage 4, theming/UI | `references/core/05` |
| Stage 5–7 | `references/core/07` (hard rules + Part C crash table + Part D checklist) |
| Design inspiration | `references/core/08` (real-game catalog) |

---

## Stage 1 — Interview

Goal: ≤7 structured questions, each locking concrete generation parameters. Ask via your
tool's question UI (2–4 options + free-text "Other") or plain conversation. Output the
question text **in the user's language**; record answers in English in the brief.

**Step 0 (only if the user hasn't given a theme):** ask what the game is about (free text).
Then do Q1. If the user said "you pick the theme", propose one yourself, say so, and continue.

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
The answer locks ALL structure parameters from `assets/blueprints.json` (rows, per-layer
component counts, automation ladder, endgame). Do not improvise beyond it.

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

**Q7 — Language & style.**
- `English only` / `Chinese only` / `Bilingual EN+中文` (→ P17 convention: a `window.chinesemode`
  flag with `cond ? "中文" : "English"` ternaries on user-facing strings)
- Optional style notes via Other: color mood, naming voice (goes into per-layer `color`/`symbol`/`resetDescription`).

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

Also check no two milestones of the same layer claim the same automation grant (the Mario
Maker 2 "conflict point" incident). Gate: proceed only when all 20 checks pass.

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

### 4.2 Layer files, bottom row first (references/core/03, 04; patterns 09 §2)
One `addLayer(id, {...})` per layer in files listed in `modInfo.modFiles` (one file per row
or per layer — your call, but EVERY file must be appended to modFiles). For each layer, per
the brief's table:
- `startData()` with `unlocked` + `points: new Decimal(0)` (+ `best`/`total` if milestones
  gate on them — they should); `color`, `resource`, `symbol`, `row`, `position`.
- Prestige config per blueprint: `type: "normal"` (+`exponent` by row: 0.5 → 1/3 → 0.25) or
  `"static"` (+`base: 2`, `roundUpCost: true`, `canBuyMax()` as an upgrade reward) or
  `"custom"` (P8: define `getResetGain()`/`getNextAt()`/`canReset()`/`prestigeButtonText()`;
  put multipliers AROUND `pow(exp)` — `getGainMultPre/Post` style — so exponents don't
  amplify them). Always set `baseResource` + `baseAmount()` + `requires`.
- Content per density floor (≥10 upgrades as a 5-column row-col grid `11..15,21..25…`, first
  upgrade cost ~0–1, last = "unlock a new layer" exit ticket; 3–5+ milestones chained via
  `unlocked() { return hasMilestone(this.layer, id-1) }`, gating on `.best`/`.total`;
  buyables with exponential `cost(x)` base 2–4 starting ~10× the unit currency; challenges
  if Q5 said so, handicaps via `inChallenge()` formula injection P16, rewards via
  `hasChallenge()`).
- **Gates: pay-to-enter is a bad gate.** *Revised 2026-10-03 per handbook 12* (the TMT author,
  2022-06-26: *"It's usually not good to have to buy an upgrade to unlock something that you also
  have to pay to use after … you don't know how much the thing it unlocks will cost"*):
  - **A layer the player must pay to prestige is unlocked by a THRESHOLD**, not by a purchase — a
    milestone, the previous layer's `requires`, or a `display-text` announcing when it lands.
    Static rule `N-UNLOCKPAYGATE` warns on the pay-to-enter pattern.
  - **`onPurchase()` is still right** for things that cost nothing afterwards — a subtab, a shop
    entry, a mechanic toggle — and for healing saves: pair it with
    `layerShown() { return player.X.unlocked || hasUpgrade("<parent>", <id>) }`.
  - `layerShown() { return player.X.unlocked }` with **no** writer anywhere still dead-ends the
    tree after layer 1 — static rule `N-UNLOCKDEAD` (unchanged, still a FAIL).
- **Automation functions return typed values** — `passiveGeneration()` returns a plain NUMBER
  (`if (hasMilestone("x", 0)) return 1`; fractional rates like `0.5` are valid; `return 0` or omit
  the function to disable). Never a bare boolean: stock v2.7 only coerces `true`→1 via a temp.js
  normalization line and `new Decimal(true)` is ZERO, so any fork or custom layer reading it as a
  Decimal silently gets 0. Never a Decimal either: the engine computes `diff * passiveGeneration`,
  which is NaN for objects. `autoPrestige()`/`autoUpgrade()` stay booleans (truthiness-only).
  Static rule N-PGBOOL.
- **Self-scaling budget** — at most ONE upgrade per layer may read the layer's own
  `points` and raise it to a power (≤0.5, softcapped). Never wire two self-mults into one
  `gainMult`: the exponents SUM and Σp ≥ 1 compounds superlinearly per prestige (a real
  generated game wired 0.5+0.25+0.5 = 1.25 → numbers exploded inside the first layer, game beaten in 5 min).
  Log-shaped sources (`points.log(10).pow(n)`) are sublinear and exempt.
- **Wiring discipline (handbook 11 §2 — do this as you write, not afterwards).** In real
  TMT games **54.4% of upgrades carry no `effect()` at all**; their power is a branch in the
  layer's `gainMult()`/`gainExp()`/`passiveGeneration()`. So for every upgrade decide, and
  write down, which of two kinds it is:
  - **token/gate (K7)** — no `effect()`; consequence lives in `onPurchase()` or a layer hook.
  - **value** — has `effect()`, **and** its id must be consumed somewhere:
    `if (hasUpgrade("<layer>", <id>)) ret = ret.times(2)` in the layer's `gainMult()`, or
    `ret = ret.times(layers.<layer>.upgrades[<id>].effect())`, or in `getPointGen()`.

  Never ship an `effect()` that only `effectDisplay()` reads — it renders a multiplier that
  never applies. Static rule **N-UNWIRED** is a FAIL for exactly this, and it is the one
  defect that produces a game which runs perfectly and changes nothing.
- `gainMult()` = the P10 web: list every older layer's upgrade/milestone that boosts this
  layer AND make this layer boost ≥2 older layers (see brief table).
- **Effect diversity (10 §2)** — follow the brief §4.1 kind plan: K1 flat mults within quota;
  every layer ships its planned K2 (`pow/log/root` shapes), K3 (cross-resource sources), K4
  (meta-upgrades that literally edit the target's formula, e.g. `ret = ret.pow(1.1)` inside the
  target's `effect()`), K5 (cap-delay/hardcap-raise/cost-reduce), K7 unlocks. Milestone ladders
  rotate automation → unlock → cap-play → production instead of ten "×2 gain" steps.
- **Content organization (10 §3)** — every main layer gets a `tabFormat` (minimum
  `["main-display","prestige-button","upgrades"]`); introduce `["microtabs","stuff"]` once the
  layer has ≥3 content groups, each tab `unlocked()`-gated with themed `buttonStyle()`; add
  context display-texts above the tabs (base amount, best, live softcap warning); dense grids
  via `componentStyles`.
- **Mechanics (10 §4)** — implement the brief §4b picks: M1 challenges wire `inChallenge()`
  gates into *older* layers' formulas + `hasChallenge()`/`challengeEffect()` rewards; M2
  score-attack hub keeps a `maxpoints` array in `startData()`, tracks per-challenge best in
  `update(diff)`, and pays rewards from those records; M3/M4 clickable+bar loops keep their
  state (`_running`, random picks, progress) in `startData()` and advance in `update(diff)`;
  M5 secondary currency produced in `update()`, spent by dedicated buyables; M6
  `overpowered()` milestone variants; M7 `type:"custom"` ritual layer; M8 shop layer selling
  K4/K5; M9 zero-cost upgrade whose `pay()` performs a controlled rebirth; M10 collection
  achievements.
- `layerShown()`, `branches: [...]` (must point at existing layer ids), hotkey with safe
  press: `onPress() { if (canReset(this.layer)) doReset(this.layer) }`.
- **Cost ladder (11 §3)**: spread costs across ≥6 orders; ≥ half of them plain
  `new Decimal(<literal>)`; allow (and mark) deliberate cheap "key" drops; switch to
  `Decimal.pow(10, n)` with hand-picked exponents for the late stretch.
- **Gain shapes (11 §4)**: ≥30% of a layer's upgrades use `.pow()`/`.log10()`, not
  `.times(2)`. Real games' op mix is pow 4,830 : times 1,652.
- **Author's rules (handbook 12)** — the ones that change how you write code:
  - **Never `() =>` for layer/component hooks.** Arrow functions have no own `this`, so
    `this.layer` / `this.id` are undefined. Use `function() {}`. Static rule `N-ARROWTHIS` (FAIL).
  - **First boost within 10 seconds**, and every reset over a minute must pay something.
  - **Never hard reset the player.** Use `fixOldSaves` for inflation.
  - **Cost scaling shapes the game; softcaps only stop runaway loops**, and only sell a cap
    raise when the cap is visible.
  - **Exponents are bad early upgrades** — `points.pow(0.5)` on 12 points is noise. Flat or
    absolute bonuses in row 0; shaped curves from row 1 on.
  - **Gate layers by threshold**, never behind an upgrade you must also pay past.
  - **Display the currency a tab spends**; never show internal ids or the prestige exponent.
  - **Hotkeys**: put the key in the description text (`"p: reset for prestige points"`).
- **Ghost fields (11 §6)**: never write `challenges.reward` (the engine renders
  `rewardDescription` — a blank reward line), `repeatable` (use `completionLimit`),
  `canBypass`, `countTowardsCompletion` (use `countsAs`), `milestones.persistent`,
  `achievements.condition` (use `done()`), `achievements.secret`, or layer `grids`
  (it is `grid`). Components stay inlined in `addLayer()`; let the engine price buyables.
- `doReset(resettingLayer)` ONLY when keeping things (P9: strictly-higher rows reset me;
  keep `["unlocked","auto"]` + milestone-gated extras; call `layerDataReset(this.layer, kept)`).
- Softcaps (P12): layer `softcap`/`softcapPower` props on long-lived currencies, `softcap()`
  helper inside `effect()`s; hard cap = `softcap(x, cap, 0)` for theme ceilings.

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
- Bilingual (Q7): `window.chinesemode` ternaries on every user-facing string.
- Numbers: EVERYTHING through `new Decimal(...)` (strings like `"1e10"` for big values);
  display via `format()`/`formatWhole()`; NO native operators on currencies; no `.mod()`;
  no `resetBuyables()`; Vue2 syntax only. Full red lines: references/core/07 Part A/B.

---

## Stage 5 — Static checks

```bash
node scripts/static_checks.js "<game-folder>"
```

- **FAIL = blocker.** Fix the code (or, for design-assertion failures, the design) and
  re-run until 0 FAIL. Manual testing is not allowed with open FAILs.
- **WARN = needs a written reason** in brief §10 (e.g. a deliberate ×150 requires leap for a
  multi-row jump like Mario Maker's e86). Unexplained WARNs count as failures.
- Rules cover: 61 rule ids across mod.js completeness (`M-*`), file registration (`M-UNREG`, 07 rule 2), banned
  calls (`.mod(`, `resetBuyables(`, `ExpantaNum`, raw numbers where Decimals belong,
  native-ops-on-currency suspects), layer integrity (`startData`, prestige fields), the
  corpus-derived design assertions: row contiguity (A2), requires-ladder monotonicity (A1) +
  ×10–×100 band, duplicate layer-level keys, automation-grant collisions between milestones,
  unguarded backfill pushes (P11), dangling branch edges — and the fun-density
  assertions: `D-EFFECTMONO` (WARN, layer >60% constant-mult upgrades), `D-MICROTABS`
  (FAIL ≥16 / WARN ≥10 content items without tabFormat/microtabs), `D-MECHQUOTA` (WARN, ≥4
  main layers with zero challenges/clickables/bars/grids anywhere), `D-NOUPDATE` (WARN, ≥4
  main layers and no `update()` tick logic in the game). Thresholds are read from
  `assets/fun-quota.json` at run time — that file is the authority, not the numbers above.
- **Type rules (`T-*`)** — the type locked in Q4b decides which of these are enforced and
  which are exempt. The checker reads `.tmt-profile.json` from the game folder (written by
  `scaffold.js --type`); `--profile <typeId>` overrides it and `--no-profile` disables it.
  Without either, the checker behaves exactly as it did before types existed.
  `T-CLICKABLE` (FAIL, a clickable with no `canClick`/`onClick`, or state absent from
  `startData`), `T-GRID` (FAIL, `grids:` instead of `grid:`, non-base-100 ids, or no
  `getStartData`), `T-TICKREG` (WARN, `doNotCallTheseFunctionsEveryTick` omits a hook the game
  actually defines — `M-DNC` alone only checks the declaration exists).
  `passive-prestige` is exempt from `D-NOUPDATE`: having no tick is that type's correct shape.
  Negative-example rules — each one caught a real defect in a previously generated game:
  `N-ACHVIS` (FAIL, uncompleted
  achievements hidden via visibility:hidden), `N-UNLOCKDEAD` (FAIL, unlocked-gated layers
  with no onPurchase writer — tree dead-ends), `N-UNLOCKTEXT` (WARN, unlock-promising
  upgrade with no onPurchase/layerShown ref), `N-CAPMULT` (FAIL, cap-valued effect wired
  into getPointGen — base currency ×1e12+), `N-SELFTOTAL` (FAIL Σ ≥1 / WARN ≥0.75, Σ
  self-scaling exponents wired into one layer's gainMult — superlinear compounding), `N-PGBOOL`
  (WARN, `passiveGeneration()` returning a bare boolean or Decimal instead of a plain number —
  boolean relies on a stock-only engine coercion, Decimal NaNs in the engine's diff multiply).
- **Corpus rules (handbook 11)** — thresholds are measured over all 329 real games, not guessed:
  `N-UNWIRED` (**FAIL**, an upgrade defines `effect()` but its id is referenced nowhere — the
  effect is never read; corpus: 54.4% of real upgrades have no `effect()` because their power
  is wired into `gainMult`), `D-LOCALWIRE` (WARN, a main layer's effect-bearing upgrades are
  referenced by none of its `gainMult`/`gainExp`/`passiveGeneration`/`update`), `N-GHOSTFIELD`
  (WARN, component keys the engine silently drops — `challenges.reward` renders blank per
  `template/js/components.js:148`; note `completionLimit` is VALID, challenges are repeatable),
  `D-EFFECTSHAPE` (WARN, all of a layer's effects are flat multiplies — corpus pow:times ≈ 3:1),
  `D-COSTSPAN` (WARN, a layer's literal costs span <3 orders — real ladders span 6+; static
  layers get a 1-order bar, because their currency is a floor COUNT growing as log2(stardust)
  and 6 orders would mean 2^1e6 stardust).
- **Lifecycle rules** (2026-10-04, from the *The Galaxy Nebula* postmortem) — these check what
  **survives a reset**, not how things are wired or how big they are. Every one of them caught
  a real defect that the entire rule set above passed with 0 FAIL, and all three of that game's
  player reports were of this shape: each part individually reasonable, the *combination*
  unrecoverable. `N-MSDESTROY` (**FAIL**, a milestone condition reads a field a higher-row reset
  erases — `layerDataReset` keeps only 4 engine fields plus your keep list, and `rowReset` fires
  it on every lower-row layer with no `doReset`; score milestones on `.best`/`.total` and keep
  both), `N-AUTOWIPE` (**FAIL**, automation that fires while the reset is still destructive —
  the engine calls `doReset` from the game loop with **no player toggle** in the path, so
  *autoPrestige's condition must imply resetsNothing's*; compare milestone **sets**, not
  numbers. WARN, aggregated, for a keep list preserving an `"auto"` flag nothing reads —
  "toggleable" is then an empty promise), `N-POINTSWRITE` (FAIL static / WARN normal, `update()`
  assigning `player[layer].points` instead of `addPoints()` — the only writer of `best`/`total`;
  on a static layer it is fatal, since the reset gain subtracts the counter), `N-STATICMAX`
  (**FAIL**, a static layer with no `canBuyMax()` — `getResetGain` returns 1 and `doReset`
  clamps the payout to 1, so it banks exactly one floor per prestige and its whole ladder is
  dead). Plus `M-VERCMP` (WARN, `VERSION.num` is compared **as text** by `utils/save.js:301`:
  a component ≥ 10 sorts below a single-digit one, and a num below what the changelog documents
  downgrades every save the build opens).
- **Author rules (handbook 12)** — from Acamaeda's own design notes, which outrank the corpus
  statistics where they disagree: `N-ARROWTHIS` (**FAIL**, a layer/component hook written as an
  arrow function whose body uses `this` — arrows have no own `this`), `N-CONTRAST` (WARN,
  aggregated, layer colors too dark to read as text on the page background — the engine renders
  your currency amount in that color), `N-UNLOCKPAYGATE` (WARN, aggregated, an upgrade gating a
  layer that still charges `requires`: pay twice, second price invisible), `N-HOTKEYDESC` (WARN,
  a hotkey whose description omits the key).
- Use `--json` for machine-readable output. Fixture-proof: `tests/fixture-good` passes clean,
  `tests/fixture-bad` triggers every main rule, `tests/fixture-ghost` covers the ghost-field
  table (run `node tests/run_tests.js` to re-verify).
- **Count the GENERATED code, not the generator edits.** When a fix is applied inside a
  generator/template rather than to the output, verify by counting occurrences in the finished
  files. Learned the hard way: a postmortem fixed a defect in 31 of 34 affected layers because
  the generator had *two* code paths producing them and only one was patched — the 3-layer miss
  only surfaced in a browser. After any bulk edit, re-run `static_checks.js` on the real game
  folder and compare counts against the number you intended to change; a rule that reports the
  same number after a "complete" fix is telling you the fix did not land everywhere.

---

## Stage 6 — Balance walkthrough

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

Give the user these instructions (and the 07 Part D checklist):

1. Serve the folder statically (`npx http-server <folder>` / `python -m http.server` /
   VS Code Live Server) and open `index.html`; **console must show no errors**.
2. First prestige reachable in minutes; hotkey works; upgrades purchasable and effects
   visible; resets cascade per the doReset contract; save → reload intact; export/import +
   hard reset work; offline time capped by `offlineLimit`; endgame triggers `winText`.
3. Test with offline production DISABLED in options first; tune `offlineLimit` last (07 rule 17).
4. If the console shows NaN or a blank page → references/core/07 Part C crash table, fix,
   re-run Stage 5.

---

## Failure playbook

| Symptom | Action |
|---|---|
| `scaffold.js` can't find template | pass `--from <dir>` (template = folder containing `index.html` + `js/mod.js`) |
| Static check FAIL loops after two fix attempts | the DESIGN is wrong — go back to Stage 2, fix the brief, regenerate the affected layer |
| NaN in a currency | a `startData()` field or custom var isn't initialized to `new Decimal(0)` (07 Part C) |
| Layer node missing from tree | file not in modFiles, `row` wrong, `layerShown()` false — or the layer gates on `player.X.unlocked` that nothing ever sets: give the unlock upgrade `onPurchase()` (N-UNLOCKDEAD) |
| Something runs 20×/sec | custom action-function not registered in `doNotCallTheseFunctionsEveryTick` |
| Numbers explode / game beat in minutes | three causes, check in order: a cap-valued `upgradeEffect` wired into `getPointGen()` (N-CAPMULT), Σ self-scaling exponents in a `gainMult` ≥ 1 (N-SELFTOTAL), or a missing softcap (P12) — fix the formula, then rebalance the era's requires in the brief |
| Passive generation never kicks in, or a fork/custom layer sees it as 0 | `passiveGeneration()` returned a boolean or Decimal (N-PGBOOL): `new Decimal(true)` is 0 and `diff * Decimal` is NaN — return a plain number (`if (hasMilestone(...)) return 1`) |
| Engine misbehavior you can't explain | check `references/core/07` Part B for deprecated features (challenge `goal:`, `goalTooltip`) |
| **Upgrades buy fine but nothing in the game changes** | the classic generated-game failure: their `effect()` is never consumed (N-UNWIRED). Wire each id into a `gainMult`/`gainExp`/`passiveGeneration`/`getPointGen` branch, or drop the `effect()` if it is a token — see handbook 11 §2 |
| A challenge shows no reward text | you wrote `reward:`; the engine renders `rewardDescription` (N-GHOSTFIELD, 11 §6) |
| A challenge can never be beaten, or the completion count is stuck at 1 | you wrote `repeatable:`; use `completionLimit: n`, and `canComplete()` for the win condition |
| An achievement never triggers | you wrote `condition()`; layer achievements are evaluated by `done()` (N-GHOSTFIELD) |
| A layer hook reads `undefined` for `this.layer` / `this.id` | you wrote it as `() =>` — arrows have no own `this`. Use `function() {}` (N-ARROWTHIS) |
| The player's own balance is invisible in a layer | that layer's color is too dark for the page background; the engine renders the amount in it (N-CONTRAST) |
| Players complain they pay twice for one layer | an upgrade gates a layer that still charges `requires` — switch to a threshold (N-UNLOCKPAYGATE) |
| Nobody knows the hotkey exists | the key is missing from the hotkey's `description` string (N-HOTKEYDESC) |

## Constraints (do not violate)

- Never edit engine files (`js/technical/*`, `components.js`, `game.js`, `utils*`) — modders
  own only `js/mod.js`, `modFiles`-registered files, `js/tree.js`, `css/`, images.
- Never copy numeric code from ExpantaNum-based mods (09 §6) — design yes, calls no.
- The `modInfo.id` chosen at scaffold time is permanent for the game's life.
- Do not balance around offline progress; `offlineLimit` stays small.
