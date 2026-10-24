# 09 — Layer Design Patterns: What Published TMT Games Actually Look Like

> **Purpose:** quantitative + qualitative design patterns extracted from 132 playable TMT mod trees, so a generator can *design a good tree before writing code*. This file is the "what does a good game look like" companion to 00–07 ("how the engine works") and 08 ("which games exist").
>
> **Companion data:** the machine-readable per-game metrics behind this file (`design-metrics.json`: layer records, component counts, milestone chains, cost shapes, automation wiring, tree edges) and the extractor that produced them live in the source project repository — they are **not shipped with this skill**; this file plus the JSON assets in `assets/` carry everything generation needs.
>
> **Method:** a brace/quote/comment-aware source scanner parsed every `addLayer()` block in the dataset (297 files → 132 distinct games after content-dedupe and translation-pair collapse), extracting 40+ structural metrics per layer. Top games were then read manually to explain *why* the numbers look the way they do. All code excerpts below are verbatim from dataset files (named inline).

---

## 1. Corpus at a glance (what the numbers say)

Across 132 games / 770+ main layers:

| Signal | Value |
|---|---|
| Main layers per game | median **3–5**; 6–10 in 19 games; 11+ in 17 games |
| Rows used | row 0 (166 layers) < row 1 (**215**, peak) < row 2 (112) < row 3 (71) < row 4 (33) < 5+ (rare) |
| Row-0 prestige `type` | `normal` 100 · `static` 20 · `custom` 20 · `none` 20 |
| Row-1 `type` | `none` 68 · `normal` 64 · `static` 52 · `custom` 24 (the melting pot) |
| Row 2–3 `type` | `static`/`custom`/`none` take over; `normal` fades |
| Static layer `exponent` | `1` (29) or dynamic (51) — static layers are "buy N times" counters, not exponential |
| Static layer `base` | **2** dominates (each purchase ≈ ×2 requirement), then 1.5 / 3 / 5 / 10 |
| Prestige `exponent` (normal type) | **0.5 in 179 layers** — the default; deeper rows drift to 0.4–0.25 |
| Upgrade grids | **5×5 is the standard** (61 layers), then 10×5 (21), 4×4 (8) |
| Milestones per layer | median **5**, p75 10 |
| Buyable cost shapes (classified) | exponential 283 · exponential-dynamic 114 · polynomial 38 · linear 23 |
| Hotkeys | 103 / 132 games define ≥1 |
| Requires form (main layers) | static literal 51% · dynamic function rest |
| Automation wiring (`autoPrestige`/`autoUpgrade`/`passiveGeneration` props) | present in every game rated ≥6.5 sampled; near-absent below 5 |

### 1.1 Analysis sample table (16 games, best-first)

Metrics from `design-metrics.json`; `U/M/C/B/A` = upgrades/milestones/challenges/buyables/achievements totals; `auto` = automation property count; `softcap` = layers using layer-`softcap` or the `softcap()` helper.

| Game | Rating | Main layers | Rows | U | M | C | B | A | auto | softcap | Tree shape (edges tell) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| The Mining Incremental Table | 9.6 | 86 | 1,101…2101 | 1136 | 148 | 7 | 77 | 191 | 4 | 0 | custom producer web, huge side systems |
| The Mario Maker 2 Tree | 8.1 | 38 | 0–19 | 761 | 249 | 18 | 81 | 147 | 52 | 4 | deep chain w/ fan-out per row |
| Incrementreeverse | 8.0 | 16 | 0–4 | 245 | 31 | 18 | 31 | 0 | 0* | 3 | hub `p` + side branches, then deep chain |
| Gaokao Tree | 8.0 | 8 | 0–1 | 49 | 25 | 0 | 22 | 28 | 7 | 2 | 4 subjects → exam hub `gk` |
| One Point One Layer | 7.8 | 29 | 0–7 | 173 | 281 | — | — | — | 28 | — | branching pairs off `p`/`b`/`g` |
| Spring Festival Tree 2026 | 7.8 | 15 | 0–3 | 197 | 105 | 9 | 19 | 50 | 13 | 2 | chain + side story layer |
| Zhang Tree | 7.7 | 1+ | 1+ | 25 | 0 | 0 | 0 | 0 | 0 | — | single-layer inflation (modFiles missing) |
| C0v1d Modding Tree | 7.6 | 15 | 0–4 | 1026 | 292 | 36 | 279 | 169 | 8 | — | linear v-i-r-u-s-d + post-victory U* layers |
| Antreematter Dimensions | 7.3 | 4 | (dyn) | 13 | 6 | 0 | 16 | 0 | 0 | 0 | AD-style 4-column |
| Celestial Incremental | 7.3 | 1+ | 1+ | 22 | 0 | 0 | 3 | 0 | 0 | 0 | (partial: modFiles missing) |
| Gods of Incremental 2 | 7.0 | 17 | 1–2 | 68 | 0 | 0 | 64 | 0 | 0 | 0 | buyable-centric tree |
| Spring Festival 2025 | (7.0) | 6 | 0–3 | 80 | 35 | 13 | 10 | 40 | 8 | 0 | small chain + achievements side |
| The Rhythm Game Tree | 5.5 | 9 | 0–3,6 | 162 | 29 | 14 | 34 | 62 | 12 | 5 | genre stages + side rhythm minigame |
| The Tree Of Life | 5.0 | 28 | 0–3 | 939 | 570 | 65 | 133 | 12 | 3 | 0 | wide, content-heavy, mid rating |
| The Click Tree | 3.7 | 8 | 0–7 | 37 | 22 | 5 | 2 | 16 | 0 | 0 | thin vertical (anti-example) |
| The Prestige Chain | 1.0 | 13 | 0–12 | 323 | 108 | 20 | 100 | 0 | 0 | 0 | 13-row monotony (anti-example) |

\* Incrementreeverse wires automation inside custom `update()` loops instead of the standard props.

**Read of the table:** rating correlates with *content per layer* (upgrades+milestones per main layer: Mining ≈ 15, Mario ≈ 27, Gaokao ≈ 12 — vs Click Tree ≈ 7, Endless Tree ≈ 2) and with *automation density*, not with layer count. A 5-layer game with 40 milestones can outrate a 28-layer game.

---

## 2. Named design patterns

Each pattern: **What / When to use / Why it works / real code / variants**. Source files are named by their dataset filename in the source corpus (not shipped with this skill). P1–P17 come from the corpus crawl; P18–P29 add *One Dev One Layer* (接力树, an 8-author relay tree analyzed as a full game outside the corpus), P30–P43 add *Celestial Incremental* (same), and P44–P63 come from five corpus games read in depth (C0v1d Plague Tree, The Mining Incremental Table, Incrementreeverse, The Tree Of Life, The Prestige Chain). Tags: `[required]`/`[recommended]` = use in normal generation; `[advanced]` = needs a checker guardrail or blueprint gate; `[optional]` = flavor.

---

### P1 — The Normal(0.5) Opener  `[required]`

**What:** the very first layer is always `type: "normal"`, `exponent: 0.5`, `requires` = a *tiny* number (2–10 in 58 of 70 games; **10 is the mode**), with a hotkey and an early first milestone (reward is a flat multiplier, not automation).

**When:** row 0, always. Even games that later go fully custom (Gaokao, Incrementreeverse) open with an approachable ×√points reset.

**Why:** √ gives fast early resets (5×points → ~2.2× currency) so the first prestige happens in under a minute. `requires: 10` means the first reset is ~1 tick away — instant gratification.

```js
// angrystar6k_The-Mario-Maker-2-Tree.js — layer "coin"
requires: new Decimal(10),
resource: "Coins",
baseResource: "cleared courses",
baseAmount() { return player.points },
type: "normal",
exponent: 0.5,
row: 0,
hotkeys: [
    { key: "c", description: "C: Reset for Coins",
      onPress() { if (canReset(this.layer)) doReset(this.layer) } },
],
passiveGeneration() { return hasMilestone('super_mushroom', 0) || hasAchievement('achievements', 34) },
```

**Variants:** logarithmic opener (Incrementreeverse `i`: `pts.max(10).log10().pow(exp)` — slower but idles forever); `requires: 0` for always-available side subjects (Gaokao `chi`).

---

### P2 — The Requires Ladder  `[required]`

**What:** each row's entry requirement is a large multiple of the previous row's requirement. Measured adjacent-row ratios cluster around **×10–×100 (median ×25)** for trees where row n+1 builds on row n's currency. The ×2-per-row "official docs" example is *not* what real games do — real games jump by orders of magnitude and let prestige loops fill the gap.

**When:** every new row. **Why:** a row change should feel like an era change; ×25–×100 forces a few dozen resets of the *current* layer, which is where its upgrades/milestones get consumed.

```js
// angrystar6k_The-Mario-Maker-2-Tree.js — rows 0→1
// coin:  requires: new Decimal(10)   (points)
// super_mushroom:  requires: new Decimal(500)  (coins)  → ×50
// cape_feather (row 3): requires: new Decimal(1e86)  (big mushrooms)
```

**Variants:** multi-row leaps (Mario Maker jumps to e86 at row 3 because intermediate layers chain different resources); dynamic requires that fold in `unlockOrder` (see `increaseUnlockOrder` in 03) when same-row siblings unlock sequentially.

**Warning:** ratios below ×1 measured in the wild (The Click Tree: 100000 → 50 → 30 → 20 → 10 → 5) are anti-pattern A1.

---

### P3 — Decreasing Prestige Exponent  `[recommended]`

**What:** as rows deepen, `exponent` drops: 0.5 (row 0) → 1/3 (row 1) → 0.25 (row 2+). Corpus exponents: 0.5×179, then 0.4/0.3/0.25/0.2/0.1 tails.

**Why:** with `gain = base^exponent`, a lower exponent keeps per-reset gains sane while base amounts explode, and it makes `gainExp()` boosts (a classic reward) proportionally stronger.

```js
// angrystar6k_The-Mario-Maker-2-Tree.js — layer "super_mushroom" (row 1)
requires: new Decimal(500),
baseResource: "coins",
baseAmount() { return player.coin.points },
type: "normal",
exponent: 1 / 3,
branches: ["coin"],
```

**Variant:** keep 0.5 but add layer-`softcap` later (P12); or go `custom` and control the curve directly (P8).

---

### P4 — Milestone Automation Ladder  `[required]`

**What:** automation unlocks in a **fixed order**, as *milestones* on lower layers, each at a ×~2 threshold spacing (measured median ratio ×2, p25 ×1.5, p75 ×5):

1. **keep-on-reset** (`resetsNothing` / milestone "resets don't reset X") — cheapest,
2. **passiveGeneration** (offline-style gain without resetting),
3. **autoPrestige** (auto-reset the layer),
4. **autoUpgrade** (auto-buy upgrades — most expensive, usually last),
5. **autoBuyable** (closed-form buyMax driver for an earlier layer's load-bearing buyable —
   2026-10-24, added after the generated games always shipped upgrade autobuyers but never
   buyable ones; the cause was demand-side: their buyables had no cross-layer consumer, so an
   autobuyer would automate a dead effect — see `N-BUYABLEDEAD` and P54 for the inverse-solve
   form; `+1`-per-tick loops are the anti-form, `D-AUTOINVERT`).

Grants are **cross-layer**: layer N's milestones automate layers < N, so progress always feels like it "reaches back" and fixes old tedium. Achievements act as an alternate path to the same flags (redundancy).

```js
// angrystar6k_The-Mario-Maker-2-Tree.js — automation wiring (excerpted across layers)
// coin (row 0):        passiveGeneration() { return hasMilestone('super_mushroom', 0) || hasAchievement('achievements', 34) }
// coin milestone 0:    done() { return player.points.gte(6871) }          // ×2.5 coins — the gate
// super_mushroom:      resetsNothing()  { return hasMilestone('super_mushroom', 1) || hasAchievement('achievements', 32) }
//                      passiveGeneration(){ return hasUpgrade('coin', 35) || hasAchievement('achievements', 34) }
//                      autoUpgrade()    { return hasMilestone('invincible_star', 3) || hasAchievement('achievements', 61) }
// cape_feather (row3): autoUpgrade() { return hasMilestone('propeller_mushroom', 3) },
//                      autoPrestige()  { return hasMilestone('propeller_mushroom', 3) },
//                      resetsNothing() { return hasMilestone('propeller_mushroom', 3) },   // granted together!
```

**Why it works:** each unlock removes one specific chore. Granting `autoPrestige`+`autoUpgrade`+`resetsNothing` for a layer *as one package* (cape_feather above) is the QoL endgame move.

**Variants:** `automate()` custom loops for buyables (cape_feather sets buyable amounts from a currency each tick — see P15); milestone-granted `buyMax` in `update()` (Incrementreeverse `i`: every 1s, `layers.i.buyables[11].buyMax(times * mult)` when `hasMilestone("a", 2)`) — promoted to ladder **step 5** (2026-10-24) after the generated games shipped upgrade autobuyers but never buyable ones, because their buyables had no later consumer (`N-BUYABLEDEAD`).

---

### P5 — Static Floors  `[recommended for rows ≥2]`

**What:** rows ≥2 often switch to `type: "static"` "floors": each purchase costs `base^purchases` of the base resource, `exponent: 1`, `base: 2` dominating (then 1.5/3/5/10). They gate *purchases* instead of reset velocity, and are where `canBuyMax`, `roundUpCost`, and bulk-buy automation live.

```js
// angrystar6k_The-Mario-Maker-2-Tree.js — layer "cape_feather" (row 3)
requires: new Decimal(1e86),
type: "static",
exponent: 5,                                  // cost curve steepness inside the floor
canBuyMax() { return hasUpgrade("cape_feather", 33) },   // bulk-buy as an upgrade reward
hotkeys: [
    { key: "C", description: "Shift+C: Reset for Cape Feathers", ... }],   // Shift+letter = second layer on same key
autoUpgrade() { return hasMilestone('propeller_mushroom', 3) },
```

**Why:** static layers create *decisions* (spend floor currency on upgrade A or B) instead of *clicks*. `base: 2` keeps the next purchase always ~1 reset away — the "just one more" loop.

**Variants:** `base: 1.01–1.1` = soft walls (buy everything eventually); `base: 5–10` = hard choices; `canBuyMax()` gated by an upgrade is the standard reward for finishing the floor.

---

### P6 — Buyable Cost Curves  `[required when using buyables]`

**What:** classified cost shapes: **exponential base 2–4** is the workhorse (`Decimal.pow(base, x)`); **level-stepped exponential** for big-ticket buyables (`pow(level, k)` inside the exponent); polynomial for small repeatables; *cost softcaps* (`if (x.gte(...)) x = x.pow(...)`) to blunt late scaling.

```js
// angrystar6k_The-Mario-Maker-2-Tree.js — super_mushroom buyable 11: level-stepped exponential
buyables: {
    11: {
        title: "999-coin clear condition",
        cost(x) { return new Decimal(3e24).pow(Decimal.pow(x, 1.5).add(1)) },
        display() { return ` Effect: ${format(this.effect())}x ... Level: ${formatWhole(player[this.layer].buyables[this.id])} ... Cost: ${format(this.cost())} super mushrooms` },
        canAfford() { return player[this.layer].points.gte(this.cost()) },
        buy() { player[this.layer].points = player[this.layer].points.sub(this.cost())
                setBuyableAmount(this.layer, this.id, getBuyableAmount(this.layer, this.id).add(1)) },
    },
}
```

**Heuristics from corpus:** small repeatables `cost = start × base^x` with base 2–4 and start ≈ 10× layer currency unit; one "milestone multiplier" buyable per layer (effect = flat ×N per level) is the most common single buyable; `purchaseLimit` for one-off unlocks.

**Variant:** formula-transparency QoL — Mining shows gain *and* cost formulas when holding Shift (`shiftDown ? formula : ""`).

---

### P7 — The Upgrade Chain & 5×5 Grid  `[required]`

**What:** upgrades come in 5-column grids (5×5 = 61 layers in corpus, 10×5 for mega-layers), ids `11..15, 21..25, ...`, and within a row of upgrades each gates the next:

```js
// angrystar6k_The-Mario-Maker-2-Tree.js — super_mushroom upgrades (costs: 1 → 3 → 1528 → 3e10 → 5e20)
upgrades: {
    11: { title: "I'm stronger!",
          description: "Multiply cleared courses gain based on super mushrooms.",
          cost: new Decimal(1),
          effect() { return player.super_mushroom.points.add(2).pow(1.25).times(2) },
          effectDisplay() { return format(upgradeEffect(this.layer, this.id)) + "x" } },
    12: { title: "Be able to break normal bricks",
          description: "1.5x super mushroom gain and unlock more coin upgrades.",
          cost: new Decimal(3),
          unlocked() { return hasUpgrade('super_mushroom', 11) } },
    15: { title: "You need a stronger power-up, right?",
          description: "Unlock a new layer",
          cost: new Decimal(5e20),
          unlocked() { return hasUpgrade('coin', 25) || hasUpgrade(this.layer, this.id) } },
}
```

**Conventions observed:** first upgrade costs ~0–1 (instant dopamine; Mining's "游戏开始" upgrade costs 0); row-1 upgrades boost *points/previous layer*, row-2 upgrades boost *this layer*, row-3 upgrades unlock things (milestone/challenge/buyable/layer); the last column's final upgrade is the "exit ticket" (`Unlock a new layer`); chain-gating via `hasUpgrade(this.layer, this.id - 1)`.

**Measured:** median cost ratio between consecutive chained upgrades **×5** (p25 ×1.5, p75 ×1000 — two regimes: gentle 5-upgrade ladders and aggressive 3–4-order jumps at row ends).

---

### P8 — Custom Prestige Types for Theme Fit  `[advanced, high impact]`

**What:** `type: "custom"` + your own `getResetGain()` / `points()` / `getNextAt()` when the theme demands a non-standard resource. Two canonical shapes:

**(a) Score-based (Gaokao Tree — exam scores capped at real-world maxima):**

```js
// loader3229_gaokaotree.js — layer "chi" (Chinese subject), abridged
type: "custom",
requires(){ return new Decimal(0) },          // available from start
resetsNothing(){ return true },
getResetGain(){ return this.getResetGainStable().mul(1 + Math.random()) },  // exam jitter!
points(){                                     // displayed score = log-scale of study
    let ret = player.chi.points.add(5).log10();
    if (hasUpgrade("u", 12)) ret = ret.mul(1.1).add(1);
    if (ret.gte(90))  ret = softcap(ret, 90);        // pass line softcap
    if (ret.gte(150)) ret = softcap(ret, 150, 0);    // 150 = hard cap (power 0)
    return ret.floor();
},
prestigeButtonText(){ return window.chinesemode ? "学习语文！" : "Study Chinese!" },
```

**(b) Log-based endless growth (Incrementreeverse):**

```js
// pg132_The-Modding-Tree.js — layer "i"
type: "custom",
getResetGain() {
    let pts = layers.i.baseAmount(), pre = layers.i.getGainMultPre(),
        exp = layers.i.getGainExp(), pst = layers.i.getGainMultPost()
    let ret = new Decimal(0)
    ret = pts.max(10).log10().times(pre).pow(exp).times(pst).minus(1)
    if (inChallenge("am", 11)) ret = ret.root(10)     // challenges plug in as roots
    if (inChallenge("m", 11))  ret = ret.root(2)
    return ret
},
```

**Why:** `custom` decouples *displayed resource semantics* (scores, distance, energy) from reset mechanics, and gives you a clean injection point for challenge penalties (`root(n)`), randomization, and multi-resource formulas. Note Incrementreeverse separates `getGainMultPre/Post` around the `pow(exp)` — the standard place to slot multipliers so exponents don't amplify them (anti-breakout).

---

### P9 — The Reset Contract (doReset + keep lists)  `[required]`

**What:** every layer defines who resets it and what survives. The canonical form has three clauses:

```js
// angrystar6k_The-Mario-Maker-2-Tree.js — super_mushroom
doReset(resettingLayer) {
    if (layers[resettingLayer].row >= 12) return undefined        // (1) endgame layers reset nothing
    else if (layers[resettingLayer].row > layers[this.layer].row) { // (2) only strictly-higher rows reset me
        let kept = ["unlocked", "auto"]                            // (3) always keep unlock+automation flags
        if (hasMilestone('invincible_star', 2)) kept.push("milestones")   // milestone-gated keeps
        if (hasMilestone('master_sword', 9))  kept.push("upgrades")
        layerDataReset(this.layer, kept)
    }
},
```

**Corpus keep-list frequency:** `upgrades,milestones,auto` and `upgrades,buyables` lead; `points`-only for full re-run layers. Milestone-gated keeps are the standard *reward for late progress* ("from now on, X resets don't wipe your upgrades").

**Variant:** reset-scope by identity, not row (Mining `wood`): `if (layers[resettingLayer].name == ct && !hasMilestone(furnace, 0)) layerDataReset(this.layer, ["unlocked","auto"])` — furnace-tier milestones switch off resets entirely.

---

### P10 — Cross-Layer Web Wiring  `[required for cohesion]`

**What:** a layer's `gainMult()` is a checklist of *other layers'* upgrades/buyables/milestones — every new layer retroactively boosts the first one, so nothing is ever "left behind".

```js
// angrystar6k_The-Mining-Incremental-Table.js — layer "wood" gainMult (excerpt)
gainMult() {
    let m = one
    if (hasUpgrade(wood, 12))   m = m.times(upgradeEffect(wood, 12))
    if (hasUpgrade(stone, 11))  m = m.times(2)                       // next layer boosts wood
    if (hasCraftingItem(21))    m = m.times(5)                       // side system boosts wood
    if (hasUpgrade(copper, 23)) m = m.times(upgradeEffect(copper, 23))
    if (hasUpgrade(steel, 23))  m = m.times(upgradeEffect(steel, 23))
    if (hasCraftingItem(212))   m = m.times('1e2000')                // huge late boosts keep wood relevant
    return m
},
```

**Why:** the #1 cause of dead midgame in amateur trees is that layer 3 makes layer 1 irrelevant. High-rated games instead keep every currency in the consumption web of later ones.

**Rule of thumb (from Mining/Mario/C0v1d):** each new layer should add ≥1 line to ≥2 older layers' gain formulas, and ≥1 of its upgrades should boost the *first* layer.

---

### P11 — Achievement Backfill  `[recommended]`

**What:** achievements don't just give multipliers; they *grant concrete progress items* in other layers by pushing into their arrays in `update()`, with an idempotence guard:

```js
// angrystar6k_The-Mario-Maker-2-Tree.js — coin.update() (excerpt)
//keep layer unlocks upgrades
if (hasNormalAchievement(11) && !hasUpgrade('coin', 14)) player.coin.upgrades.push(14)
if (hasNormalAchievement(13) && !hasMilestone('coin', 2)) player.coin.milestones.push(2)
if (hasNormalAchievement(34) && !hasMilestone('super_mushroom', 0)) player.super_mushroom.milestones.push(0)
if (hasNormalAchievement(83) && !hasMilestone('super_leaf', 6)) player.super_leaf.milestones.push(6)
```

Their tooltips state the reward explicitly: `// achievements 31: "Get 3rd Invincible Star upgrade. Reward: ... Autobuy coin upgrades, forever."`

**Why:** replay value + catch-up for restarting players; and it doubles the automation ladder (P4) with an alternate unlock path. The `!hasUpgrade` guard prevents duplicate array entries (a real crash/save-bug source — see 07).

---

### P12 — Softcap Defense-in-Depth  `[required only for runaway loops]`

> **Revised 2026-10-03 after handbook 12 (the TMT author's own notes, 2022-07-04).**
> *"Cost scaling is usually better than softcaps… It's easier to understand, because it affects
> something simpler… (10x points isn't actually 10x if it's softcapped)."* **Reach for cost
> scaling first.** Softcaps are the fallback for a loop that would otherwise run away, not
> the default shaping tool. The corpus agrees: only **6%** (69 / 1,156) of real layers define a
> softcap, while cost ladders are the dominant mechanism everywhere. Prefer shaping through
> `cost()`/`requires` and use softcaps only where the numbers genuinely must not be unbounded.

**What:** when a softcap IS warranted, high-rated games cap runaway growth at **three independent places**, and sell "cap delay" as upgrade rewards:

1. **layer-`softcap` property** on the currency itself (engine-supported, applies to reset gain),
2. **`softcap(value, cap, power)` helper** inside individual `effect()`s,
3. **staged re-root ladders** inside custom `getResetGain()` for inflation games.

```js
// (1) angrystar6k_The-Mario-Maker-2-Tree.js — coin
softcap() {
    let Csoftcap = new Decimal("e1.8e12")
    if (hasUpgrade('super_hammer', 14)) Csoftcap = new Decimal("e30000000000003")  // upgrade RAISES the cap
    // NOTE (handbook 12, 2021-02-24): only sell cap-raising if the cap is VISIBLE.
    // "Don't do upgrades that modify softcaps, unless it's clear where the softcap is."
    return new Decimal(Csoftcap)
},
softcapPower() {
    let power = new Decimal(0.2)
    if (player.coin.points.gte(player.points)) power = new Decimal(0)   // anti-exploit: no cap while losing
    return power
},

// (3) qwqe198_Zhang-Tree.js — staged ladder in getResetGain (abridged)
if (g.gte(1e100)) g = expRoot(g, 2).mul(1e90)
if (g.gte(1e125)) g = expRoot(g, 2).mul(1e114)
if (g.gte(1e185)) g = expRoot(g, 2).mul(3e171)
```

**Also:** Gaokao caps displayed exam scores at the real-world 150 via `softcap(ret, 150, 0)` (power 0 = hard cap) — thematically motivated capping.

**Heuristic:** the first softcap on a currency should start roughly where the *next* layer unlocks; `softcapPower` 0.3–0.5 is the common range.

---

### P13 — Side Layers Are Utility Belts  `[required]`

**What:** `row: "side"` layers carry achievements (rows×cols grid), statistics, settings — but the best games also use them for **meta-progress dashboards** that narrate the theme:

```js
// qqqe308_The-Spring-Festival-Tree-2026.js — side layer "d" (Distance to home), abridged
row: 'side', type: 'none',
distance() {
    let stage = player.d.upgrades.length          // progress = upgrades bought in the side layer
    if (stage == 1) progress = player.points.add(1).log(2).div(10)          // fed by main layers
    if (stage == 5) progress = player.y.points.add(1).log(10).div(140).pow(1.2)
    // start=308 light-years → end=1 light-year, unit switches 光年→光分→km
},
```

**Observed side-layer population:** achievements (+secret achievements), stats, settings/toggles, story. Mario Maker's side `achievements` layer is the *second-largest layer in the game* (50KB) and is the alternate automation-unlock path (P4/P11).

---

### P14 — Theme as Structure  `[required for quality]`

**What:** in top-rated games the *theme determines the tree topology*, not just names/colors:

| Game | Theme → structure mapping |
|---|---|
| Mario Maker 2 | coin → power-ups (mushroom/flower/star…, 12 layers) → characters (mario/luigi/toad) → difficulty rows (easy/normal/expert/s_expert) → game modes (coop/versus/kaizo/speedrun…) → `the_end` |
| Gaokao | 4 subject layers (chi/mat/eng/is) → exam hub `gk`; scores capped at real limits |
| C0v1d | virus letters v-i-r-u-s-d, then post-victory `U*` layers |
| Mining | wood→stone→copper→iron… material tiers = Minecraft tool progression; logs/ores as sub-resources |
| Spring Festival 2026 | journey-home distance dashboard (side layer) + festival-themed layer names/symbols |

Supporting conventions: 2-letter `symbol`s, one accent `color` per layer (hex), custom `resetDescription`/`prestigeButtonText` in theme voice, i18n via `window.chinesemode ? "中文" : "English"` ternaries (or parallel `resourceEN` fields) when shipping bilingual.

**Why:** players rate *memorable structure* as highly as mechanics — the two 8.0+ Chinese-community darlings are both "theme = structure" games.

---

### P15 — Custom Core Loop (`type: "none"`)  `[advanced]`

**What:** when the theme is an *activity* (mining, farming), top games drop prestige resets as the core verb and build the loop from `clickables` + `bars` + `update()` on `type: "none"` layers, keeping prestige layers *around* the loop.

```js
// angrystar6k_The-Mining-Incremental-Table.js — layer "wood", abridged
type: "none",                       // no resetGain; currency produced by the loop below
startData() { return { unlocked: true, points: new ExpantaNum(0),
    hardness: ten, progress: zero, speed: two, destroying: false, ... } },
// tabFormat: a bar (woodDestroying) + clickable 11 ("swing pickaxe") + per-log display-texts
// update() advances progress by speed; on completion, adds logGain.oak (chained: oak→spruce→birch→…)
```

**Cost/complexity warning:** Mining is 2.7MB / 59k lines. For generated games, use this pattern *sparingly* (one loop layer max) and keep everything else prestige-based. Note this mod replaces `Decimal` with `ExpantaNum` (see §6 caveats — do not copy).

---

### P16 — Challenge Penalties as Formula Injection  `[recommended]`

**What:** challenges don't reimplement the game; they **inject penalties/bonuses into existing formulas** via `inChallenge()` checks, and their completion rewards do the same via `hasChallenge()`:

```js
// pg132_The-Modding-Tree.js — Incrementreeverse "i".getResetGain()
if (inChallenge("am", 11)) ret = ret.root(10)
if (inChallenge("m", 11))  ret = ret.root(2)
if (inChallenge("q", 22))  ret = ret.root(5)

// angrystar6k_The-Mario-Maker-2-Tree.js — coin.gainExp()
if (inChallenge('invincible_star', 11)) exp = exp.times(0.1)
if (hasChallenge('invincible_star', 12)) exp = exp.times(1.1)   // completion reward
```

**Why:** one formula, N behaviors — zero duplicated logic, no desync. `root()` penalties are preferred over division because they scale with progress instead of breaking it. (Component reference: challenge `countsAs` for layered challenge trees is in 04; corpus usage is sparse — 18 challenges in Incrementreeverse is the high end for custom-type games.)

---

### P17 — Developer-Ergonomics Conventions  `[recommended]`

Small habits found across top games that make 10k-line layers maintainable (and generated code reviewable):

- **`window.<lang>mode` i18n ternaries** and parallel `resourceEN` fields (Gaokao, Mining) — ship bilingual UI from one codebase.
- **Formula-on-Shift**: `["display-text", function () { if (shiftDown) return "公式：..." }]` (Mining) — experts get exact formulas, newcomers don't drown.
- **Author comments at integration points** — e.g. Mario Maker leaves `//冲突点位，需要调整` ("automation grant collision, needs tuning") right where two milestones both grant `autoUpgrade`; generated games should instead *assert* uniqueness at build time (see 07 checklist).
- **`milestoneOverpowered()` / `overpowered()`** second-tier milestone effects (Mario Maker) — milestones evolve when a late upgrade is bought; keeps early text honest without rewriting.
- **Milestone thresholds as content gates**: `done() { return player.points.gte(6871) }` — the number *is* the design; keep them ×2-spaced (median) early, ×5–×10 late.

### P18 — Challenge-as-Farm (`canComplete: false`)  `[recommended]`

**What:** a challenge that can never be completed — `canComplete()` is hardcoded false — becomes a repeatable dungeon: enter (onEnter wipes the field) → in-challenge resources accrue → exit (onExit banks completions via max) → the completion *count* itself grants exponential rewards and raises the next threshold.

**When:** mid/late game needs an active-play wall. One layer can host 4–9 isomorphic farms (l5 ships six at once). One Dev One Layer runs this on four layers (l3, l5, l6, l8) — the highest-usage mechanic in the game.

**Why:** extends P16 one step in time: the challenge stops being a one-shot exam and becomes a loop that automation eventually absorbs (l8 milestones 18/24 settle farm counts *outside* the challenge — the end of grinding is still automation, per P4).

```js
// One Dev One Layer (接力树) l5 — "anti-replicator" farm, 1 of 6 isomorphic farms
canComplete() { return false },
countcalc() {                      // in-challenge points -> completions earned this run
    let x = player.points.div('1e10700').max(1).log('1e100').root(1.5).add(1)
    return player.points.lte('1e10700') ? n(0) : x.floor()
},
goal()     { return Decimal.pow('1e100', player.l5.chalcomp[1].pow(1.5)).mul('1e10700') },
onEnter()  { player.points = n(0); player.l1.points = n(0); player.l1.repl = n(0); updateTemp() },
onExit()   { player.l5.chalcomp[1] = tmp.l5.challenges[11].countcalc.floor().max(player.l5.chalcomp[1]) },
effect()   { return player.l5.chalcomp[1].pow_base(10) },   // completions -> 10^n reward
// automation endpoint (l8 update): if(hasMilestone('l8',18)) player.l5.chalcomp[1] = ...countcalc.max(...)
```

**Variants:** bank-on-exit keep-max (l5) vs live rewrite of resources while inside (l3 displays the payout in real time, banks it on exit); hardcore variant adds a no-keep reset of l1–l3 on enter plus per-second decay (l5 farms 5/6).

**Checker:** `D-FARMCHAL` — countcalc/goal must be generated as an inverse pair; onExit must `.max()` (no regression).

---

### P19 — Segmented-HP Boss Layer  `[advanced, high impact]`

**What:** the layer's core loop is fighting one boss with a segmented HP bar: damage = layer currency × multiplier × points^exponent (all through overflow softcaps), HP split into a fixed number of segments, milestones keyed to "segments destroyed"; a fully-depleted boss revives and levels up, with damage divided by a huge base per level — forcing a numbers rebuild.

**When:** one showcase layer at row 2–3; only one per game (One Dev One Layer has exactly l4). Ideal when you want softcap teaching made explicit — l4's page explains the overflow rules in red text.

**Why:** bars + clickable + cooldown deliver clicker-style active play; "the boss IS the layer author" (loader3229, level cap 3229) is the meta-narrative landing spot (P29); segment-count milestones (2 → 144444) form a natural long-tail goal chain.

```js
// One Dev One Layer l4 — HP = 2^1024 in 1024 segments; player.l4.y = segments left (float)
clickables: { 11: { canClick() { return player.l4.cooldown.lte(0) },   // 5s CD (1s after upgrades)
    onClick() {
        let singleDmg = layers.l4.effect().mul(layers.l4.dmgMult()).mul(player.points.pow(0.01).overflow(1e200, base))
        if (player.l4.level.gte(2))                     // revive penalty: ÷MAX_VALUE^level
            singleDmg = singleDmg.overflow(Number.MAX_VALUE, base).div(Decimal.pow(Number.MAX_VALUE, player.l4.level.sub(1)))
        player.l4.dmg = player.l4.dmg.add(singleDmg)
    } } },
// revive: y<=0 && level<3229 -> level+1, dmg=0, y refills (in update)
total_bars() { return Decimal.sub(1024, player.l4.y).add(player.l4.level.sub(1).mul(1024)).floor() }  // milestone dual-track
// smooth HP animation lives OUTSIDE the main loop: setInterval(10ms) writes player.l4.y,
// then manually tmp.bars.hp.* + constructBarStyle('l4','hp') (see mini-techniques below)
```

**Variants:** 6 weapons + 6 armors each paid in a *different* layer's currency (turns "cross-layer web" into a shopping list, P10); `BuyMax()` inverse-solves the price curve; `dmgAffectRate = 0.99^armorEffect` makes late levels animate the bar faster.

---

### P20 — Mutex Amplifier Rows  `[recommended]`

**What:** mutually-exclusive upgrades within a row — each member's `canAfford` checks that no sibling is bought; later layers re-open the row for 2–3 picks and take over automation.

**When:** row 1–2 secondary layers need a real build-choice dimension; 2–3 members per group, 3–5 groups per layer.

**Why:** injects genuine tradeoffs into a linear upgrade grid (points vs data vs core cost), and "a later layer unlocks multi-pick" doubles as a redemption coupon — no hard reset for picking wrong.

```js
// One Dev One Layer l2 — amplifier I-A / I-B (mutually exclusive until l3 buys its unlock)
41: { canAfford() { return (!hasUpgrade("l2", 42) || hasUpgrade('l3', 42)) && player.l2.points.gte(this.cost) },
      ignoreAutoUpgrade: () => !hasUpgrade('l3', 42) },
42: { canAfford() { return (!hasUpgrade("l2", 41) || hasUpgrade('l3', 42)) && ... } },
// l3 "structural reload I/II/III": same row purchasable 2-3x + automated; l4 milestone 8 frees the 4th row
// paired respec button: player.l2.upgrades = player.l2.upgrades.filter(n => n < 36)  (costs replicators x0.5)
```

**Variants:** respec cost from free to punishing (replicators ×0.5 + point wipe); member effects deliberately "same formula, different constants" for easy balancing.

---

### P21 — Sacrifice Gacha + Global Buff Bus  `[advanced]`

**What:** sacrifice a resource to a narrative entity (the firmament) and draw N effects from tiered pools (angels 13 / archangels 18 / gods 6); effects land in `neffX[]` (on/off) + `ncalcX[]` (value) global arrays that **all seven earlier layers read**; drawing an empty slot burns the sacrifice (effect voided); milestones raise simultaneous-active slots (1→3→5→12) and finally remove burning.

**When:** one or two layers before endgame, when you want run-to-run variance and a "one more sacrifice" gambling loop; requires accepting cross-layer global state.

**Why:** the random buff bus decouples *drawing* from *consuming* — the gacha layer only writes arrays, every layer reads its own slots; burn/no-burn is a natural milestone ladder.

```js
// One Dev One Layer l7 — offer neutronium (clickable 21)
player.l7.nseed1 = chooseFromArray([1,2,...,15], 1)     // engine-added chooseFromArray draw
for (i = 0; i <= player.l7.wg1-1; i++) {                 // wg1 = simultaneous slots
    t = layers.l7.eff1adjust(s[i])                       // s[i] out of pool -> "your neutronium burned up"
    player.l7.neff1[s[i]] = true; player.l7.ncalc1[s[i]] = eff
}
// consumers everywhere: if (player.l7.neff1[2]) mult = mult.mul(player.l7.ncalc1[2])
// anti-per-frame-recalc: calceff1-3 registered in mod.js doNotCallTheseFunctionsEveryTick
```

**Variants:** tiered pools (dust→angels, grain→archangels, ingot→gods; higher pools exponentiate lower pools' effects); 1/10%/50%/100% synthesis-ratio buttons.

**Checker:** `D-GACHADATA` — the arrays must exist in startData (a save-load crash otherwise) and be sized pool-cap + 1.

---

### P22 — Unifier Layer (Numbered Hook Reclamation)  `[recommended for large]`

**What:** the final big layer runs a "unified points" shop that systematically buffs **every named mechanic of the previous N layers**: ~80 boxes numbered by source layer (100x points / 103x data / 106x prestige / 109x dense / 111x attack / 113x ascension / 115x ruins / 116x neutronium), total box levels driving one unified milestone ladder.

**When:** row 4+ of large blueprints. Requires the earlier layers (or the generator itself) to **pre-embed** `buyableEffect('l8', id)` hooks in their effects — protocol first, boxes filled later.

**Why:** solves two problems at once: endgame QoL absorption (every old effect finds a home) and the multi-author collaboration protocol (the numbering table IS the interface doc). Works solo too: emit the numbers while generating rows 0–2, fill the table at row 4.

```js
// protocol side (l1-l7, everywhere): mod.js getPointGen()
gain = gain.pow(buyableEffect('l8', 1002));      // "power of points": exponent-boosts points
// box side (l8 unifier, shared unityBox template)
1002: { ...unityBox, title: 'Power of Points', ed: 'raises points gain to a power',
        effect(x) { return x.mul(0.01).add(1) } },   // x = bought amount
// total level: uBTL() sums boxes 100x-116x -> 16 unified milestones (keep old milestones / unlock automation)
```

**Variants:** three box effect shapes — multiplier (`x.pow_base(k)`), exponent (`x.mul(a)+1`), bound-to-named-upgrade ("boosts 'Recursion'"); first-unification bonus (+2 unified points on the first reset).

**Generator discipline:** emit the hook-ID table during the layer-plan stage (before any layer code), not when writing l8 — see 07 checklist.

---

### P23 — Layer-Knockout Challenge  `[advanced, checker-gated]`

**What:** a challenge periodically *disables* whole layers for a window: the layer vanishes from the tree (`unlocked()` returns false), its update stalls (`chal7doomed[i] > 0` early-return), and its content is `layerDataReset` back to zero; a timer restores it.

**When:** exactly one per game (l8 challenge 31 "Imprisonment": every 5 real seconds, 1–7 random layers disabled for 30s; challenge 33 triggers the same on boss revive). The extreme form of P16's penalty injection.

**Why:** the strongest threat in the game — players watch tree nodes go dark; it also forces every layer to participate in the protocol (each needs the two guard lines), reusing P10's wiring discipline.

```js
// trigger side (l8 update)
if (inChallenge('l8', 31)) {
    player.l8.baC.chal7doomedCD += diff
    if (player.l8.baC.chal7doomedCD >= 5) {
        let s = chooseFromArray([1,2,3,4,5,6,7], Math.min(c, 7))
        for (let i in s) { player.l8.baC.chal7doomed[s[i]-1] = 30; layerDataReset('l' + s[i]) }
    }
}
// victim side (EVERY layer carries both lines)
unlocked() { return !(player.l8.baC.chal7doomed[n] > 0) }
update(diff) { if (player.l8.baC.chal7doomed[n] > 0) return; ... }
```

**Generator guardrail:** only emit this pattern when a single generator produces all layers (it can guarantee every layer carries the checks); hand-written mods can't. Checker: `D-KNOCKOUT` — a knockout state present but some layer missing the `unlocked()` guard is a FAIL.

---

### P24 — Tuning Manifold (Player-Tunable Softcaps)  `[advanced]`

**What:** each of N resources gets a "tuning level" (initial 9–11) that directly rewrites its gain formula (÷10 is neutral, <10 weakens, >10 strengthens); all resources **share one level pool** (90+ points, cap purchasable 90→170) — raising one drains the others.

**When:** endgame, once ≥7 resource types exist. The systematic version of the tree-tab author's promise: "I can remove all your softcaps."

**Why:** balance parameters become a player-owned allocation puzzle (nine sliders, one pool) — a pure-strategy endgame dimension; implementation is just one `tuning[i].div(10)` exponent hook per gain formula.

```js
// One Dev One Layer l8 — tuning manifold (bars t0-t8 + tu/td +/- clickables)
tunMin() { return hasUpgrade('l8',66) ? n(0) : ... }        // unlock 9 -> 0
tunMax() { return hasUpgrade('l8',66) ? n(30) : n(11) }     // unlock 11 -> 30
availTunLevel() { let m = tmp.l8.tunLevelMax; for (let i=0;i<9;i++) m = m.sub(player.l8.tuning[i]); return m }
// consumer (points): if (hasUpgrade('l8', 11)) gain = gain.pow(player.l8.tuning[0].div(10))
```

**Variants:** per-bar color grading (<10 red, 10 gray, >20 green, 30 orange); t8 tunes a *mechanic's* exponent (black-hole surge) — not just resources.

---

### P25 — Erosion (Reverse Reset Pressure)  `[advanced]`

**What:** once a resource crosses a threshold (7 tiers, from data 1.5e10 up to neutronium ee4) "erosion" activates: on a 1–15s cycle it **force-resets that layer's resource to 1** — but the erosion's *accumulated duration is itself the buff* (production exponent ^0.95^time, per tier); the only escape is one special reset (brick) that clears all erosion.

**When:** endgame, to break the "idle = always better" rhythm; pairs with P19's boss pressure.

**Why:** inverts "avoid being reset" into "farm the threat itself" — you want erosion running for the buff and pay a brick reset when you need calm; threat and reward share one source.

```js
// One Dev One Layer l8 update — erosion loop
if (!player.l8.erosion.run[0] && player.l1.points.gte('e1.5e10')) player.l8.erosion.run[0] = true
for (let i = 0; i < 7; i++) if (player.l8.erosion.run[i]) {
    player.l8.erosion.time[i]  = player.l8.erosion.time[i].add(diff.mul(dmSpeed))     // duration = resource
    if (player.l8.erosion.lastCycle[i].gte(layers.l8.erosionInterval(i))) {           // 1-15s cycle
        player['l'+(i+1)].points = n(1); player['l'+(i+1)].total = n(1)               // force clear
    }
}
// buff side (each layer's getResetGain): if (player.l8.erosion.run[0]) gain = gain.log10().pow(layers.l8.erosionEff(0)).pow_base(10)
// escape side (brick reset onClick): clear run/time/lastCycle entirely
```

**Variants:** dark matter accelerates erosion-time growth (dmSpeed = darkMatter^0.75) — the threat couples to yet another resource; an upgrade converts duration directly into a multiplier.

---

### P26 — Branch-Tree Upgrades  `[recommended]`

**What:** a shared template + a `branches: []` dependency array turns upgrades into a tech tree: `canAfford` requires all branches bought, payment uses a dedicated currency; tabs unlock by tree depth.

**When:** any subsystem needing a visible unlock chain (One Dev One Layer l8's 40 brick upgrades across two tabs); adds a dependency graph on top of P7's grid.

**Why:** dependencies become data, not page order — the generator can topologically sort before rendering, and the checker can verify acyclicity directly.

```js
// One Dev One Layer l8 — brickUpgrade template
const brickUpgrade = {
    canAfford() { for (let i in this.branches) if (!hasUpgrade(this.layer, this.branches[i])) return false;
                  return player.l8.brick.valid.gte(this.cost) },
    pay() { player.l8.brick.valid = player.l8.brick.valid.sub(this.cost) },
    currencyDisplayName: 'usable bricks', ...
}
71: { ...brickUpgrade, cost: n(9), branches: [72, 81], title: 'No Trial Needed' },   // needs 72 AND 81 first
```

**Variants:** convergence nodes (multiple branches = AND); price varies with subtree completion; tab unlock by total bricks (tier 1 → tier 2 @5e7).

---

### P27 — Automation Requires Invertibility  `[recommended, engineering discipline]`

**What:** auto-buying a buyable is implemented by **inverse-solving the cost formula** (from current resources, compute the reachable level, `setBuyableAmount` to the max). If the formula isn't invertible (division/piecewise), an upgrade must first *swap it* to an invertible form — and the automation unlock is bound to that same upgrade.

**When:** any "core level" main buyable + automation milestone combo.

**Why:** One Dev One Layer l2's own comment: "the original core price formula cannot be reverse-computed, so this upgrade is required before cores can be automated" — not a coincidence but a discipline: automation = closed-form inversion; non-invertible formulas are fundamentally un-automatable (P54 is the same law seen from the formula side).

```js
// One Dev One Layer l2 core (non-invertible): cost = 2^(x^2)/(x+1), piecewise past 64 -> automation impossible
// l3-64 "core evolution": swap to 1.75^(x^2) (invertible) + unlock auto-buy — one upgrade, both jobs
if (hasUpgrade('l3', 64) && !inChallenge('l5', 21)) {
    let ncl = tmp.l2.corePointScale.max(1).log(1.75).root(2)      // inverse solve
    setBuyableAmount('l2', 11, getBuyableAmount('l2', 11).max(ncl.add(1).floor()))
}
```

**Variants:** handle quadratic softcaps during inversion (`if (ncl.gte(64)) ncl = ncl.div(64).root(scale).mul(64)`); l8's `maxCanBuy()` is the buyable-side form of the same law (all automation funnels through maxCanBuy + setBuyableAmount(max)).

**Checker:** `D-AUTOINVERT` — per-tick `+1` auto-buys get a WARN pointing at closed-form inversion.

---

### P28 — Cooldown Burst Clickables  `[recommended]`

**What:** high-value click buttons with real-time cooldowns (`Date.now()` deltas) that instantly grant X seconds of production; the automation endpoint is an upgrade that auto-clicks in `update()` whenever `canClick()`.

**When:** active-play layers (P19's attack key; l8's black-hole surge 600s / vacuum turbulence 60s).

**Why:** real-time CD (not game-time) is naturally offline-abuse-resistant — though note One Dev One Layer's black-hole subsystem deliberately *ignores devSpeed* to keep testing sane; "instantly gain N seconds" makes the burst quantifiable.

```js
// One Dev One Layer l8 — black-hole surge (unlocked at 250 levels, 600s initial CD)
bhBoom: { canClick() { return (Date.now() - player.l8.lastBhBoom) >= 1000 * tmp.l8.bhBoomCDSecond.toNumber() },
          onClick() { player.l8.bhMass = player.l8.bhMass.add(tmp.l8.bhMassGain.mul(tmp.l8.bhBoomEffect));
                      player.l8.lastBhBoom = Date.now() } }
// automation: if (hasUpgrade('l8', 171) && layers.l8.clickables.bhBoom.canClick()) layers.l8.clickables.bhBoom.onClick()
// CD shrink: past 600 levels, CD divides by (level/10 - 59)
```

**Variants:** `12.3s/600.0s` countdown display; gray-while-CD styling (two-state style); combo type (l4's attack CD 5s→1s cut by upgrades).

---

### P29 — Meta-Author Presence  `[optional, theme]`

**What:** the author written into the game — as the boss (l4's loader3229: HP and level cap are the author's name), as an NPC (tree-tab's 473362: "I can remove all your softcaps… can I delete parts of the game?"), and as easter eggs (`winText = '3'`, changelog claiming "endgame: 0 points", milestone requirement 114514).

**When:** when the theme fits (especially co-authored/community works); single-author games can take just the easter-egg tier.

**Why:** a TMT community tradition — "who made this" becomes playable content; boss naming costs nothing and is maximally memorable.

```js
// One Dev One Layer l4 infobox
body() { return "This layer was made by loader3229. The goal of this layer is to defeat its author: loader3229. ..." }
// tree-tab QoL author page
["display-text", "I'm 473362, I made the tree-tab layer<br>I can remove all your softcaps, hardcaps and decay..."]
```

**Variants:** tribute upgrade names ("Finally Beat It"); number memes (3666/1145/114514/3229); fake endgame (isEndgame never true + a joke winText).

---

#### Mini-techniques from One Dev One Layer (too small for their own pattern)

| Technique | Source | Note |
|---|---|---|
| Three-stage synthesis chain | l7 dust→grain→ingot | each stage ≥1e10 to synth, base tightens 1.25→1.02 per milestone, past 9e15 output switches to log transform — the standard secondary-currency ladder |
| Dual-track milestone done() | l4 | `done()` ORs a currency threshold with a derived metric (total_bars), aligned with `hasMilestone('l8',n)` so cross-layer resets can't lose state |
| Out-of-tick animation | l4 setInterval(10ms), l7 glow breathing | smooth bars must bypass the main loop: write player state, then hand-write `tmp.bars.*` and call `constructBarStyle()` |
| Decimal upgrade IDs | l6 41.1/41.2 | string keys accept fractional IDs for "append a batch to this row"; iteration and style lookup treat them as strings |
| In-challenge random events | l8 challenges 12/31 | Math.random + CD counter inside update(); keep the random table seedable (l8's predictableRandom) |
| Never-completing placeholder milestone | l1 milestone 0 | `done(){return false}` reserves the slot — generators should placeholder, not renumber |
| Per-frame run() of charged effects | l8 update tail | imperative effects (charged.effect) never enter the temp cache — run() each one in update() |

---

### P30 — Per-Region Tickspeed (Multi-Universe)  `[advanced]`

**What:** `layers[].universe: "U1"` assigns each layer to a universe; the game loop multiplies each layer's `diff` by that universe's `player.uni[U].tickspeed`. Several trees share one save and one tick while keeping their own time flow, their own pause, and their own catch-up.

**When:** "second world" content (NG+ realms, parallel worlds, prequel trees) that must not reset the main tree and must tick independently. Celestial runs seven universes this way.

**Why:** the ultimate form of parallel content: one save, one loop, independent pacing. Pausing a universe is just `tickspeed = 0`; resuming replays real elapsed time layer by layer (action layers exempted so burst simulation can't break sub-games).

```js
// celestial-incremental-main/js/game.js — gameLoop
if (layers[layer].universe) layers[layer].update(Decimal.mul(diff, player.uni[layers[layer].universe].tickspeed))
// js/technical/uniSupport.js — on resume, loop the universe's tree with update((Date.now() - pauseTime) / 1000)
// navigation: a map layer of absolutely-positioned clickables renders the universe list as a star chart
```

**Variants:** per-universe currencies that never convert; a multiverse map layer as the hub.

---

### P31 — Manual Pipeline + Named Softcap  `[advanced]`

**What:** `canGenPoints()` is disabled and the main currency's full production chain is handwritten in the hub layer's `update()` (with pre/post multiplier segments displayed separately). The chain's centerpiece is a *named* softcap — Celestial's "SOFTCAP OF DOOM", red text and its own page — whose strength `0.5/(log(gain/start)/weaken+1)` decays as you overshoot, and whose start, weaken and floor are each purchasable.

**When:** late-game economies that have outgrown `getPointGen()`; or anywhere you want the wall to be *content* rather than a hidden constant.

**Why:** turns the softcap from invisible punishment into a visible, attackable mechanic — players buy the three counters and schedule their pushes. P24 is the player-side tuning version of the same idea.

```js
// celestial-incremental-main/js/layers.js — Origin update() (abridged)
player.i.doomSoftcap = player.i.doomSoftcap.div(amt.div(player.i.doomSoftcapStart).add(1).log(player.i.doomSoftcapStart).div(doomWeaken).add(1))
if (player.gain.gt(player.i.doomSoftcapStart))
    player.gain = player.gain.div(player.i.doomSoftcapStart).pow(player.i.doomSoftcap).mul(player.i.doomSoftcapStart)
```

---

### P32 — Cutscene System  `[recommended]`

**What:** story as data — `{ trigger(), portrait, background, music, dialogue: [{text, portrait}] }` arrays with numbered trigger functions (celestial ships 39 scenes), a replay viewer, per-scene BGM and particle effects (rain, embers).

**When:** any game with narrative ambition; the generator can emit the dialogue table straight from the story outline.

**Why:** scenes are pure data — zero new engine surface, and the replay viewer comes free. 5,300 lines of celestial's cutscene engine is all content, not code.

---

### P33 — Feature Shop Hub  `[recommended]`

**What:** the hub layer sells subsystem unlocks as one upgrade chain (Feature I–XI), prices spanning 11 orders of magnitude; each feature then runs its own inner unlock chain.

**When:** large games where "milestones unlock everything" would flatten pacing into a checklist.

**Why:** a shop makes unlocking a *decision* (buy now vs push numbers), and the chain doubles as a table of contents for the whole game.

---

### P34 — Charge Structure (Pylon/Foundry)  `[recommended]`

**What:** spend rare materials to build a structure → it produces energy up to a cap → tier+1 wipes it and starts over; the energy simultaneously feeds global tickspeed, an exponent multiplier zone, and passive effects.

**Why:** the tier loop gives "building" a repeatable promotion ritual instead of one-shot construction, and one energy output justifies three consumption channels.

---

### P35 — Boss Attack Phases  `[advanced]`

**What:** the boss rotates several `attackTimer[]` groups through phase-1/2 attack generators with *counter rules* — one character can't hit airborne, shields must break first, stealth is only breakable by specific units at 15%.

**When:** final-boss layer. Complements P19's numeric boss: here the boss acts on its own and demands a party composition.

**Variants:** celestial's matos runs 4×3 attack timers with targeted rules per attack type (shield/stealth/anti-air).

---

### P36 — Bullet-Hell Arena  `[advanced, high cost]`

**What:** `bulletHell(actions, values)` — duration, bullet action set, sub-arena, goalType and gravity jump all parameterized; **leaving the tab = everyone stunned and eating damage** (focus enforcement); entity state lives in a global object outside the save, only position persists to localStorage.

**Cost warning:** celestial's engine is 3,570 lines. For generated games treat as blueprint-gated or skip entirely.

---

### P37 — Ship Roguelite Wave Arena  `[advanced]`

**What:** canvas wave spawns + typed drops + XP orbs + **choose-1-of-3 upgrade at every wave end** (`pickUpgrade(canRepeat, repetitions, data)`) + salvaged variants.

**Why:** adds the build-growth roguelite loop that P19's numeric boss lacks — the player gets stronger *within* the fight scene, not just between resets.

---

### P38 — Casino Quartet  `[recommended]`

**What:** one luck economy expressed as four random distributions: dice (multi-point products), coin flip (binary duality + symmetric softcap), slots (reel matching 2/3-in-a-row), cards (4 suits × 13 ranks encoded `100*suit + rank`, draw/shred pow ladders).

**When:** need randomness-driven side content; the quartet is a ready-made selection table — pick one or two, don't ship all four.

---

### P39 — Pet Rarity Gacha  `[advanced]`

**What:** four rarity tiers with a price table, crate pulls, **banner rotation** (master timer 21600s, sub-banners 1800–7200s each on their own clock), sacrifice into three shard types, and pet entities that grow via the levelable system (P43).

**Why:** an order of magnitude more complete than P21's sacrifice gacha; the banner timers create return-schedule pressure that pairs with P41.

---

### P40 — Blessing-Curse Duality  `[recommended]`

**What:** one source (refinement) splits into two opposite-sign resources (blessings/curses), each with its own softcap; picking blessings vs enduring curses is a build branch. Celestial's Hex region generalizes the duality across ten layers.

**Why:** one mechanic, two risk profiles — cheap to build, doubles the decision space.

---

### P41 — Check-Back Collection  `[recommended]`

**What:** "things that happened while AFK" as a named layer family: golden cookies (DOM-floating clickable + fly text), timed orbs (claimable on schedule + claim popup), treasure rooms, limited banners. Rewards accumulate offline or refresh on timers so returning always has something to claim.

**Why:** the cheapest retention loop in incremental design — and it composes with every other pattern here (P39 banners, P28 bursts).

---

### P42 — Compound Consumable Reset  `[recommended]`

**What:** a prestige-scale reset that also *consumes* resources: Celestial's rocket launch = singularity-equivalent reset + burned fuel (four resources each contributing one term: base/mult/mult/mult, itemized in the UI) + selective keeps (some pet levels survive).

**Why:** resets stop being free buttons and gain a resource-cost dimension — the launch decision becomes worth optimizing instead of spamming.

---

### P43 — Component Library Protocol  `[recommended, engineering discipline]`

**What:** ~90 custom Vue components with suffix conventions (`-dark/-ex/rounded-/hoverless-/extended-`), `levelable` promoted to a first-class citizen alongside upgrade/buyable/clickable (`buyLevelable`/`clickLevelable`/`levelableEffect`), 7 tree layout variants.

**Why:** TMT's component layer is extensible — large projects should spend UI complexity on components, not on `tabFormat` strings. For generated games: keep a fixed component suffix vocabulary so the checker can audit usage (M-FIELDS).

---

### P44 — Paired Scale Table  `[recommended]`

**What:** a named table of scale starts per layer, consumed by two functions that are exact inverses: `scaleStaticCost()` raises costs through piecewise segments and `softcapStaticGain()` softens gains through the *same* segments in reverse.

**When:** static layers with long lives, where cost runaway and gain softcap must stay synchronized.

**Why:** "cost/gain designed in pairs" enforced structurally — one table, two consumers, so you can't tune one and forget the other. The general law behind P12.

```js
// c0v1d-9119361_The-Modding-Tree.js:1-73 (abridged)
const STATIC_SCALE_STARTS = { r: () => new Decimal(2000), u: () => new Decimal(320), e: () => decimalTen, ... }
function scaleStaticCost(gain, layer) {   // costs UP: pow(2)/start, log-domain pow, per-layer segments
    let start = (STATIC_SCALE_STARTS[layer] ? STATIC_SCALE_STARTS[layer]() : 1);
    if (gain.gte(start)) { if (layer == "r") gain = gain.pow(2).div(start); ... }
    return gain
}
function softcapStaticGain(gain, layer) { // gains DOWN: the same segments inverted
    ... gain = gain.times(start).pow(1/2) ...
}
```

---

### P45 — Laddered Softcap Chain  `[recommended]`

**What:** one effect gets 5+ consecutive softcap stages, each a *different math family* (power-weaken → log-domain pow → double-log pow → exponential wall `x.log10().pow(10^997)`), each with its own threshold constant and weaken exponent — and the display appends "(softcapped)" per stage.

**When:** any effect that would otherwise reach astronomic values (P12's endgame form).

**Why:** single softcaps break — players sail past them; a ladder of escalating math families keeps every stage meaningful, and the one-constant-per-stage style makes balance reviewable.

```js
// c0v1d-9119361_The-Modding-Tree.js v-12 (abridged; thresholds 1e4 -> 1e10 -> 1e50 -> 10^10^1e3)
let v12sf = Decimal.pow(10, 1e4)
if (eff.gte(v12sf))  eff = Decimal.pow(10, Decimal.log10(eff.div(v12sf)).pow(3/4)).mul(v12sf)
if (eff.gte(v12sf2)) eff = Decimal.pow(10, Decimal.log10(eff.div(v12sf2)).pow(0.9)).mul(v12sf2)
if (eff.gte(Decimal.pow(10, Decimal.pow(10, 1e3)))) eff = eff.log10().pow(Decimal.pow(10, 997))
```

**Warning:** copy-paste across stages is how threshold/divisor typos happen — checker `D-SOFTCAPSEG` flags same-line threshold≠divisor pairs (real bug: c0v1d u-12 divides by 1e1500 under a 1e15000 threshold).

---

### P46 — Parallel Mirror Tree  `[advanced]`

**What:** a full second tree of `U`-prefixed layers mirroring the main tree (Uv/Ui/Ur/… ↔ v/i/r/…), toggled by a switcher state (`player.uv.tree = "normal" | "unvaxxed"`), plus a hub side layer carrying the NG+ economy (mutations, boosters, virus counters). Challenges that send you into the second tree grant batches of previously-earned milestones/upgrades back — QoL compression instead of re-grinding.

**When:** post-victory rebirth content (blueprint 3.3); or any "hard mode world" that must not fork the save.

**Why:** one save, two trees; the mirror prefix convention (`U` + id) keeps save migration trivial and the checker's layer-id audit unambiguous.

---

### P47 — Loadout Layer  `[advanced]`

**What:** a build-crafting layer: eight dimensions (d1–d8) + a sacrifice stat + a cooldown table; entering challenges clamps buyable levels to what cooldowns allow (`buyables[71+i] = min(level, cd[i])`), and a `kep[]` list names the 18 auto-toggles that must survive resets.

**When:** when a game needs "gear" without leaving the TMT object model.

**Why:** the keep-list (`kep[]`) is the loadout's save contract — one array tells both the reset logic and the reader exactly what persists.

---

### P48 — Grid Mining Field  `[advanced, high impact]`

**What:** a 10×10 grid layer: movement mode vs mining mode (toggle key), four directional clickables, a "find ore" button that rolls ore count from rarity (`speed*3/rarity` expectation + fractional chance), mixes base tiles per `specialOreBases`, applies area effects (underwater), and mining progress = tool speed × diff integrated against `hardness(ore)`; clearing all ores instantly resets the find cooldown.

**When:** the theme is an *activity* — this is P15's full form (P15's "swing pickaxe" bar is the 1-ore version).

**Why:** the corpus's 9.6-rated game is built on this loop; spatial gameplay gives incremental games a body.

```js
// angrystar6k_The-Mining-Incremental-Table.js — layer "general" (abridged)
let ores_expectation = player.copper.speed.times(3).div(player[target_ore].rarity).min(59).toNumber()
let ores = Math.floor(ores_expectation); ores += Math.random() < ores_expectation - ores ? 1 : 0
// update(): player[ore].progress = progress.add(player.stone.speed.times(diff))
//           if (progress.gte(hardness(ore))) { progress = 0; ore += gainMult; destroying = false }
```

---

### P49 — Map-Gated Combat  `[advanced]`

**What:** a side `map` layer holds a full battle state machine — HP/MP/oxygen, attack cooldown, buffs, revival timer, 10-line battle log, boss drop table feeding layer progress, enemy HP/shield/attack timer, per-stat display toggles — and a world map whose location clickables are **locked while `battle.enemy` is set**.

**Why:** combat + travel on one side layer keeps the main tree clean; the position lock prevents fleeing mid-fight.

```js
// angrystar6k_The-Mining-Incremental-Table.js — layer "map" (state excerpt)
battle: { enemy: undefined, curHP: d(20), curMP: d(20), curOP: d(20), atkCooldown: zero, buffs: [], revival: d(-1),
          battleText: [...], drops: { naga_loot_chest: zero, alpha_yeti_fur: zero, ... },
          enemy_hp: d(-1), enemy_shield: d(-1), enemy_attack_time: d(-1), statusShowing: {...} },
// location switch guard: canClick() { return !isAtLocation(dim) && !player.map.battle.enemy }
```

**Checker:** `D-BATTLELOCK` — clickables that write a `.location` state should guard on an in-progress flag.

---

### P50 — Recipe Crafting System  `[advanced]`

**What:** a `layerType: "craft"` layer with a boolean blueprint table (831 items), pagination, progressive `maxCraftID` unlocks, a hide-blueprints mode for when the grid overflows, and progress-bar crafting with cooldown+speed; a sibling layer reuses the type for singularity smelting with a temperature mechanic.

**When:** collection-driven themes (Minecraft-likes); position it off-tree (row 2001) so it never crowds the tree layout.

**Why:** checklist crafting is the strongest "collection" retention loop in the corpus; the boolean item table is trivially save-migratable.

---

### P51 — Story Chapter Layer  `[recommended]`

**What:** a `stories` side layer that unlocks numbered chapters via a condition array (`storyPending()`), tracks `storyUnlocked`, and reserves per-chapter glitch-text slots for corrupted entries.

**When:** any game with lore; the conditions read like an achievements list but unlock *reading*, not bonuses.

---

### P52 — Negative-Resource Watchdog  `[recommended, engineering discipline]`

**What:** a 60-second `setInterval` health check that alerts and zeroes any resource that went negative, with per-resource alert text naming the value — because big-number NaN cascades are catastrophic and hard to debug from a save alone.

**Why:** self-repair at the save level; cheap insurance every generated game can afford.

```js
// angrystar6k_The-Mining-Incremental-Table.js:44-55 (abridged)
function checkResourceHealth() {
    if (player.invar.points.lt(0)) alert(negativeResourceFixText('殷钢锭', player.invar.points)),
        player.invar.points = zero
    ...
}
const resourceCheckInterval = setInterval(checkResourceHealth, 60000)
```

---

### P53 — Convergent Dual Branch  `[recommended]`

**What:** a layer's base amount is `min(branchA, branchB)` — Incrementreeverse Energy = min(Matter, Antimatter) — so two independent branches converge and the weaker always defines progress.

**Why:** prevents single-branch snowballing; players must alternate, which naturally paces both branches' upgrade grids.

```js
// pg132_The-Modding-Tree.js — layer "e"
baseAmount() { return player.m.points.min(player.am.points) },
```

---

### P54 — Closed-Form BuyMax  `[recommended]`

**What:** for `base^x * c^(x^2)` cost curves, buyMax solves the quadratic inverse in closed form (`target = (√(4c+b²)−b)/2`) and clamps to the cap — no purchase loops; super-exponential costs get a piecewise inverse instead.

**Why:** P27's invertibility law seen from the formula side: if the generator emits the cost curve, it can emit the inverse for free; loops (30 buys/tick) are the slow, fragile alternative.

```js
// pg132_The-Modding-Tree.js — layer "i", buyable 11 (abridged)
buyMax(maximum){
    let base1 = (hasIUpg(22) ? 1 : 2 / 1.01)
    let pttarget = player.i.points.div(10).log(1.01)      // c
    let b = Math.log(base1) / Math.log(1.01) - 1          // b
    let target = pttarget.times(4).plus(b * b).sqrt().minus(b).div(2).floor().plus(1)
    target = target.min(5e5)
    let diff = target.minus(player.i.buyables[11]).max(0)
    if (maximum != undefined) diff = diff.min(maximum)
    player.i.buyables[11] = player.i.buyables[11].plus(diff)
}
```

---

### P55 — Segmented Formula Disclosure  `[recommended]`

**What:** every custom gain is written as `getGainMultPre() → getGainExp() → getGainMultPost()`, a "Details" tab explains each segment in prose, and buyables show cost/effect formulas on Shift — P17's formula-on-Shift promoted to a whole-layer teaching structure.

**Why:** formula-as-content: players learn the economy by reading it, and the generator can emit the prose from the same constants that build the formula — they can't desync.

```js
// pg132_The-Modding-Tree.js — layer "i" exposes its pipeline as three named segments
getResetGain() { let ret = pts.max(10).log10().times(pre).pow(exp).times(pst).minus(1); ... }
getGainMultPre()  { /* things referencing BASE incrementy gain */ }
getGainExp()      { /* Stamina exponent */ }
getGainMultPost() { /* things referencing final incrementy gain */ }
// "Details" tab: "The base Incrementy formula is log10(points)... then raised by Stamina... then multiplied by..."
```

---

### P56 — Reset-Count Global Buff  `[advanced]`

**What:** one milestone applies `10^(x.log10()^(1.01^resetCount))` to *every* layer's `getResetGain` via a single shared helper called at each gain's tail — the act of resetting itself becomes a global growth resource.

**Why:** one line per layer buys a game-wide growth axis; the log-domain exponent means the buff compounds smoothly instead of exploding.

```js
// pg132_The-Modding-Tree.js — shared tail hook, called by every getResetGain
function doMilestoneC1Buff(x){
    let buffexp = Decimal.pow(1.01, player.c.times)   // c-layer reset count
    if (x.lte(10)) return x
    return Decimal.pow(10, x.log10().pow(buffexp))
}
```

---

### P57 — Logistic Production  `[recommended]`

**What:** production runs `getLogisticAmount(points, gain, lossRate, diff)` — gain minus decay toward an equilibrium — with `logisticTimeUntil(cost, points, gain, loss)` rendering "estimated time to afford" on every purchasable; a milestone later swaps it for plain production.

**When:** resources whose *stock* (not flow) matters — chemistry/population themes fit naturally.

**Why:** equilibrium dynamics create a soft endgame pressure that pure accumulation lacks, and the time-estimate turns waiting into a visible curve.

---

### P58 — Challenge Depth System  `[advanced]`

**What:** challenges are re-enterable at increasing *depths* (`getChallengeDepths[n]`), the depths feed global formulas (dilation coefficients scale with depth), and the challenge sequence beyond a base ID (801+) is procedurally generated with nCk-combination penalties.

**Why:** one challenge definition becomes an endgame's worth of content; depth is the time dimension of completion limits.

```js
// pg132_The-Modding-Tree_evolution.js:151-179 (abridged)
let c6Layers = (86 + c2depth) * c6depth ** (1/8)
portion = portion.times(Decimal.pow(.665, Math.sqrt(c5depth)))
portion = portion.times(Decimal.pow(c6Base, c6Layers))
if (challId > 803) portion = portion.div(Decimal.pow(2.2, nCk(challId-802, 2)))
```

---

### P59 — Mutually Exclusive Paths  `[recommended]`

**What:** buying one branch upgrade raises the other's cost steeply and hides it (`unlocked()` gates on NOT having the sibling); exclusion is expressible as data, not prose.

**When:** hydrogen→two-isotope choices, tech-fork themes; anywhere the build should commit.

**Why:** cheap to implement (one condition per side), and the "price of the road not taken" makes the fork feel weighty. P20 is the row-local version; this is the full-path version.

```js
// pg132_The-Modding-Tree_evolution.js — h-15 unlocks Deuterium OR Atomic Hydrogen, not both
cost(){ if (!player.hardMode) return hasUpgrade("h", 31) ? new Decimal(5e5) : decimalOne ... },
unlocked(){ return hasUpgrade("h", 15) && (!hasUpgrade("h", 31) || hasUpgrade("h", 35) || hasUpgrade("h", 25)) },
```

---

### P60 — Difficulty Modes Throughout  `[advanced]`

**What:** `easyMode/hardMode/extremeMode` flags woven into every formula (rewards ×4 / costs ×2 / gains `pow(.75)`) *and* into description text variants — one codebase, three difficulty replays.

**When:** only worth it for long games; the flags must be set at save creation (not runtime toggles) to keep balance coherent.

**Why:** the Tree Of Life ships three games for the price of one; for generators this is a multiplier registry (each mode = a modifier entry, see the type registry).

---

### P61 — Generalized Buyable Factory  `[recommended for large]`

**What:** `getGeneralizedBuyableData(layer, id, unlockFn)` table-drives entire buyable grids — cost/effect/total/extra/buyMax templates plus generalized prestige gain and autobuy handlers — 13 isomorphic layers from one factory (The Prestige Chain).

**Warning:** the corpus's 1.0-rated game is its cleanest-engineered sample — factory elegance ≠ fun. Use the factory to *generate* variety, then inject per-layer twists via the parameters (the fun-quota registry exists for exactly this).

---

### P62 — Chained Challenges + Completion Factor  `[advanced]`

**What:** `countsAs: [11, 12]` makes a high challenge include all lower ones' penalties; repeatable completions scale goals through `getChallengeFactor` — a four-stage escalation ending in `tetrate(1.0011)`.

**Why:** chains give challenge grids narrative ("Beach = Big AND Body at once"), and the staged factor keeps repeat completions meaningful for thousands of runs.

```js
// pg132_The-Modding-Tree_buyables.js (abridged)
22: { challengeDescription: "Beach and square root point gain", countsAs: [11, 12, 21], completionLimit: 20, ... }
function getChallengeFactor(comps){
    let b1 = new Decimal(comps).pow(1.5).plus(1)
    if (b1.gt(1e10))  b1 = b1.tetrate(1.01)
    if (b1.gt(1e200)) b1 = b1.tetrate(1.0001)
    if (b1.gt("1ee3")) b1 = b1.tetrate(1.0002)
    return b1
}
```

---

### P63 — Ghost Nodes & Goal Grid  `[optional]`

**What:** decorative tree nodes via `layerShown(){ return "ghost" }` (a truthy-string trick — the checker's `D-LAYERSHOWNBOOL` wants this as an explicit boolean), and a 5×5 goal board ("00"–"44") paying medals/tokens with five independent autobuy toggles.

**When:** pure flavor; the goal grid doubles as a challenge-hub progress dashboard.

---

## 3. Progress blueprints

Parameterized templates for generation (phase ⑤). `[R]` = required, `[O]` = optional, numbers = measured corpus defaults.

### 3.1 Small game — "5–7 layers, 2–4h" (e.g. Spring Festival 2025, Glyph Tree)

```
rows 0–2 (+1 side achievements layer)
row0: L1 normal exp .5 req 10     → 10–15 upgrades (5×2–5×3 grid), 3–5 milestones, 1–2 buyables
row1: L2 normal exp 1/3 req ~×25  → 10 upgrades, 3–5 milestones, 1 buyable; unlocks on L1 upgrade 15
      L2b normal req ~×40, position offset   [O second row-1 branch]
row2: L3 static base 2 exp 1 req ~×30 of L2 currency → 5 upgrades, canBuyMax upgrade reward
side: achievements 3×5 grid, rewards = flat mults + one automation grant
automation ladder: keep-milestone(L2) → passiveGen(L1, milestone ×~30 past unlock) → autoPrestige(L1) → autoUpgrade(L1) → autoPrestige(L2)
endgame: L3 final upgrade costs ~1e4× its unlock; isEndgame when L3 currency ≥ 25
```

### 3.2 Medium game — "10–16 layers, 10–30h" (e.g. Spring Festival 2026, C0v1d, One Point One Layer)

```
rows 0–3/4 (+side achievements +side story/stats)
row0: L1 normal .5 req 10 (anchor layer, EVERY later layer boosts it: ≥1 gainMult line each)
row1: 2–4 branches, normal/custom exp .3–.33, req ×25–×100 of L1
      each branch: 5×3–5×5 upgrades, 3–5 milestones, 1–3 buyables, optional 2–4 challenges
row2: 2–3 layers, static base 2–3 OR custom; req ×25–×100 of row1 currencies
row3: hub or capstone (custom gain), 5×5 upgrades, milestone-granted keep-lists
side: achievements 5×10 grid (alternate automation path), stats, story dashboard [O]
automation: full ladder per branch, cross-layer grants, package deal (autoPrestige+autoUpgrade+resetsNothing) at row3
milestones: 8–12 per major layer, thresholds ×2 early → ×5–×10 late; challenge unlock at ~5e7× first-layer currency
endgame: capstone layer milestone chain (10+ steps), final goal = side-layer counter or hub milestone 15+
```

### 3.3 Large game — "25+ layers, 50h+" (e.g. Mario Maker 2 Tree, Mining)

```
rows 0–10+ visible (Mario: 20 rows × 1–4 layers; Mining: spaced rows 101/201/…)
structure: theme-driven phases (see P14) — currency types change per phase;
           per-row fan-out 1–4 layers, at least one hub-and-spoke region (Incrementreeverse p-hub)
content:   5×5+ grids per layer, 10×5 mega-layers, 200+ milestones total,
           2–4 challenge sets, buyable families (11,12,13/21,22 per layer)
automation: full ladder ×2 per layer + achievements backfill (P11) + package deals at phase ends +
           row≥N doReset free pass (P9) so late phases don't wipe early phases
softcaps:  layered caps on every long-lived currency (P12), cap-delay upgrades sold 2–3 rows later
           endgame:   dedicated final layer(s) (the_end pattern) + post-victory rebirth layers (C0v1d U* pattern, P46) [O]
QoL:       hotkeys on every resettable layer (Shift+letter for same-row second layer), formula-on-Shift, stats layer
```

---

## 4. Balance heuristics (measured)

| Heuristic | Value | Evidence |
|---|---|---|
| First-layer `requires` | **2–10** (mode 10) | 58/70 row-0 layers |
| First milestone | flat ×2–3 multiplier at ~×500–700 of requires | coin: 6871 vs req 10 (=~×700 of req but ×2.5 effect) |
| Adjacent-row `requires` ratio | **×10–×100** (median ×25) | 54 sane samples |
| Prestige `exponent` by row | 0.5 → 1/3 → 0.25 (−0.1/row) | corpus histogram |
| Upgrade cost ratio (chained) | median **×5**; row-end jumps ×1e3–1e5 | 2674 samples |
| Upgrade grid | **5 columns**; 5×5 standard, 10×5 mega | 61× 5×5 |
| Milestones per layer | median 5, p75 10 | 796 threshold samples |
| Milestone threshold spacing | **×2** median (×1.5 p25, ×5 p75) | 796 samples |
| Static `base` | 2 (soft wall), 5–10 (hard choice); `exponent` 1 | static layers |
| Buyable exponential base | 2–4, start ≈ 10× unit currency | 283 classified |
| Softcap start | ≈ next-layer unlock point; power 0.3–0.5; hard cap via power 0 | P12 sources |
| Automation ladder spacing | ×2 per step, 4–8 steps per game | P4 sources |
| Hotkey coverage | every resettable layer; Shift+letter variant for same-row | 103/132 games |
| Currency retention | each new layer boosts ≥2 older layers | P10 sources |

**When defaults must move:** theme with natural ceilings (scores, distances) → hard-cap via `softcap(...,0)` and stop the ladder there (Gaokao); idle-first audience → prefer log/custom gains (Incrementreeverse) over sqrt resets; short-game scope → small tree + dense milestones beats many thin layers (anti-pattern A4).

---

## 5. Anti-patterns (from the low-rated control group)

| # | Anti-pattern | Real case | Fix |
|---|---|---|---|
| A1 | **Backwards requires ladder** — later rows require *less* than earlier currencies | The Click Tree (3.7): 100000 → 50 → 30 → 20 → 10 → 5 | monotone ×10–×100 ladder (P2); sanity-check `reqByRow` monotonicity at build time |
| A2 | **Skipped row numbers** — rows 0 and 2 exist, 1 missing → broken tree rendering | The Tree of Vote (2.0): rows 0,2 | rows must be contiguous from 0; side = `"side"` |
| A3 | **Single-layer "tree"** — one prestige layer, no chain | The Pro Tree (3.5): 1 main layer, 36 upgrades | ≥3 main layers or call it an upgrade-ectomy, not a tree |
| A4 | **Thin layers** — 8 rows but ~5 upgrades each, no milestones | The Click Tree (37 upgrades / 8 layers); Endless Tree (9 total) | density before breadth: 10+ upgrades + 3–5 milestones per layer |
| A5 | **Flat row-0 games** — everything in row 0, no automation, no second reset verb | The Sleep Tree (3.5): 2 layers, 0 automation | row 1 + automation ladder minimum |
| A6 | **Content ≠ quality** — 13 rows, 323 upgrades, 100 buyables, rated 1.0 | The Prestige Chain (1.0): vertical monotony, zero branches, zero automation grants | branching, automation, and cross-layer wiring (P4/P10) over raw volume; Tree of Life (939 upgrades, 5.0) shows volume alone caps ratings |
| A7 | **Orphaned first layer** — new layers don't touch the opener; points become irrelevant by row 2 | pervasive in <5-rated games | P10 web wiring; test: "does upgrade 11 of layer 1 matter at endgame?" |
| A8 | **Automation as single-point unlock** — one milestone grants everything → rest of game is pure idle | control group (auto=0 games paradoxically *less* tedious than this) | 4–8 step ladder, one chore per step (P4) |
| A9 | **Secret magic numbers in formulas without display** — players can't plan | control group; contrast Mining formula-on-Shift | show formulas (P17), tooltip effects everywhere |
| A10 | **Copy-paste engine calls from other frameworks** — e.g. `resetBuyables()` (doesn't exist) | official demo bug, found in forks | verify every helper against 01/03 (no `.mod()`, `respecBuyables` not `resetBuyables`) |

---

## 6. Dataset caveats for this file's numbers

1. **ExpantaNum mods** (Mining, Zhang Tree, some forks) swap the engine's `Decimal` for `ExpantaNum` via patched builds — their formulas are *design* reference only, **never copy their numeric calls** into a standard TMT game (07 rule: everything is `Decimal`).
2. **Coverage gaps:** games whose layers live in undownloaded `modFiles` show truncated metrics (Celestial Incremental 1 layer, Zhang Tree 1 layer, Antreematter rows unresolved via dynamic assignment). Trust their *patterns*, not their counts.
3. **Translation pairs** were collapsed to the original (1p1l, C0v1d, Gaokao ch); content-duplicate groups (`#dup`) counted once.
4. **Dynamic `requires`/`exponent` functions** report their first static literal or `null`; ratio stats exclude obviously-dynamic rows (form not in `number/decimal/decimal-fn`).
5. `design-metrics.json` field guide: `layers[].components.X.count` (component entries), `milestoneChain` (ordered ids, thresholds, `dep` = prerequisite milestone), `buyables[].form` (cost curve class), `automation[]` (layer prop → granting milestone → threshold), `edges` (branches → tree shape), `reqByRow`/`requiresLadder` (balance ladder).

---

*Generated 2026-10-01 from `crawl/design-metrics.json` (extractor: `crawl/extract_metrics.js`). Manual deep-reads: Mining Incremental Table, Mario Maker 2 Tree, Gaokao Tree, Incrementreeverse, Spring Festival 2026, C0v1d, Zhang Tree, One Point One Layer, + 10 low-rated controls.*
