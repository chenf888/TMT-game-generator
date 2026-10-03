# 10 — Fun Mechanics & Content Organization

> **Audience:** the AI generating a TMT game. This handbook exists because measurable play-quality
> correlates with *mechanic variety and interlocking*, not with upgrade count. It quantifies the
> gap (§1), catalogues the effect-shapes that avoid "everything is ×n" monotony (§2), the UI
> organization that avoids long scrolling (§3), the mechanic catalog of high-rated games (§4),
> per-blueprint fun quotas (§5), and the generation-time checklist (§6).
>
> **Provenance:** `crawl/extract_fun.js` → `crawl/fun-metrics.json` (132 games + phase-⑥ test
> game). Deep-read sources: Gaokao Tree 8.0 (`loader3229_gaokaotree.js`), Mario Maker 2 Tree 8.1
> (`angrystar6k_The-Mario-Maker-2-Tree.js`), Mining Incremental Table 9.6 (ExpantaNum — formulas
> only, never numeric calls), Spring Festival Tree 2026 7.8 (`qqqe308_The-Spring-Festival-Tree-2026.js`).

---

## §1 The fun gap, quantified

Rating-tier aggregates over the dataset (fun-metrics.json `aggregates`):

| Metric (per game, median unless noted) | rated 8+ (n=4) | 6.5–8 (n=11) | <6.5 (n=16) | unrated (n=102) | **phase-⑥ test game** |
|---|---|---|---|---|---|
| Challenges | **18** | 0 | 2 | 0 | 6 (0 repeatable) |
| Clickables | **126** | 7 | 2 | 0 | **0** |
| Bars | **6** | 1 | 0 | 0 | **0** |
| Grids (mean) | **3.75** | 0.27 | 0.38 | 0.15 | **0** |
| Layers with `update()` (rate) | **0.84** | 0.51 | 0.56 | 0.26 | **0.04** |
| Cross-layer wired effects | **28** | 1 | 1 | 0 | **0** |
| `inChallenge()` behavior gates | **45** | 7 | 1 | 0 | 4 |
| `type: "custom"` layer rate | **0.42** | 0.02 | 0.16 | 0.04 | 0.08 |
| tabFormat coverage (all layers) | **0.97** | 0.61 | 0.60 | 0.50 | **0.31** |
| microtabs on heavy layers | **0.50** | 0.33 | 0.14 | 0.10 | **0.00** |
| Achievements | **147** | 0 | 0 | 0 | 50 |

The phase-⑥ test game (The Mycelium Tree) sat at the *unrated* column on every axis while
having "good" paper metrics (25 layers, 395 upgrades). Diagnosis from `fun-metrics.json`:

- **385 upgrades, 340 (88%) have no inline `effect()`** — they are constant multipliers wired
  via `hasUpgrade()` checks inside `gainMult()` etc. The 45 inline effects are all conditional
  self-scalers. Net: the player experiences "buy → some number ×n", 395 times.
- **0 clickables, 0 bars, 0 grids, 0 toggles; 6 challenges, none repeatable; 1 `update()` layer.**
  The only verb the game offers is "prestige".
- **24 heavy layers, 0 use microtabs; 17 layers scroll-overloaded.**

**Design law derived from §1:** a layer is not "content-complete" when it has 10 upgrades and
5 milestones; it is complete when it answers *what does the player DO here that differs from
every other layer*.

---

## §2 Effect variety taxonomy (kills "everything is ×n")

Label every upgrade/milestone/buyable effect with one of these kinds while writing the brief's
fun-density table. **K1 (flat mult) may not exceed ~40% of a layer's upgrades** (skill quota in
`assets/fun-quota.json`). Real code from 8+ games:

- **K1 flat mult** — `mult.times(2.5)`. Fine in moderation; thematically named ("Lakitu throws
  coins: 100x coin gain", Mario Maker 2 `coin` 23) so even flat upgrades feel situated.
- **K2 self-shape** — effect bends its own curve instead of scaling it:
  `player[layer].points.add(1).pow(0.5)` (MM2 coin 12), `player.points.max(0).add(10).log(10)`
  (coin 15), `.max(1).root(2.5)` (easy 21). Standard set: `pow(0.4–0.6)`, `log`, `root(2–3)`,
  `x.log(10).pow(2)`.
- **K3 cross-resource** — effect sources a *different* layer's currency (the P10 web made
  flesh): coin 21 `player.super_mushroom.points.add(3).log(3)`; Gaokao eng 13 sources `chi`
  points; Mining `logEffects` gives each wood species a *different formula shape* (oak `^0.8`,
  spruce `log10^10`, birch `log10^4`).
- **K4 meta-effect** — a **named mechanic** grows stronger (`ret = ret.pow(1.1)`,
  `exp += 1`, a formula rewrite on a specific labelled thing).
  Gaokao sm 11 "power first 3 Chinese upgrades by ^1.1" → `if(hasUpgrade("chi",11)) ret=ret.pow(1.1)`;
  MM2 easy 25 "Fire Flower effect ^1000".
  > **Narrowed 2026-10-03 per handbook 12** (the TMT author, 2021-02-24): *"Try to avoid
  > having effects that boost an upgrade's effect. Only boost resources or named mechanics."*
  > So K4 must target a **resource or a named mechanic the player can see** — never an
  > anonymous upgrade's hidden number. Boosting `points` or a labelled mechanic is fine;
  > "upgrade 47 is now stronger" is not, because the player cannot see or reason about it.
- **K5 softcap/hardcap manipulation** — delays a cap, raises a hardcap, or *replaces a formula*:
  coin milestone 0 "delay 2nd Coin upgrade's softcap by ^25" (`overpowered()` milestone variant,
  §4-M6); easy 24 "delay hardcap to 1000"; easy 14 "tier 7 reward now has a better formula";
  easy 42 "reduce Toad pent cost by 0.475x" (cost reducers are K5).
- **K6 conditional/scaled** — `if`-chains on progress, other components, or challenge state:
  MM2 coin 12 branches on `player.toad.tier.gte(238)`; Gaokao subject `points()` chain
  `if(hasUpgrade("u",12)) ret=ret.mul(1.1).add(1)`.
- **K7 unlock/gate** — no numeric effect; unlocks a layer, subtab, buyable row, challenge
  ("Unlock a new subtab" easy 15/31; coin 32 "Unlock the 2nd coin buyable"). Always count
  these as *content*, and exclude them from the K1 quota.
- **K8 production/conversion** — the effect produces a *new* currency per second instead of
  multiplying one: coin 31 "generate 1 pink key coin every second" (`update()` + multiplier
  chain on that currency).

**Brief-time rule:** in the layer-chain table, add an "effect kinds" column and plan ≥3 distinct
non-K1 kinds per layer (K2/K3/K4/K5 rotate well: a layer gets one shape, one cross-source, one
meta or cap-play).

**Milestone rewards follow the same taxonomy** — a milestone ladder of ten "×2 gain" steps is
the A-level anti-pattern. Mix: automation grants (P4), unlocks (K7), cap-delays (K5), new
production (K8), power-rewards (K4).

---

## §3 Content organization (kills long scrolling)

### 3.1 The standard layer skeleton (Mario Maker 2 `coin` layer)

```js
tabFormat: [
    "main-display",
    "prestige-button",
    ["display-text", () => `You have ${format(player.points)} Cleared Courses`],
    ["display-text", function() { if (player.coin.points.gte('ee10')) return `Softcap starts at ${f(tmp.coin.softcap)} Coins` }],
    ["microtabs", "stuff"],
    ["blank", "65px"],
],
microtabs: {
    stuff: {
        "Upgrades":   { unlocked() { return true },
                        content: [["blank","15px"], ["raw-html", () => `<div style="opacity:.5">flavor line</div>`], "blank", ["upgrades", [1,2,3,4,5,6,7,8,9]]] },
        "Pink Key Coins": { unlocked() { return hasUpgrade("fire_flower", 13) },
                        content: [["display-text", ...big colored secondary-currency readout...], "buyables"],
                        buttonStyle() { return {'background':'linear-gradient(90deg,#ff746f,#c93e27)','border-color':'#ff746f','color':'black'} } },
        "Milestones": { unlocked() { return true }, content: [["blank","15px"], "milestones"] },
    },
},
```

Rules of thumb (all from 8+ games):

1. **Every main layer gets a `tabFormat`**, even small ones — minimum recipe
   `["main-display", "prestige-button", "upgrades"]` puts the action above the fold.
2. **Introduce `["microtabs", "stuff"]` once a layer has ≥3 distinct content groups** (e.g.
   upgrades + secondary-currency shop + milestones; upgrades + challenges + story). Each tab
   gets `unlocked()` gating (content reveals as tabs — progression you can see) and optionally
   a themed `buttonStyle()`.
3. **Context display-texts above the tabs**: current base resource, best value, and a *live
   softcap warning* (`if (points.gte(softcapStart*0.5)) "Softcap starts at X"`). Show the
   formula breakdown when the conversion is nontrivial — 春节树 `points()` returns
   `[explanationHTML, gain, shortText, expText]` and displays all four.
4. **Secondary currencies get their own tab**, with a big colored readout
   (`<h2 style='color:#ff746f'>`) and the buyables that spend them.
5. **Named-key tabFormat** (春节树) is equivalent sugar: `tabFormat: { "挑战": {content:[...]}, "剧情": {content:[...]} }` — use it when tab names are user-facing.
6. **Dense grids via `componentStyles`**: MM2 sizes upgrades to 150×150 px and pulls buyable
   margins in — 25 upgrades fit in ~2 screens, not 10.
7. **Story/lore lives in its own microtab or infoboxes** with unlock-gated paragraphs
   (`hm('d',23) ? story : "剧情暂未解锁"`), never interleaved with buy buttons.

---

## §4 Mechanic catalog (what the 8+ games actually DO)

M1–M10 below are the verbs beyond "prestige". Each entry: what it is, minimal wiring, source.

### M1 — Classic challenges with rule-injection (P16, upgraded)
Challenges disable/modify specific systems via `inChallenge()` gates scattered through the
*older* layers' formulas, plus `challengeEffect()` rewards scaling with `challengeCompletions`.
MM2 runs 18 of them gated behind milestones ("Reach 50,000,000 coins → unlock a super mushroom
challenge"). Wiring: goal via `canComplete()`; nerf e.g. `gainMult(): ... if (!inChallenge('x',11)) mult = mult.times(yoshiEff)` (coin 2099); reward checked with `hasChallenge()`.

### M2 — Score-attack challenge hub (春节树 `e` layer)
Challenges don't just complete — you **accumulate a score inside** the challenge and the best
score per challenge is the real reward currency:
```js
startData() { return { points: n(0), maxpoints: [n(0),n(0),n(0),n(0),n(0),n(0),n(0),n(0),n(0)], inChal: false } },
update(diff) { ... if (inChallenge('e', ids[i])) player.e.maxpoints[i] = player.e.maxpoints[i].max(player.e.points) ... }
// reward formula reads maxpoints[i]; challengeEffect(i) = f(maxpoints[i])
```
Nine challenges = three tiers × three nerf-themes (disable upgrades / freeze automation /
nerf one exponent to 0). This is the best "challenge layer" blueprint for medium+ games.

### M3 — Risk-reward minigame (MM2 `easy` "No Damage" run)
Player pays a resource to start a run: random theme+style are rolled
(`easyEndlessRandom()`), the player must click the *correct* goal tile among clickable groups;
correct pick → `no_dmg` clears grow (multiplier reward with `Decimal.factorial` scaling),
wrong pick → streak resets. State lives in `startData` (`no_dmg_running`, `random_theme`),
tiles are display-only clickables that light up via `style() { if (running && random_theme.eq(1)) return {'background-color':'#58cd2a'} }`.
Use **one** such game (Q4 "active" gate) — it's the highest engagement-per-line mechanic in the dataset.

### M4 — Active production: bar + clickable + update() (Mining Incremental core loop)
```js
bars: { woodDestroying: { direction: RIGHT, width: 360, height: 60,
    display() { return `进度: ${format(player.wood.progress)}/${format(hardness('wood'))}` },
    progress() { return player.wood.progress.div(hardness('wood')) } } },
update(diff) {
    if (player.wood.destroying) player.wood.progress = player.wood.progress.add(player.wood.speed.times(diff))
    if (player.wood.progress.gte(hardness('wood'))) {
        player.wood.progress = zero; player.wood.destroying = false
        player.wood.points = player.wood.points.add(tmp.wood.gainMult)
        if (isAtLocation('overworld')) { /* per-biome drops */ }
    }
}
```
The clickable toggles `destroying`. Instant feedback loop, visible progress, location-dependent
drops. The same skeleton serves "charging", "crafting", "exploring".

### M5 — Secondary currency inside a layer (MM2 `pink_key_coin`)
`startData` adds `pink_key_coin: new Decimal(0)`; `update()` produces it (with its own
multiplier chain); dedicated buyables spend it (`canAfford`/`buy` subtract it); its effect is
`Decimal.pow(amount, 1.5).add(1)`. Keeps a layer interesting for 3× longer without adding a
tree node. automate() can auto-buy its buyables by inverting the cost curve:
`setBuyableAmount("coin",11, player.coin.pink_key_coin.max(2).log(2).sub(1).root(1.5).floor().add(1))`.

### M6 — Milestone `overpowered()` variants (MM2 coin)
```js
0: { requirementDescription: "Reach 6871 cleared courses",
     effectDescription() { let d = "Multiply coins gain by 2.5x."; if (milestoneOverpowered('coin',0)) d += "<br>Overpowered effect: Delay 2nd Coin upgrade's softcap by ^25."; return d },
     overpowered() { return hasUpgrade('power_balloon', 45) }, done() { return player.points.gte(6871) } }
```
A later upgrade "empowers" an old milestone with a K4/K5 bonus — retroactive value for old
content, cheap to implement.

### M7 — Custom-type "ritual" layer (Gaokao `gk`)
`type: "custom"` with `getResetGain()`/`getNextAt()`/`canReset()`/`prestigeButtonText()` and a
bespoke `onPrestige(gain)` that manually resets the subject layers (points+upgrades+buyables).
The prestige is *themed* ("Ready for exam! You will get 690 points"), the conversion formula is
the theme (`exam score = log10(ability)`), and the endgame is a themed number (750 = perfect
score). Pair with subject layers that passively "study" via `update(diff)` gated by milestones.

### M8 — Shop layer selling meta-effects (Gaokao `sm`)
A row-1 normal layer whose currency derives from progress (`getResetGain` with double softcap;
`passiveGeneration()` scaling quadratically with score). Its upgrades are almost all K4/K5:
power-up other layers' effects ^1.01–^1.2, triple autostudy speed, exam-score boosts. A shop
turns late-game currency into *variety*, not just bigger numbers.

### M9 — Rebirth disguised as an upgrade (Gaokao `un` 11)
`upgrades: { 11: { description: "Reset degrees (resets credits and abilities)", cost: n(0), pay() { /* manually reset everything */ } } }`.
A zero-cost upgrade whose `pay()` performs a controlled full reset — the cleanest TMT way to
implement NG+/rebirth loops without touching the engine.

### M10 — Collection & achievements as gameplay (Gaokao `a`, MM2 achievements)
Achievements whose `done()` checks *collection state* (`player.sm.upgrades.length >= 12`,
"buy 22 different textbooks"), thematic jokes as names, and (MM2) achievements that backfill
upgrades/milestones across the tree (P11 guarded pushes). Degree/collection ladders
(bachelor → master per subject) double as K7 unlock content.

**Supporting cast:** hotkeys per prestige layer; `createToggle` QoL switches (MM2);
`respecBuyables()`; `deactivated()`/`shouldNotify()`; grids (Mining uses 14 of them for
tile-based mechanics — powerful but highest effort; optional for generated games).

---

## §5 Fun quotas by blueprint (machine-readable: `TMT-Skill/assets/fun-quota.json`)

| Quota (per game unless noted) | small (5–7 layers) | medium (10–16) | large (25+) |
|---|---|---|---|
| Distinct mechanics from M1–M10 | ≥2 | ≥4 | ≥6 |
| Challenge layer(s) | optional | ≥1 (M1) or M2 hub | ≥1 (M2 preferred, ≥6 challenges) |
| Clickables (M3/M4) | 0+ | ≥1 group | ≥2 groups |
| Bars | 0+ | ≥1 | ≥2 |
| Layers with `update()` | ≥1 | ≥3 | ≥6 |
| Secondary currency (M5) | 0+ | ≥1 | ≥2 |
| Shop/meta layer (M8) | — | ≥1 | ≥1 |
| Custom-type ritual layer (M7) | 0+ | 0+ | ≥1 |
| Rebirth/NG+ (M9) | — | — | 0+ |
| K1 share per layer (≤) | 60% | 40% | 40% |
| Microtabs required at (content items) | 14 | 12 | 12 |
| Collection/achievements themed | yes | yes | yes |

Quotas are floors, not targets: pick mechanics that fit the theme (P14). A quiet puzzle game
with M2 + M7 + M8 can out-rate a busy one with all ten.

---

## §6 Generation-time checklist (extends 07 Part D)

- [ ] Every main layer: effect-kinds column planned, K1 ≤ quota, ≥3 non-K1 kinds present.
- [ ] Every main layer has `tabFormat`; microtabs once ≥3 content groups; context display-texts
      (base amount, best, softcap warning) above the tabs.
- [ ] Game meets its §5 quota row (count mechanics, not layers).
- [ ] Every challenge: nerf wired via `inChallenge()` gate in an *older* layer; reward via
      `hasChallenge()`/`challengeEffect()`; goal via `canComplete()`.
- [ ] Any clickable state (`_running`, random picks) initialized in `startData()` as Decimal/boolean.
- [ ] Bars: `progress()` divides by the same cap the `update()` compares against.
- [ ] Meta-effect upgrades (K4) actually appear in the target's formula (`ret.pow(1.1)`) — and target a
      resource or named mechanic, never another upgrade's hidden number (handbook 12 §3-15).
- [ ] Story (if any) in its own microtab/infoboxes, unlock-gated.

---

## §7 Dataset notes

- `crawl/extract_fun.js` classifies inline `effect()` bodies; upgrades with no inline effect are
  "wired elsewhere" — in practice constant mults via `hasUpgrade()` in `gainMult()` (the
  Mycelium pattern). `effectDiversity` = share of inline effects that are not K1.
- ExpantaNum mods (Mining Incremental 9.6, Zhang Tree) contribute *mechanic and formula-shape*
  patterns only; their numeric calls must never be copied into standard Decimal games (09 §6).
- MM2 `easy`-layer minigame and 春节树 score-attack hub are the two patterns with no equivalent
  in 09; they motivated this handbook.
