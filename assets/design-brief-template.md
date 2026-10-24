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

Every Answer cell is the user's own answer — or a proposal the user explicitly confirmed.
No cell is filled by inference.

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

Proposed by `node scripts/classify.js`, **confirmed by the user** — the script's auto route
is a proposal, never an answer. **Orthogonal to Q2**: this row never changes the
blueprint. Full contracts in `references/design/13`, machine-readable in
`assets/type-registry.json`.

| Field | Value |
|---|---|
| Type (`type-registry.json` id) | passive-prestige / active-click / active-tick / board-minigame |
| User confirmation (verbatim) | |
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
| | none | P12 softcap start ≈ next-layer unlock, power 0.3–0.5 corpus — but the measured retune favors power 0.1 with start 1e9–1e12 and cap raises of ×10 priced 1e12–1e18 (`balance-defaults.json softcap.measuredRetune`) | layer softcap / effect() softcap() |
| | yes (e.g. exam score 150) | hard cap `softcap(x, cap, 0)` | custom points()/getResetGain() |

## 9. Self-check results (SKILL.md Stage 2, all 21 — numbering matches SKILL.md's table)

Tick each after verifying the tables above. Any FAIL → revise the tables, not the code.

- [ ] 1 — requires ladder monotonic; adjacent rows ×10–×100 (P2/A1)
- [ ] 2 — first layer requires 2–10 (P1)
- [ ] 3 — every main layer ≥10 upgrades + ≥3 milestones (A4)
- [ ] 4 — every new layer boosts ≥2 older layers in gainMult; ≥1 upgrade boosts layer 1 (P10/A7)
- [ ] 5 — automation ladder 4–8 steps, P4 order, one chore per step (P4/A8)
- [ ] 6 — softcap plan for every unbounded loop; hard caps for theme ceilings (P12)
- [ ] 7 — anti-pattern sweep A1–A10: none present (deliberate exceptions listed in §10)
- [ ] 8 — K1 share within quota per layer, ≥3 non-K1 kinds per layer (10 §2)
- [ ] 9 — organization: tabFormat on every main layer, microtabs planned, context display-texts (10 §3)
- [ ] 10 — game-level fun quota met; every M-mechanic has a §4b "where" (10 §5 / fun-quota.json)
- [ ] 11 — **multiplier budget**: ≤1 self-scaling upgrade per layer (pow ≤0.5, softcapped); Σ
      self-exponents in any gainMult ≤ 0.6; end-of-row-0 guaranteed flat zones product ≪ 1e4
      (09 P12; N-SELFTOTAL) — self-scaling terms go into PRODUCTION, never shared with gainMult
- [ ] 12 — **wiring plan**: every upgrade classified token/gate vs value-with-named-consumer (11 §2; N-UNWIRED)
- [ ] 13 — cost ladder ≥6 orders per layer, ≥1 deliberate key drop, ≥30% pow/log shapes (11 §3–§4)
- [ ] 14 — component density 8–30 per layer; challenges ≤15% of upgrades; layer softcap on unbounded loops (11 §1/§5)
- [ ] 15 — **author pacing**: first boost ≤10 s; every reset >1 min pays; a major reset speeds the game from second one; no hard resets (12 §1)
- [ ] 16 — **upgrade discipline**: one production bonus per upgrade; no upgrade boosts another upgrade's hidden number; threshold gates, not pay-gates (12 §3)
- [ ] 17 — **cost before softcap**; only visible caps are sold (12 §2)
- [ ] 18 — **row pacing** written as two constants (ROW_RATIO / OUTPUT_STEP → per-row ×1.1–×1.6), both in the brief (11 §4.1)
- [ ] 19 — **reset lifecycle**: best/total kept; `autoPrestige` implies `resetsNothing`; no `update()` assigns points; every `doReset` guards `layerDataReset` with the vanilla `row > this.row` line; every static layer has `canBuyMax()` (03 §4.1; N-MSDESTROY/AUTOWIPE/POINTSWRITE/STATICMAX)
- [ ] 20 — **type contract** (Q4b): mandatory modules planned, forbidden absent, modifier dependencies hold, dropped modifiers have §10 reasons (13; type-registry)
- [ ] 21 — **measurement plan**: pacing constants in `js/tuning.js` read by game AND simulator; every pacing quantity callable (14 §3.3)

## 9.1 Static-warning acceptance (Stage 5 output)

Every WARN from `node scripts/static_checks.js <game>` gets a row here — accepted with a
reason, or marked fixed with how. A WARN with no row re-opens Stage 5. (One real build
accepted 15 WARNs this way and fixed a 16th in place; the discipline is what makes the
"0 FAIL, N justified WARN" gate meaningful.)

| Check | Layers | Why accepted (or: fixed — how) |
|---|---|---|
| | | |

## 10. Deviations & open questions

| Default overridden | Value used | Why |
|---|---|---|
| | | |

## 11. Stage-6 measured retune (authoritative — only if the measurement contradicted the brief)

Record what the first simulation showed, the root cause, and each fix with where the constant
now lives. This section supersedes the §7 estimate; a first pass that measured clean needs only
one line here quoting the number. Write the WRONG first numbers down — they are why Stage 6
exists, and the next build inherits the pattern.

| # | Finding (measured) | Root cause | Fix, and where the constant lives |
|---|---|---|---|
| | | | |

Measured timeline (greedy, `--click 1 --dt 1`): first purchase ___ s; first prestige per layer
___; total to `isEndgame()` ___ h. Sim exclusions = the bias (handbook 14 §3.2, achievement
count is a pacing lever inside it): ___.

## 12. Browser-verification fixes (Stage 6.5)

Each entry was invisible to static checks, smoke and the simulator; it was found by playing the
build (SKILL.md Stage 6.5 / handbook 14 §5). Numbered, symptom → root cause → fix.

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| | | | |

Final gates: static ___ PASS / ___ WARN / 0 FAIL (every WARN has a §9.1 row); i18n ___;
smoke ___; measured lower bound ___ h.
