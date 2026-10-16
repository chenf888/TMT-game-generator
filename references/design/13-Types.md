# 13 — Game Types: choosing the interaction model

Read this at **Stage 1, after Q1 and Q4** and again at Stage 2 when filling the brief.

---

## §0 What the type axis is — and what it is not

There are **two independent axes** in this skill. Do not merge them.

| Axis | Question | Source | Where it lands |
|---|---|---|---|
| **Scale** | how big is the game? | interview **Q2** | `assets/blueprints.json` → `blueprints.small\|medium\|large` |
| **Type** | how does the player *act*? | interview **Q1.5** | `assets/type-registry.json` → `types.*` |

Q2 stays exactly as it was: a 1:1 map onto one blueprint, and `selectionRules` still says
*"do not mix blueprints or improvise parameters"*. The type axis is orthogonal and adds no
constraint on scale. A `small` game may be `active-click`; a `large` one may be
`passive-prestige`.

**Why interaction model and nothing else.** Measured over the 329-file corpus: only **17
files (5.2%)** contain any `update()` tick logic, **94 (28.6%)** have clickables, **57
(17.3%)** have bars, and **53.5%** are pure-formula layers with no interactive UI at all.
Whether the player acts decides which components get generated, which generation steps run,
and which acceptance rules apply — it is the axis with the widest effect on the output.

**What is deliberately NOT a type.** Theme (space / wuxia / pixel-art) changes names,
colours and lore only; it never changes the generation pipeline, so it is not a type.
Layer `type: "custom"` is a **layer shape**, not a game type — 123 custom layers are spread
across 28 files, orthogonal to every type here; it ships as the `sim` modifier instead.
Scale is not a type either; that is the blueprint axis.

---

## §1 The four types

Full contracts, failure modes and evidence live in `assets/type-registry.json`. This section
is the judgment aid.

### passive-prestige — 被动声望链 (corpus 53.5%)

**Signature:** the core verb is *accumulate / unlock / reset*. No player action.
**Representative real game:** `p-u_The-Point-Tree__basic.js:1` — a bare generator layer,
`startData` + `doReset` + a gain formula, nothing else. 96 files in the corpus are exactly
this shape; they are the building block, not the exception.

- **Layers:** `normal` and `static` only
- **Forbidden:** `clickables`, `grid`, `update()`
- **Acceptance:** exempt from `D-NOUPDATE` — having no tick is the *correct* shape here
- **Cheapest and safest fallback** when nothing can be recognised

> **The absence signal.** Passive wins when *no action-bearing verb appears anywhere*. That
> is deliberate: "idle mining" contains 挖 (an action verb) but must resolve to passive,
> because Q4 answered *idle* and idle mines itself. The registry applies a −0.15 penalty to
> interaction types when Q4 is idle for exactly this reason.

### active-click — 点击驱动 (corpus 11.2%)

**Signature:** the core verb is a *discrete action* — one tap, one chop, one press.
**Evidence:** `ArmeKnockedOut_the-element-tree.js:248` (`clickables:` → `:250 canClick()` →
`:254 onClick()`); `chenf888_The-click-Tree.js:277,283,284`.

- **Contract:** every clickable defines `canClick()` and `onClick()`; its state is
  initialised in `startData`; state is a number or string, never a Decimal (hard rule 11)
- **New rule:** `T-CLICKABLE` — today the checker only *counts* clickables and never
  verifies one works

> **Garnish vs verb.** Clickables that are one-off "get N" buttons on a formula game are not
> a type. Test: `clickables < mainLayers × 0.2`, or every clickable is a single-use button
> rather than a repeated verb → stay `passive-prestige`
> (`ArmeKnockedOut_the-element-tree.js:250` is exactly this case).

### active-tick — tick 生产循环 (corpus 10.0%)

**Signature:** the core verb is a *continuous quantity* the player pushes — growing,
charging, producing. Something fills over time.
**Evidence:** `ArmeKnockedOut_the-element-tree.js:290-291` (a bar whose `progress()` is
`grownapples_time / reqtime`); `BilboyX_The-Modding-Tree.js:1187`.

- **Contract:** `update()` uses `addPoints()` and never assigns `player[layer].points`;
  every custom action-function is listed in `doNotCallTheseFunctionsEveryTick`;
  `bar.progress()` never divides by zero
- **New rule:** `T-TICKREG` — `M-DNC` today (`SC:460`) only checks the declaration *exists*,
  never that it lists the hooks the game actually defines

> **HUD bar vs gameplay bar.** 57 corpus files have bars but only **12.3%** define
> `progress()` — the rest are decorative HUD. If no bar in the game defines `progress()`,
> the tick is not the core loop → stay `passive-prestige`.

### board-minigame — 网格板玩法 (corpus 6.7%)

**Signature:** the gameplay needs a **2D board** to exist at all.
**Evidence:** `chipsams_The-Modding-Tree__crafting_layer.js:378` (`grid: { rows: 10, cols: 7 }`);
`CudjzikxmxR_The-Rainbow-Void-Tree.js:2857` (dynamic `rows()`).

- **Contract:** declare `grid: {` — **singular**; `grids:` is a ghost field; ids are
  base-100 (hard rule 10); `getStartData` is mandatory (22/22 corpus files have it)
- **New rule:** `T-GRID` — the single biggest checker gap. 22 real files use `grid` and the
  checker covers none of it.

> **Not the same as a grid layout.** Arranging *upgrades* in a 5×5 block is the `grid` layer
> layout from handbook 10 §3 — it is not a grid component and does not make a board game.
> Ask the disambiguating question before routing here.

---

## §2 Modifiers — orthogonal extras with hard dependencies

A modifier is added on top of one interaction type. **Max one interaction type per game**
(§3). Full list in the registry.

| Modifier | Requires | Why |
|---|---|---|
| `sim` | — | `type:"custom"` + hand-written `update()`. Budget **3 layers max** |
| `score-attack` (M2) | type `active-tick`/`active-click` **and** modifier `sim` | The engine has **no** `scoreAttack`/`maxScore`/`leaderboard` API (0 corpus hits). M2 is a hand-rolled idiom: `startData` holds `maxpoints[]`, `update()` records the peak, `challengeEffect()` reads it. It needs a tick, which is the whole reason for the dependency |
| `minigame` (M3) | type `active-click`/`active-tick` | Built on a clickable group as pickable targets |
| `board` | — | the grid contract |
| `challenges` (M1) | — | Prefer `canComplete()` — it is the corpus majority dialect (45/57), not the `goal:` shape (20/57) |
| `caps` | — | Hard ceilings from Q3 |

**When a hard dependency is missing: downgrade the modifier and record why in brief §10.**
Never drop it silently — a silently missing M2 looks exactly like a game that never needed it.

---

## §3 Routing

```bash
node scripts/classify.js --request "<what the user asked>" --recap "<Q1 recap>" --q4 <idle|active|balanced>
node scripts/classify.js --from-brief <design-brief.md> --json
```

Exit code **0** = routed, **3** = a question must be asked, **1** = error.

**Signals, in weight order** (`routing.weights` in the registry):

1. **explicit (0.75 floor, terminal)** — the user named a type outright. Decides immediately;
   no margin test can overrule it.
2. **verb (0.35)** — an action verb in the Q1 recap or the request.
3. **keyword (0.20)** and **strong keyword (0.60 floor)** — a decisive phrase like
   俄罗斯方块 / "clicker game" clears the auto-route bar on its own.
4. **Q4** — *idle* adds to passive and penalises interaction types; *active* splits evenly
   between click and tick, because **Q4 alone cannot tell them apart — that is the gap this
   whole mechanism exists to close.**
5. **corpus prior (0.15)** — a tiebreaker only. The corpus unit is a *file*, not a game
   (171/329 are `__part.js` fragments), so this weight may never outvote a stated intent.

**Decision:** `auto` when top ≥ 0.60 **and** margin ≥ 0.20; otherwise ask.

| Situation | Action |
|---|---|
| click vs tick close | "离散点击,还是看着进度条走完?" |
| click vs passive | "点击是核心玩法,还是偶尔的加速手段?" |
| tick vs passive | "进度条只是显示状态,还是玩家真正在推的进度?" |
| board anything | "需要二维棋盘,还是只要把升级排成网格?" |
| nothing above 0.45 | "你想要纯挂机体验,还是希望手上有事可做?" |

**At most one interaction type.** The skill already holds this line: at most ONE
`type:"none"` core-loop layer per game (SKILL.md Q4 "Mostly active"), because P15's own note records that
Mining — the game that does this properly — is 2.7MB and 59k lines. Any further difference
is expressed as modifiers.

**Unknown types.** Ask once. If the user cannot name one, fall back to `passive-prestige`
and record *unrecognised, defaulted* in brief §10. Then **add a modifier** to the registry
if the mechanic is new — never a new primary type without a distinct code-generation contract.

---

## §4 Corpus caveats — never stratify on these

- **`minified` in `archive/data/tmt_index.json` is INVERTED.** `true` = 68.6 bytes/line,
  median 691 lines. `false` = 689.8 bytes/line, median 29 lines. Every genuine one-line
  vendor blob (`break_eternity.min.js`, `classes_layer.js`) is flagged **false**. Stratifying
  by this flag inverts every conclusion.
- **`grids` is reported as 0** because the index only looked for `addGrid()`. Grids exist in
  22 files as `grid: {`; `addGrid()` has **0** call sites corpus-wide.
- **Corpus percentages are file percentages**, not game percentages, for the fragment reason
  above. Use them as priors, never as targets.