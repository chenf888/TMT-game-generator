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

Each pattern: **What / When to use / Why it works / real code / variants**. Source files are named by their dataset filename in the source corpus (not shipped with this skill).

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
4. **autoUpgrade** (auto-buy upgrades — most expensive, usually last).

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

**Variants:** `automate()` custom loops for buyables (cape_feather sets buyable amounts from a currency each tick — see P15); milestone-granted `buyMax` in `update()` (Incrementreeverse `i`: every 1s, `layers.i.buyables[11].buyMax(times * mult)` when `hasMilestone("a", 2)`).

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
endgame:   dedicated final layer(s) (the_end pattern) + post-victory rebirth layers (C0v1d U* pattern) [O]
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
