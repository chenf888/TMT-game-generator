# 14 — Measurement and the Harness: Stage 6 is a measurement, not an estimate

Read this at **Stage 2** (to plan for it), and again at **Stage 5.5 and Stage 6** (to run it).

---

## §0 The finding that produced this chapter

Three generated games were checked against their own design briefs:

| Build | Brief's paper estimate | What actually happened |
|---|---|---|
| A medium game | 8–18 h reachability, "per-row pacing ×1.4, all within band" | the author finished it in **2.5 h** |
| The same build, v0.2 | rebalanced on paper after the first playtest | when a simulator was finally built it drove the economy to 1e73 and the run ended in **0.77 h simulated** (the human run had been ×4 that) |
| A large single-layer game | "×2–5 per upgrade is fine" | simulated end at **28 s**; the whole multiplier architecture had to be replaced |

None of these were caught by the 68-rule static checker, and none of them *could* be: the
checker reads source, and these are properties of **the economy's trajectory over time**.
The static rules answer "is it written correctly?"; nothing answered "does it play?"

Two conclusions, both now binding:

1. **A paper reachability estimate is a lower bound on your confidence, not on the time.**
   `assets/balance-defaults.json` and handbook 11 §4.1 give median corpus values; multiplying
   them out produces an estimate that has been wrong by ×4 and by ×2000 on real builds.
2. **A design brief that cannot be simulated is a design brief that cannot be verified.**
   If the pacing depends on a quantity the game doesn't expose as a callable function, the
   generator has already lost the ability to check its own work.

---

## §1 The three layers of harness

Ship all three. They catch different things and none of them replaces the others.

| Layer | What it answers | When it runs | Bundled starting point |
|---|---|---|---|
| **Load-time smoke** | Does every mod file load? Do ids collide? Is `startData()` contract-valid? Do the hooks return `undefined`/NaN against a fresh save? | Stage 5.5 — **before** opening the browser | `assets/harness/smoke.js` |
| **Headless pacing sim** | How long does the economy actually take? Where does it detonate? Which milestone never fires? | Stage 6 — **before** rebalancing | `assets/harness/simulate.js` |
| **Browser pass** | Boot errors, every tab opens and renders, one real prestige per layer kind, save/reload, console clean — the things no stub can see | **Stage 6.5 (the generator), then Stage 7 (the user)** | the §5 checklist below |

The first two are dependency-free Node scripts. Copy them into `<game>/tools/`; they are
deliberately **not** part of the shipped game (do not list them in `modFiles`).

```bash
node tools/smoke.js        # 0 FAIL before you open the page
node tools/simulate.js     # pacing numbers before you rebalance anything
```

---

## §2 The smoke harness: what it is allowed to conclude

`smoke.js` executes the real mod files in Node with engine stubs. It is **not** a simulator and
must not be read as one — it answers "does it break?" not "does it pace?".

What it catches (all real, all invisible to the static checker):

- a file that throws at load (missing symbol, `undefined` initializer, top-level interpolation)
- a `startData()` that violates the contract (`unlocked` missing, `points` not a Decimal)
- **duplicate layer ids** — the second `addLayer()` is silently dropped by the engine
- `addLayer(id, factory(...))` — opaque to every tool (F11 in 07 Part F)
- hooks that return `undefined` or NaN when called with a fresh save
- a static layer with no `canBuyMax()`

**Stub fidelity rules.** Every phantom defect it has produced came from a stub gap, not from
the game. Three of them are worth knowing before you extend it:

- the engine merges `addedPlayerData()` into the save — a stub that skips it makes every
  global counter read `undefined` and reports a fake crash in `update()`
- the engine tags each layer with `this.layer`; hooks using `this.layer` need `LAYERS[id].layer = id`
- layers start **locked** in real play; a mock that starts everything unlocked exercises hooks
  the player cannot reach yet. Do it deliberately (it is how you find locked-layer crashes),
  and say so in the output.
- **Port the engine's reset semantics faithfully, warts and all.** One build's sim port
  auto-kept `points` in `layerDataReset` — friendlier than the engine, which resets everything
  not in the keep list — and so the sim passed while the real game wiped every layer's currency
  on its own prestige (07 Part F17). A harness that "fixes" the engine masks exactly the class
  of bug the harness exists to find; when in doubt, mirror the engine and let the defect
  surface here.

---

## §3 The pacing simulator: the doctrine

### 3.1 Calibrate before you quote

A generic greedy policy ("buy everything the moment it is affordable, prestige every tick")
**over-prestiges**: it ignores cap-stop upgrades, timed rituals, and cash-out costs. On one
build that made the sim finish in 0.00 h against the author's own calibrated 0.77 h.

So the reported total is trustworthy only after **one known point** has been fitted — a
playtest timestamp, a stopwatch on the first prestige, anything measured by a human. Until
then:

- **trust the early timeline**: time to first affordable purchase, time to each layer's first
  prestige and unlock. These are policy-independent and are where the author rules bite
  (first boost < 10 s).
- **do not trust the total.** `simulate.js` prints an explicit warning when a run finishes
  implausibly fast, rather than letting a 0.00 h number into a brief.

**Before you compare two totals, check the total against the step.** The policy loop runs once
per `--dt`, and any prestige worth ≥1 unit banks that unit — so without a click rate the sim's
income is a function of the STEP, not of the game: at `--dt 0.1` every layer banks ≥10 units per
second for free, at `--dt 1` it banks 1. One build measured 0.05 h at `--dt 0.1` and 0.46 h at
`--dt 1` — a factor of nine out of nothing. `simulate.js` now takes `--click <seconds>`
(default 1: at most one press per layer per second, which is already generous for a player
moving between nine tabs). With it the same build gave 5.60 / 5.59 / 5.79 h at `--dt`
0.25 / 0.5 / 1, and only `--dt 2` degraded. **A total that moves when you change only `--dt` is
measuring the harness, not the game.** Two diagnostic flags exist for the next question
("which multiplier is doing this?"): `--trace` prints the base / requires / gainMult / exponent /
gain at each layer's first prestige, and `--trace-every <seconds>` prints the whole economy on
that cadence.

### 3.2 The exclusions are the bias, and they must be written down

Both reference simulators exclude the same things and say so in their headers: challenge
rewards, achievement effects, clickable/minigame and board content, offline time, and human
dithering. That makes the sim a **lower bound**. State it in the brief next to the number.
One build's sim was 0.62 h against a 2.5 h human run — ×4 — and that ratio is itself the
calibration.

**The achievement count is a pacing lever hiding inside that bias.** Every achievement's
`effect()` is excluded from the sim, so the *number* of achievements silently scales real
playtime down without moving the measured floor. One build planned 24 achievements at ×1.15
each (×21 endgame income), then caught itself before shipping 50 of them (×1080) — the
simulated 5.25 h would have stopped bounding the real game. If you change an achievement
count after the measurement, either lower the per-achievement reward to keep the product
constant or re-measure; never change the count alone.

### 3.3 Constants live in one place, read by both

Put every pacing constant in a modFile — `js/tuning.js` — and have **both** the game and the
simulator read it. A constant written as a literal inside a layer file is a constant the
simulator cannot see, so tuning it tunes nothing. If you tune the code instead of the brief
you have lost the ability to re-derive the numbers, which is the whole reason the brief exists.

### 3.4 What the simulator finds that nothing else can

| Signal | Real example |
|---|---|
| **Detonation** — income compounds through its own output | a buyable block composed income ∝ income^≈2 and reached 1e73 (F13) |
| **Dead automation** — a flag is promised in text and never set anywhere | two milestones promised `autoPrestige`/`autoUpgrade`; nothing ever set the flags, so the whole game was played manually |
| **Unreachable thresholds** — milestones past an exploding formula never fire | automation steps 2–6 were unreachable (F14) |
| **Skip-run** — a discrete endgame purchase is affordable before the ladder it ends | 0.1 h finale (F15) |
| **Mid-game cliff** — coupled milestone/income feedback | income 1e6 → 1e60 in one cascade at a layer unlock (F16) |
| **Unbounded area** — a curve that never flattens where the brief said it would | the ×4 estimate error above |

Each of these is invisible to all 68 static rules, and each one was a player-visible defect.

---

## §4 Stage 6 checklist (replaces the pure-estimate walkthrough)

- [ ] `node tools/smoke.js` — 0 FAIL, and the WARNs are understood (a stub warning that is
      not real gets a comment in the script, not a shrug).
- [ ] `node tools/simulate.js` — record the first-purchase time and each layer's first prestige.
- [ ] Every pacing constant is read from the shared module (`js/tuning.js`), not inlined.
- [ ] The sim's exclusions are listed in the brief next to the total, with the lower-bound note.
- [ ] One known playtest point is used to fit the policy; the ratio sim→human is recorded.
- [ ] No milestone's production reward makes the NEXT milestone's threshold trivial (no cliff).
- [ ] Every buyable's `ln(effect mult) / ln(cost mult)` is comfortably below 1 (F13).
- [ ] Every discrete endgame purchase costs more than the end of the ladder it terminates (F15).
- [ ] Every declared automation flag is set by some `onComplete()`/`onPurchase()` and read by
      the layer — grep for the flag name before you trust the description text.
- [ ] The endgame target is reachable in-sim but not instant (07 Part F15).
- [ ] Only then: rebalance the BRIEF, regenerate the numbers, re-run. Never hand-tune the code.

---

## §5 The browser pass (Stage 6.5) — the checklist, and the incident behind each line

Static checks, smoke and the sim all read the game without a real browser. Four real builds
shipped browser-only breakages before this stage existed; each checklist line below encodes
one of them.

- [ ] **Boot: `__bootErrors` empty, the tree renders.** *Incidents:* `<body onload="load()">`
      booted into a half-built `layers` object (the Braille Tree §12.1); dynamic mod scripts
      with a set-attribute `"async"` raced so `layers.js` ran before `tuning.js` (the Double
      Ninth Tree D25) — both now fixed in the template loader and asserted by the tests.
- [ ] **Every layer tab opens, and every microtab inside it renders.** *Incidents:* a custom
      layer whose `canReset()` needed its own state could never be opened (D-CANRESETDEAD);
      a bar hook calling Decimal methods on a plain number aborted the Vue mount and left the
      page on "Loading..." (07 Part C) — a render-time throw is visible only as a stuck page,
      never as a boot error.
- [ ] **One real prestige per layer kind; buy one upgrade and one buyable; click a clickable.**
      *Incidents:* a `doReset` that wiped the currency it had just granted — best rose, points
      stayed 0 (07 Part F17); the sim masked it because its reset port auto-kept `points` (§2).
      Buyables bought but changed nothing — no consumer (F21). These are the defects no
      file-level tool can see, because they live in the interaction between engine and mod.
- [ ] **Save → reload intact; a manual export/import round-trips** (for any game with non-ASCII
      in `player` — bilingual microtab keys qualify — the engine's own Export button is
      Latin1-only, 07 Part F23).
- [ ] **Console clean at the end.** Re-run Stage 5 after every fix; record each browser-only
      fix in the brief's §12 so the next build inherits the pattern.

Run it with any static server plus a real browser; if console capture is unavailable, install
the `window.__bootErrors` collector from SKILL.md Stage 6.5 into `index.html` (a per-game
shell — the scaffolder already patches it).
