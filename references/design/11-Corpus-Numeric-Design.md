# 11 — Corpus-Calibrated Numeric Design

> **Audience:** the AI generating a TMT game. Handbooks 09 and 10 tell you what *structure*
> real games use. This one is the numeric counterpart, measured over **every component in
> 329 real TMT games** — 1,156 layers, 29,141 components, 36 MB of source, each figure
> traceable to file + line.
>
> **Provenance:** full numeric archive at `E:\Idle-Skill\archive\` —
> `TMT_全量数值档案_Vol01–05.md` (per-file, all raw source),
> `TMT_数值数据库.json` (machine-readable, 143 MB),
> `TMT_生成式AI增量游戏数值设计指南.md` (the full write-up),
> `TMT_遗漏与不确定项.md` (what could NOT be determined, and why).
> Machine-readable subset: `assets/balance-defaults.json` → `corpusBaselines`.
>
> **The one-line lesson:** in a real TMT game the numbers do not live on the components.
> **54.4% of real upgrades have no `effect()` at all** — their power is wired into the
> layer's `gainMult()`. Generate self-contained `effect()`s and never wire them, and you
> get a game that runs, buys, displays, and *does nothing*, without a single error.
> That failure is invisible to every other check in this skill, which is why `N-UNWIRED`
> exists.

---

## §0 Read this before trusting any corpus number

The archive reports what *is*, never what *must be*. Two hard limits:

1. **Absence of a field in the corpus proves it is unused, not that it is unsupported.**
   We initially concluded "TMT challenges cannot be repeatable" because `canBypass` and
   `countTowardsCompletion` appear 0 times. `references/core/04` and the engine source
   proved that wrong: `completionLimit` is real (`js/technical/layerSupport.js:109-110`
   defaults it to 1) and 374 real games use it. **Check field legality against the
   handbook and `template/js/`, never against the corpus.**
2. **Layer files only.** The dataset is `layers.js` files. `game.js`/`utils.js` are
   absent — which is exactly why the "effects live outside" finding in §2 exists.

---

## §1 Component density: what "normal" looks like

| Entity | Corpus total | Per-layer mean |
|---|---|---|
| layers | 1,156 | — |
| upgrades | 13,746 | 11.9 |
| **challenges** | **521** | **0.45** |
| milestones | 5,369 | 4.6 |
| achievements | 3,032 | 2.6 |
| buyables | 2,875 | 2.5 |
| clickables | 2,664 | 2.3 |

Components per layer (the 993 layers that have any):

```
p25 = 6    median = 15    p75 = 29    p90 = 56    p99 = 313    max = 486
83.7% of layers have ≤ 40 components
```

**Generate 8–30 components per main layer.** The 486-component layer (`c0v1d` `ct`) is a
top-0.1% outlier, not a model.

**Challenges are 1.8% of all components.** If your generator splits component types
evenly, it will produce something no human made. Weight: upgrades + milestones +
achievements dominate; challenges are a punctuation mark.

Layers per game: median 11, p90 41, max 74; **191 of 329 files have exactly one layer**
(most are unmodified template copies — the true independent-game count is far lower).

---

## §2 The wiring discipline (the single most important section)

### 2.1 What real games do

Of 13,746 corpus upgrades, **7,472 (54.4%) have no `effect()` field**. Example,
`Acamaeda_Candy-Tree.js` L26-32:

```js
11: { description: "Gain twice as many candies.", cost: new Decimal(10),
      unlocked() { return player.totalPoints.gte(10) } },
```

There is no effect. Its power is read *by the layer*:

```js
// Acamaeda_Candy-Tree.js L15-20
gainMult() {
    mult = new Decimal(1)
    if (player.c.upgrades.includes(22)) mult = mult.times(2)
    if (player.c.upgrades.includes(14)) mult = mult.times(layers.c.upgrades[14].effect())
    return mult
}
```

So the upgrade is a **purchase token**; the arithmetic lives in `gainMult()` /
`gainExp()` / `passiveGeneration()` / `getPointGen()`, keyed on `hasUpgrade(...)` or
`.upgrades.includes(...)`.

### 2.2 What goes wrong when you skip it

Corpus unlock-gating: 9,079 upgrades (66.1%) gate on an upgrade, 967 (7.0%) on a
milestone. If you write 40 upgrades with self-contained `effect()` and never reference
one id from any formula:

- the game loads fine, no console errors
- the upgrade is purchasable, the cost deducts
- `effectDisplay()` renders a real-looking multiplier
- **nothing about the game's numbers changes**

This is the defect `N-UNWIRED` was written for, and it is the reason it is a **FAIL**.

### 2.3 The rule

Every upgrade is exactly one of two things, and you must know which:

| Kind | Shape | Where the math lives |
|---|---|---|
| **token / gate** (K7) | `unlocked()` + `onPurchase()`, no `effect()` | in the layer hook or another layer |
| **value** | has `effect()` | its id must appear in a consumer |

When you write an `effect()`, write the consumer in the same breath:

```js
gainMult() {
    let ret = new Decimal(1)
    if (hasUpgrade("p", 11)) ret = ret.times(2)      // <-- the consumer
    if (hasUpgrade("p", 14)) ret = ret.times(upgradeEffect("p", 14))
    return ret
}
```

Two accepted forms:

- `if (hasUpgrade("p", 11)) ret = ret.times(2)` — inline branch
- `ret = ret.times(layers.p.upgrades[14].effect())` — reads the effect lazily

**If an `effect()` is read only by `effectDisplay()`, it is a lie** — it shows a number
that never applies. Either wire it or drop it.

> Corpus footnote: in the real dataset only **2 of 1,156 layers** do this wiring inside
> their own file, because most of it lives in `game.js`/`utils.js`, which the dataset does
> not contain. When *you* generate a game you own both sides — so wire it explicitly
> rather than assuming some other file will.

---

## §3 Cost ladders

### 3.1 Shape of real costs (13,746 upgrades)

| Cost form | Count | Share |
|---|---|---|
| `new Decimal(<literal>)` | 6,716 | 48.9% |
| `function()` | 3,251 | 23.7% |
| expression | 2,454 | 17.9% |
| arrow | 822 | 6.0% |

By growth: **constant 49.3%**, dynamic function 29.7%, exponential 10.6%.

**Half of real upgrade costs are hand-written constants.** A generator that emits
`cost = base * mult^n` everywhere produces a different shape of game: geometric ladders
are near-linear at small n, so early game flattens and mid-game cliffs.

Literal-cost magnitudes (5,038 samples): **38.7% are ≥ 1e10**.

### 3.2 A real ladder to copy the *shape* of

`c0v1d-9119361_The-Modding-Tree.js` layer `s`, L2586-3015, 5×5 grid, `requires: Decimal.pow(10,10310)`:

```
5e3 → 2 → 3e7 → 77777777 → 1.5e12 → 1e15 → 2.22e22 → 5e38 → 7 → 5e58 → 1e63
→ 5e164 → 15e271 → Decimal.pow(10,54490) → 10^60100 → 10^7e4 → 10^87700
→ 10^133420 → 10^146060 → 10^191185 → 10^215350 → 10^225315 → 10^301777
→ 10^435630 → 10^545766
```

Two devices worth stealing:

1. **The cheap key upgrade.** Upgrade `24` costs `new Decimal(7)` (L2729), wedged
   between `5e38` and `5e58`. It advances nothing numerically; it opens the next stretch.
   A rhythm breath, not a bug. Ladders must be allowed to **drop**.
2. **Form switching.** The first 13 are literal (hand-computable), the last 12 are
   `Decimal.pow(10, n)` with hand-picked exponents (54490, 60100, 7e4, 87700 …) that
   show **no fixed ratio** — they were tuned backwards from "how long should this stretch
   take".

**Generation target: a ladder spanning ≥ 6 orders of magnitude, non-monotonic allowed,
one or two deliberate drops marked as key upgrades.** (`D-COSTSPAN` WARNs below 3.)

---

## §4 Gain curves

Op frequency across 6,274 effect-bearing upgrades:

| Op | Count | Meaning |
|---|---|---|
| `.pow()` | **4,830** | exponent on own amount — the workhorse |
| `.add()` | 3,364 | small additive floor |
| `.log10()` | **3,350** | compression for late game |
| `.mul()`/`.times()` | 1,652 | plain multipliers |
| `.sqrt()` | 61 | rare, usually inside a pow |
| `softcap()` | **39** | rare; the cap usually lives on the layer |

**`.pow` outnumbers `.mul` roughly 3:1.** A layer whose every effect is `times(2)` reads
as an unfinished draft (`D-EFFECTSHAPE`).

Two real shapes worth copying:

```js
// Acamaeda L40 — pow, with a hard re-root so the numbers stay Decimal-bounded
effect() {
    let ret = player.c.points.add(2).pow(0.5)
    if (ret.gte("1e20000000")) ret = ret.sqrt().times("1e10000000")
    return ret
}
// Acamaeda L63 — log compression
effect() { return player.points.add(1).log10().add(1).pow(/* n */) }
```

**Generation target: ≥ 30% of a layer's upgrades use a `pow`/`log` shape**, and every
main layer ships at least one (enforced by `D-EFFECTSHAPE`).

> **But not early.** Handbook 12 (the TMT author, 2020-10-07): *"Exponents are very weak when
> the value that they are boosting is low. They make for bad early upgrades. (Tetration even
> more so!)"* `points.pow(0.5)` on 12 points is 3.46 — noise next to your next cost. The corpus
> shows `pow` dominating **because most upgrades are mid/late**, not because it is right for
> row 0. Synthesis: **flat or absolute bonuses in the first layer, shaped curves from the
> second layer onward**, and any `pow` early must still pay something meaningful at zero.

---

## §5 Softcaps

**Only 69 of 1,156 layers (6.0%) define a `softcap`.** Two forms in the wild:

```js
// constant — Rainbow Void Tree L1186 (layer g)
softcap: new Decimal("e777777")

// constant that an upgrade raises — Mario Maker 2 L2110 (layer coin)
softcap() {
    let Csoftcap = new Decimal("e1.8e12")
    if (hasUpgrade('super_hammer', 14)) Csoftcap = new Decimal("e30000000000003")
    return new Decimal(Csoftcap)
}
```

The pattern is **low default, expensive raise**: the cap turns runaway growth into a
paywall. Note also that only 39 upgrades call `softcap()` *inside* their `effect()` — the
dominant idiom is the layer-level cap, not per-upgrade capping.

**Generation target:** cost scaling does the shaping; reach for a softcap only where a loop
would genuinely run away. If you do cap, put the cap where the *next* layer unlocks. **Only
sell a cap-raising upgrade if the cap is visible to the player** — handbook 12 (2021-02-24):
*"Don't do upgrades that modify softcaps, unless it's clear where the softcap is."* A hidden
cap that an upgrade raises is the single most confusing mechanic in the genre.

---

## §6 Engine fields the engine never reads

Grounded in `template/js/`, **not** in corpus absence:

| Where | Ghost key | Use instead | Why |
|---|---|---|---|
| `challenges` | `reward` | `rewardDescription` + `rewardEffect()` | `js/components.js:148` renders `rewardDescription` — `reward:` shows a **blank line**. 212 real games have this bug. |
| `challenges` | `repeatable` | `completionLimit: n` | `completionLimit` is real (`layerSupport.js:109-110` defaults it to 1) |
| `challenges` | `canBypass` | your own flag + `onExit()` | not a TMT field |
| `challenges` | `countTowardsCompletion` | `countsAs: [id, …]` | not a TMT field |
| `milestones` | `persistent` | delete it | milestones are always persistent |
| `achievements` | `condition` | `done()` | 0 of 3,032 real achievements use `condition` |
| `achievements` | `secret` | delete it | TMT lists all achievements, uncompleted ones dimmed |
| layer | `grids` | `grid` (singular) | 0 of 1,156 real layers use it |

Enforced as `N-GHOSTFIELD` (WARN — the key is dropped silently, so it is a content bug,
not a crash).

**Also observed:** `addBuyable` / `addClickable` / `addAchievement` / `addGrid` / `addBar`
are called **0 times** across 329 games. Components are inlined in `addLayer()`. Buyable
pricing is the engine's: 90.4% of the 2,875 real buyables have a function cost. Hand-write
a few `cost(x)` bodies; do not re-implement the engine's ladder.

---

## §7 Generation-time checklist (extends 07 Part D and handbook 10 §6)

1. **Every upgrade is classified** — token/gate (no `effect`) or value (effect + a
   consumer that references its id). No upgrade sits in neither column.
2. **No `effect()` is read only by `effectDisplay()`.**
3. **Cost ladder spans ≥ 6 orders**, with ≥ 1 deliberate drop marked as a key upgrade.
4. **≥ 30% of each layer's upgrades use `pow`/`log`**; every main layer has ≥ 1.
5. **8–30 components per layer**; challenges ≤ 15% of the layer's upgrade count.
6. **A layer-level `softcap` on every unbounded loop**, with an upgrade that raises it.
7. **Zero ghost fields** (table in §6).
8. `N-UNWIRED` = 0 FAIL. This one is not negotiable and not substitutable — every other
   rule can be satisfied by well-written code that still does nothing.

---

## §8 Where the numbers live

| File | Use |
|---|---|
| `assets/balance-defaults.json` → `corpusBaselines` | machine-readable corpus figures used by Stage 2 / Stage 6 |
| `assets/fun-quota.json` → `corpusEffectShares`, `staticCheckThresholds` | effect-shape quotas + the thresholds mirrored in `static_checks.js` |
| `E:\Idle-Skill\archive\TMT_全量数值档案_INDEX.md` | per-file index of all 329 files with component counts |
| `E:\Idle-Skill\archive\TMT_数值数据库.json` | every component with cost/effect/unlock, line numbers, and full raw source |
| `E:\Idle-Skill\archive\TMT_遗漏与不确定项.md` | what could NOT be determined (14 runtime-generated collections, 153 factory-built components, the out-of-file effects) |

## §9 Dataset notes

- **329 files.** They are a flat harvest of ~130 different GitHub repos' layer
  files — not one game, and there are no subdirectories.
- **119 files are 26 identical-content groups** (by SHA256); 39 are the unmodified TMT
  template. Template noise inflates the "no effect() / constant cost" statistics, which
  only strengthens the recommendations: even with the noise, real design shows up.
- **175 files are minified or partly minified.** Line numbers collapse, so every archived
  component also carries `charStart`/`charEnd`.
- 34 files contain no `addLayer()` at all (one game is an OOP procedural tree, four are
  third-party libraries, ten are entry/data/tools).