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
- [ ] Prestige config: `type` + `baseResource`/`baseAmount()`/`requires` (+`exponent` for normal, `base`/`roundUpCost`/`canBuyMax` for static).
- [ ] `gainMult()`/`gainExp()` returning `new Decimal(1)` initially.
- [ ] `layerShown()`; `hotkeys` with safe `onPress`.
- [ ] `branches: [...]` pointing at the layer(s) it resets, and tree `position`s that don't collide.
- [ ] Content: upgrades (row-col ids), milestones (chain via `unlocked()`), challenges/buyables/clickables/bars/infoboxes as designed.
- [ ] `doReset(resettingLayer)` ONLY if this layer must keep things on reset — then `layerDataReset(this.layer, keep)` inside it.
- [ ] Register the file in `modFiles`.

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
