# 07 — Pitfalls, Hard Rules, and the Game Generation Checklist

## Part A — Hard rules (breaking any of these breaks the game)

1. **Decimal-only math.** All currency/cost/effect values are `Decimal`. Never use `+ - * / % ** < > <= >= ===` on them. Use `.add/.sub/.times/.div`, `.gt/.gte/.lt/.lte/.eq/.neq` (see [01](01-Core-Rules-and-Decimal.md)). There is **no `.mod()`** in this engine's break_eternity build.
2. **Register every file.** Any new layer file must be listed in `modInfo.modFiles` (paths relative to `js/`), or it silently never loads and `addLayer` never runs.
3. **`modInfo.id` is permanent.** It keys the savefile. Set it once at creation; changing it later erases all player saves. If omitted, saves key off `name-author` instead — always set an explicit id.
4. **Register custom action-functions.** Any non-official function inside `layers` that performs an action (rather than returning a value) must be named in `doNotCallTheseFunctionsEveryTick` in mod.js, or TMT calls it every tick.
5. **Defining `doReset` replaces default reset behavior.** If a layer defines `doReset`, the engine will NOT auto-reset it — you must call `layerDataReset(layer, keep)` yourself (usually only when `layers[resettingLayer].row > this.row`).
6. **`startData()` must include `unlocked` and `points`** (points as `new Decimal(...)`). Missing fields cause NaN cascades or crashes on first render/save-load.
7. **Normal/static layers need `baseResource`, `baseAmount()`, `requires`.** Missing any of these crashes the prestige button.
8. **Implement every described effect.** Descriptions are text only — wire each promised bonus into `getPointGen()`, `gainMult()`, `update()`, etc. (wiring map in [06 §3](06-Idioms-and-Complete-Examples.md)).
9. **Vue 2 syntax only; basic HTML in display strings.** No Vue 3 APIs, no `v-if`/`{{ }}` in display text — use functions returning strings.
10. **Grid ids are base-100** (`101, 102…`, `201, 202…`). One `grid` per layer; for more, use `layer-proxy`. `maxRows`/`maxCols` are required (and static) whenever `rows`/`cols` are dynamic.
11. **Clickable state is number or string only** (not Decimal/array/object). Buyable amounts ARE Decimals.
12. **Bar `direction` uses the constants** `UP/DOWN/LEFT/RIGHT`, never strings; `width`/`height` are bare numbers (no "px").
13. **`unlocked()` of subtabs/microtabs cannot use `this`** (it runs unbound).
14. **No microtabs inside a `layer-proxy`.**
15. **`slider` cannot bind Decimals**; `text-input` can.
16. **Static-layer boost semantics are inverted.** On `"static"` layers `gainMult()` smaller = cheaper cost, `gainExp()` larger = cheaper cost. On `"normal"` layers they're intuitive (bigger = more gain).
17. **Don't balance around offline progress.** Keep `offlineLimit` small and disable offline production while testing, or you'll build around fake timewalls.

## Part B — Deprecated / broken things to avoid

| Item | Status | Use instead |
|---|---|---|
| Challenge `goal` + `currency*` fields | deprecated | `canComplete()` (custom win condition) |
| Achievement `goalTooltip` / `doneTooltip` | deprecated | a dynamic `tooltip` function |
| `resetBuyables(layer)` (called in the demo's respec example) | **does not exist in the engine** — demo bug | `respecBuyables(layer)`, or `doReset(layer, true)` inside your `respec()` |
| Raw numbers where Decimals belong (`cost: 100`) | fragile | `cost: new Decimal(100)` |
| Native math on Decimals | crashes/NaN | Decimal methods |
| Vue 3 features / most Vue directives in display text | unsupported | function-returning-string + basic HTML |

## Part C — Common crash causes (debug quickly)

| Symptom | Likely cause |
|---|---|
| Blank page / console error at load | Syntax error in a mod file; layer file not in `modFiles`; duplicated layer id |
| Layer node missing from tree | `layerShown()` false; wrong `row`; file never loaded |
| Prestige button errors | Missing `requires`/`baseAmount`/`baseResource`/`type`; `baseAmount` returning a non-Decimal |
| NaN displayed in currency | A `new Decimal(0)` missing in `startData` for a custom variable; math on undefined; division by zero kept raw |
| Upgrade can't be bought | `cost` missing while no `fullDisplay`; currency fields misconfigured; already owned; layer deactivated |
| Hotkey does nothing | `onPress` missing permission check (`player[layer].unlocked` or `canReset`) |
| Save lost on reload | `modInfo.id` changed between runs |
| Grid tiles invisible | Ids outside the rows×cols range (remember base-100), or `getUnlocked` false |
| Everything runs 20×/sec | A custom action function not in `doNotCallTheseFunctionsEveryTick` |
| Gains explode uncontrollably | Missing `softcap` tuning; effect feeding back into its own input each tick without a cap |

## Part D — Game generation workflow (step by step)

### Step 0 — Design before code
Decide and write down: theme/narrative, layer count and prestige chain (which layer resets which), each layer's resource name/color/symbol/id, core loop timing (seconds-to-first-prestige, target session length), endgame target, and the feature mix per layer (upgrades/milestones/challenges/buyables/etc.). A TMT game is a **tree of prestige layers** — design the tree first.

### Step 1 — Set up the project
- [ ] Copy the entire template folder; this folder is the game.
- [ ] `js/mod.js`: set `modInfo.name`, **unique `modInfo.id`**, `author`, `pointsName`, `offlineLimit` (small), `initialStartPoints`.
- [ ] `modFiles` lists every layer file you plan to write.
- [ ] Set `VERSION = {num: "0.1", name: ...}` and an initial `changelog`.

### Step 2 — Core economy
- [ ] `getPointGen()`: base gain with real constants (start at 1/sec).
- [ ] `canGenPoints()` if gating point production.
- [ ] `isEndgame()`: a concrete Decimal target.
- [ ] `winText`.

### Step 3 — Layers, one at a time (bottom row first)
For each layer:
- [ ] `addLayer(id, {...})` with: `startData()` (unlocked/points + custom vars), `color`, `resource`, `row`, `position`, `symbol`.
- [ ] Prestige config: `type` + `baseResource`/`baseAmount()`/`requires` (+`exponent` for normal, `base`/`roundUpCost`/**`canBuyMax` — mandatory for static**, see [03 §4.1](03-Layers-Complete-API.md)).
- [ ] `gainMult()`/`gainExp()` returning `new Decimal(1)` initially.
- [ ] `layerShown()`; `hotkeys` with safe `onPress`.
- [ ] `branches: [...]` pointing at the layer(s) it resets, and tree `position`s that don't collide.
- [ ] Content: upgrades (row-col ids), milestones (chain via `unlocked()`), challenges/buyables/clickables/bars/infoboxes as designed.
- [ ] `doReset(resettingLayer)` ONLY if this layer must keep things on reset — then `layerDataReset(this.layer, keep)` inside it.
- [ ] Register the file in `modFiles`.

### Step 3.5 — Reset lifecycle (the invariants that only fail in play)
Each of these shipped broken once and passed every other rule with 0 FAIL. See [03 §4.1](03-Layers-Complete-API.md).
- [ ] Any layer whose milestones read `best`/`total` keeps **both** in its `doReset` keep list — or has an explicit `doReset`, since a layer without one is wiped with a default list containing neither.
- [ ] Milestones score on `.best`, never on live `.points`.
- [ ] `autoPrestige`'s milestone set **implies** `resetsNothing`'s (the engine prestiges from the game loop with no player toggle). Automation that wipes its own safety milestone's currency is not automation.
- [ ] If a keep list preserves `"auto"`, some code reads `player[layer].auto`; otherwise the text must not say "toggleable".
- [ ] No `update()` assigns `player[layer].points` — use `addPoints()`. On a static layer it is fatal (the reset gain subtracts the counter).
- [ ] Every static layer defines `canBuyMax()`.

### Step 4 — Wire everything
- [ ] Every upgrade/milestone/achievement/challenge/buyable promise implemented exactly once (wiring map [06 §3](06-Idioms-and-Complete-Examples.md)).
- [ ] Every effect that scales unbounded has a softcap (`effect()` internal cap or layer `softcap`).
- [ ] Challenge handicaps gate on `inChallenge`, rewards on `hasChallenge`.
- [ ] Automation milestones set flags consumed by `automate()`/`autoPrestige`/`passiveGeneration`; toggles re-check `hasMilestone`.

### Step 5 — Polish
- [ ] Tooltips on nodes (`tooltip`/`tooltipLocked`) and components.
- [ ] Infobox(es) explaining the core loop; `displayThings` for status lines.
- [ ] `shouldNotify`/`glowColor` where a meaningful action is available.
- [ ] Achievements layer (`row: "side"`) with real, checkable goals.
- [ ] Per-layer colors/symbols distinct; optional per-layer CSS classes.
- [ ] Particles/interactive tree nodes only if they add feedback (not noise).

### Step 6 — Verify (functional QA)
- [ ] Serve statically, open `index.html`; **console shows no errors**.
- [ ] First prestige reachable in a few minutes; `hotkey` works.
- [ ] Each layer: prestige → upgrades purchasable → effects visible in numbers.
- [ ] Resets cascade correctly: prestiging a high row resets lower layers and keeps what `doReset`/`layerDataReset` intend.
- [ ] **Prestige a high row with milestones earned, then check the ladder survived** — the defects in Step 3.5 are invisible until the reset that erases them actually fires.
- [ ] Count the GENERATED files, not your generator edits: if a bulk fix was applied inside a template with two code paths, confirm the number of affected components dropped to zero.
- [ ] Challenges: enter resets, goal completable, reward applies, exit restores.
- [ ] Save → reload → state intact; export/import works; hard reset works.
- [ ] Offline time behaves (capped by `offlineLimit`); no NaN after long absence.
- [ ] Endgame: `isEndgame()` triggers win screen, "keep going" continues.
- [ ] All number displays use `format()`/`formatWhole()`; no raw Decimal strings anywhere.

### Step 7 — Balance sanity
- [ ] Early costs: first upgrade ~1 prestige point; layer unlocks ~10 base currency; each next layer ~100× the previous.
- [ ] Normal layers: `exponent` 0.5 (classic); consider 0.4–0.6.
- [ ] Static layers: `base` 2–5; expect 1-gain-per-reset pacing with milestones enabling buy-max.
- [ ] Every runaway feedback loop (effect boosts its own source) has a softcap.
- [ ] Timewalls are intentional and < ~15–30 min for a jam-scale game.
- [ ] Test with offline progress OFF; tune `offlineLimit` last.

## Part E — File-by-file output map for a generated game

| File | Must contain |
|---|---|
| `js/mod.js` | modInfo (with unique id), VERSION, changelog, winText, doNotCallTheseFunctionsEveryTick, getStartPoints, canGenPoints, getPointGen, addedPlayerData, displayThings, isEndgame, backgroundStyle, maxTickLength, fixOldSave |
| `js/layers.js` (or one file per layer, all in modFiles) | One `addLayer(id, {...})` per layer, bottom row first |
| `js/tree.js` | layoutInfo (startTab/startNavTab/showTree, optional treeLayout), optional addNode spacers/buttons, the `tree-tab` layer |
| `css/`, images | Optional per-game theming |

## Part F — Engine behaviour established in real generated builds

Everything below was paid for in debugging time on a generated game, is invisible to a
text-level rule, and is not in the official docs. Each entry names the build it came from.

| # | Fact | Consequence |
|---|---|---|
| F1 | **`format()` renders anything below `1e-4` as `0.00`** unless `modInfo.allowSmall` is set (`formatSmall()` also exists). | Any game whose currency starts or can dip below `1e-4` (a 1e-64 opener, negative-exponent starts) prints a screenful of `0.00`. Set `allowSmall: true` in `modInfo`. *(The Truth Tower)* |
| F2 | **`layeradd(x, base)` needs a plain NUMBER.** Passing a Decimal silently returns NaN or leaves the value unchanged — no throw. | The tetration endgame silently does nothing. Call `.toNumber()` at the call site. *(The Truth Tower)* |
| F3 | **mod.js top-level code runs BEFORE the layer files load** (loader.js inserts them afterwards). A top-level throw therefore kills every later `var`/`let` initializer in mod.js. | A `winText` that interpolates `format(player.t.points)` at top level threw, left the endgame constant `undefined`, made `isEndgame()` true on tick 1 and fired the win screen at load — which looks like a hang. **Make `winText`/`displayThings` functions, never interpolated at top level.** *(The Truth Tower)* |
| F4 | **Purchases are validated against cached `tmp` fields**, refreshed once per tick (~50 ms). | A synchronous harness that sets state and buys in the same tick gets silent refusals. Humans never see this; a simulator will, and will report phantom "dead automation". Advance a tick between state changes. *(The Truth Tower)* |
| F5 | **Component ids are object keys.** `row*10 + col` breaks at col ≥ 10: ids collide across rows and the engine loses entries to key collisions, silently. | Keep columns single-digit — or move to a wider base (`row*100 + col`, which is why grid ids are base-100). A 15-column upgrade row is arithmetically impossible on the `row*10` scheme. *(The Truth Tower)* |
| F6 | **`resetsNothing()` short-circuits a layer's own reset** (game.js:211). | Granting a layer `autoPrestige` while it also declares `resetsNothing` is unsound — the reset it automates is the one it has disabled. Re-scope the milestone. *(The True Color Tree)* |
| F7 | **`main-display` hard-codes the English words** `You have` / `(x/sec)`. | It cannot be translated without editing engine files. Any non-English game must override `mainDisplay` (a `mainAmount()` returning the localized sentence) — the stock component leaks English into every other language mode. *(The Ties-Tree)* |
| F8 | **`componentStyles` is evaluated once per LAYER, not per component.** `this.id` does not exist there. | Using `this.id` inside `componentStyles` crashed the game on the first tick. Also usually redundant: the engine's own `achievementStyle()` (technical/displays.js:39) already greys and desaturates uncompleted achievements, which satisfies "visible but dimmed". *(The Ties-Tree)* |
| F9 | **Buy-max on a static layer computes `raw − currentPoints + 1`.** | A buyable denominated in the static layer's OWN counter drives it negative, and the next buy then *removes* floors. Denominate such buyables in the resource that pays for the layer, not in the layer's counter. *(The Ties-Tree)* |
| F10 | **This engine has no `player.totalPoints`.** | Lifetime currency tracking must be declared in `addedPlayerData()`. Any achievement or story line scoring on "total ever earned" silently reads `undefined` otherwise. *(The Ties-Tree)* |
| F11 | **`addLayer(id, factory(...))` makes the layer invisible to every structural check.** The checkers parse object literals; a factory call hides `row`, `startData`, and every component. | One real build took 8 FAILs from this and fixed it by inlining. Either inline the layer, or run the factory at BUILD time and emit inlined source — never at runtime. *(The True Color Tree)* |
| F12 | **`requires` as a function is the sanctioned escape** for volume-denominated or cross-currency requirements. | Written as a literal, a requirement expressed in a *different* currency than the row below is compared against that row and fails the ladder check backwards. Switch it to `requires: function() { … }` and justify it in the brief. *(The True Color Tree)* |
| F13 | **Buyable feedback exponent = `ln(effectMult) / ln(costMult)`.** At ≈1 the buyable funds its own next purchase and income goes `income^(≈1)`; above 1 it detonates. | One build shipped buyables with effect ×1.4–2.0 against cost ×2–3.0 and composed income ∝ income^≈2 — the game exploded to 1e73 and was finished in 2.5 h. Keep the exponent comfortably below 1 (the fixed build used effect ×1.15–1.3). This is the buyable form of the self-scaling budget in Stage 4; N-SELFTOTAL only scans upgrades. *(The True Color Tree)* |
| F14 | **A milestone built from an exploding formula makes every later milestone unreachable** — and with it the whole automation ladder. | The brief promised six automation steps; the thresholds ran to `10^(10^60)` and steps 2–6 never fired. Milestone thresholds must be table-driven per era, not computed from a runaway expression. *(The Truth Tower)* |
| F15 | **A discrete endgame purchase must be unaffordable until the ladder before it is finished.** | Priced below the previous ladder's top, a greedy run buys it immediately and skips the entire final era — measured live as a 0.1 h finale. Price the rungs just past the ladder's end. *(The Truth Tower)* |
| F16 | **Coupled feedback (milestone → income → banking → milestone) creates mid-game cliffs** even when the multiplier budget is correct. | A single layer unlock moved income from 1e6 to 1e60 in one cascade. Bound each milestone's production reward relative to the NEXT milestone's threshold; this is invisible to a static rule and only a simulator shows it. *(The True Color Tree)* |

## Part G — Failure playbook (symptom → action)

Moved here from SKILL.md so there is exactly one copy. Part C above is the *crash* table
(symptoms that stop the game); this is the *behavioural* table (the game runs and is wrong).
Find the symptom, apply the action, and re-run Stage 5.

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
| The game "hangs" on load, or the win screen fires immediately | a top-level throw in mod.js killed every later `var`/`let`, so an endgame constant is `undefined` and `isEndgame()` is true on tick 1 (07 Part F3). `node tools/smoke.js` finds it in one second |
| The currency shows `0.00` for the whole opening | the game starts below 1e-4 and `modInfo.allowSmall` is unset (07 Part F1) |
| The endgame ritual does nothing | `layeradd(x, base)` with a Decimal instead of a plain number — silently a no-op (07 Part F2) |
| A layer's upgrades work but the content is half missing | `row*10 + col` ids collided at col ≥ 10 and the engine dropped entries as duplicate keys — no error (07 Part F5) |
| Six automation milestones, none of them ever fires | the thresholds were computed from an exploding formula and are unreachable; table-drive them per era (07 Part F14) |
| Buying upgrades changes nothing at all | the classic `N-UNWIRED` defect — see handbook 11 §2 |
| The text is half in one language and half in another | missing keys silently fall back to the literal; `node scripts/i18n_check.js <game>` names every one (handbook 15 §3) |
| A number is displayed in one place and applied as another | a real defect: a display showed ×1.5 while the consumer applied ×2.5, and a buyable showed `x^1.5` against an applied `x^1.6`. Read the value out of the same expression the consumer reads |
| Players complain they pay twice for one layer | an upgrade gates a layer that still charges `requires` — switch to a threshold (N-UNLOCKPAYGATE) |
| Nobody knows the hotkey exists | the key is missing from the hotkey's `description` string (N-HOTKEYDESC) |
