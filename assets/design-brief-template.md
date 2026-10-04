# Design Brief — `<Game Name>`

> **Fill this entire document BEFORE writing any code** (SKILL.md, Stage 2).
> Sources for every default: `assets/blueprints.json` (structure) and `assets/balance-defaults.json` (numbers).
> Any deviation from a default must name the default it overrides and why, in §10.

## 1. Identity

| Field | Value |
|---|---|
| Game name | |
| Author | |
| Points name (`modInfo.pointsName`) | |
| Language mode (interview Q7) | English only / Chinese only / Bilingual (P17 ternaries) |
| One-line pitch | |

## 2. Interview record (answers → parameters)

| # | Question | Answer | Locked parameter |
|---|---|---|---|
| Q1 | Theme-structure confirmation | | theme = structure mapping (P14) in §3 |
| Q2 | Scale | small / medium / large | blueprint `blueprints.<key>` — all rows/components/automation/endgame params |
| Q3 | Natural ceilings | yes / no / mixed | cap table §8 (hard caps via `softcap(x, cap, 0)` vs P12 softcaps) |
| Q4 | Pacing | idle / active / balanced | gain-curve style (P8b log-custom vs P1 normal) + loop-layer allowance (P15) |
| Q5 | Side content | full / standard / light | challenges? story dashboard? achievements grid size |
| Q6 | Automation & timewalls | | ladder length (4–8 steps), wall budget |
| Q7 | Language & style | | i18n convention (P17), color/naming voice |

Paste the Q1 theme-structure recap the user confirmed:

- **Currencies (in order):** …
- **Layer topology:** …
- **Ceilings:** …

## 2b. Game type profile (Q4b — required)

Locked by `node scripts/classify.js`. **Orthogonal to Q2**: this row never changes the
blueprint. Full contracts in `references/design/13`, machine-readable in
`assets/type-registry.json`.

| Field | Value |
|---|---|
| Type (`type-registry.json` id) | passive-prestige / active-click / active-tick / board-minigame |
| Confidence + margin from classify.js | |
| Components this type makes mandatory | |
| Components this type forbids | |
| Rules exempt for this type | (`passive-prestige` exempts `D-NOUPDATE`) |

Modifiers (max **one interaction type**; everything else is a modifier here):

| Modifier | Requires | Included? | Notes / why dropped |
|---|---|---|---|
| `sim` | — | | max 3 layers |
| `score-attack` (M2) | type `active-*` + `sim` | | dropped if no tick — the engine has no score-attack API |
| `minigame` (M3) | type `active-*` | | dropped if no clickables |
| `board` | — | | |
| `challenges` (M1) | — | | prefer `canComplete()` |
| `caps` | — | | hard ceilings from Q3 |

## 3. Theme = structure mapping (P14 — required)

How does the theme dictate the tree? (Which real-world concepts become layers/rows/hubs? Where do themed caps or phases come from?) For large games: list the phases and each phase's currency type.

## 4. Layer chain table

One row per layer. **Bottom row of the tree first.** Fill every column — this table is the code-generation contract.

| id | name (theme voice) | row | pos | type | base resource → baseAmount | requires | exp/base | upgrades | milestones | challenges | buyables | automation granted (by which milestone, of which layer) | softcap plan | doReset keeps | branches |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| p | | 0 | 0 | normal | points → player.points | 10 | 0.5 | 5x3 | 4 | — | 1 | m0: passiveGen(p) @… | layer softcap @… | — | — |

Rules the table must obey (Stage-2 self-check):
- requires ladder monotonic, adjacent rows ×10–×100 (P2; A1 = backwards)
- first layer requires 2–10 (P1)
- every main layer ≥10 upgrades + ≥3 milestones (A4 thin layers)
- every new layer wires ≥2 older layers in its gainMult (P10; A7 orphaned opener)
- automation ladder 4–8 steps in P4 order, one chore per step (A8)
- every unbounded feedback loop has a softcap plan (P12)

### 4.1 Fun density table (handbook 10 §2/§5 — per layer)

Effect kinds: K1 flat mult / K2 self-shape / K3 cross-resource / K4 meta-effect (^ other effects)
/ K5 cap & formula play / K6 conditional / K7 unlock / K8 production. **K1 ≤ quota
(`assets/fun-quota.json`), ≥3 distinct non-K1 kinds per layer, K7 excluded from the K1 count.**

| id | content items (U+M+C+B+click+bars) | effect-kind plan (which upgrades are K2/K3/K4/K5/K7/K8) | organization (tabFormat sections / microtabs tabs) | mechanics used here (M1–M10) |
|---|---|---|---|---|
| p | | e.g. u12=K2 pow(0.5), u13=K3 from b, u15=K7 unlock, b11=K4 ^1.1 | tab: main/button/ctx; microtabs: Upgrades \| Milestones | M5 secondary currency |

## 4b. Game-level fun plan (handbook 10 §5 quota row)

| Quota (from fun-quota.json `<blueprint>`) | Planned | Where |
|---|---|---|
| Distinct mechanics M1–M10 (≥ N) | | list |
| Challenge layer (M1/M2 style) | | |
| Clickable group(s) (M3 minigame / M4 active production) | | |
| Bar(s) (M4) | | |
| Layers with `update()` (≥ N) | | |
| Secondary currency (M5) | | |
| Shop/meta layer (M8) | | |
| Custom-type ritual layer (M7) | | |
| Story presentation (own microtab/infobox, unlock-gated) | | |

## 5. Tree sketch (ASCII)

```
row2:        [ L3 ]
row1:   [ L2a ]  [ L2b ]
row0:        [ L1 ]
side:  (achievements) (stats) (story?)
```

## 6. Automation ladder

Ordered steps, each granting exactly one chore removal, with granting milestone and threshold (P4 order: resetsNothing → passiveGeneration → autoPrestige → autoUpgrade). Include achievement-backfill grants (P11) — each needs an `!hasUpgrade/!hasMilestone` guard in code.

| Step | Grants (what chore dies) | Granted by (layer.milestone) | Threshold |
|---|---|---|---|

## 7. Endgame definition

- `isEndgame()` condition (concrete Decimal):
- Reachability estimate (SKILL.md Stage 6 method): first-layer production × ladder multipliers → estimated hours to endgame: ___ h (target: ___ h)
- `winText`:

## 8. Cap table (per currency)

| Currency | Ceiling? | Cap mechanism | Where |
|---|---|---|---|
| | none | P12 softcap start ≈ next-layer unlock, power 0.3–0.5 | layer softcap / effect() softcap() |
| | yes (e.g. exam score 150) | hard cap `softcap(x, cap, 0)` | custom points()/getResetGain() |

## 9. Self-check results (09 §4 + §5 anti-pattern sweep)

Tick each after verifying the table above. Any FAIL → revise the table, not the code.

- [ ] Requires ladder monotonic ×10–×100 per adjacent row (P2/A1)
- [ ] First layer requires 2–10 (P1)
- [ ] Density: every main layer ≥10 upgrades + ≥3 milestones (A4)
- [ ] Every new layer boosts ≥2 older layers; layer-1 upgrade 11 matters at endgame (P10/A7)
- [ ] Automation ladder 4–8 steps, P4 order, no double grants of the same flag by two milestones (A8 + Mario-Maker collision incident)
- [ ] Softcap plan present for every unbounded loop; hard caps for theme ceilings (P12)
- [ ] A1–A10 sweep: none present (list any deliberate exceptions in §10)
- [ ] Endgame reachable in the target playtime (rough estimate done)
- [ ] Fun density: K1 share within quota per layer, ≥3 non-K1 kinds per layer (10 §2)
- [ ] Organization: tabFormat on every main layer, microtabs at quota threshold, context display-texts (10 §3)
- [ ] Game-level fun quota met (10 §5 / fun-quota.json); every M-mechanic has a §4b "where"
- [ ] **Type contract honoured (Q4b / 13-Types):** every component the locked type makes
      mandatory is planned, every forbidden one is absent, and each modifier's hard
      dependency holds (M2 needs a tick, M3 needs clickables)
- [ ] Every modifier dropped in §2b has a reason recorded in §10 — none was dropped silently

## 10. Deviations & open questions

| Default overridden | Value used | Why |
|---|---|---|
| | | |
