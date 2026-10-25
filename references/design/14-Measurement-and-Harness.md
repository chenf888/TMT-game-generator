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

Each of these is invisible to every static rule, and each one was a player-visible defect.

### 3.5 Engine-fidelity gates in the simulator (each one was a mis-measurement first)

The bundled simulator ports the engine's prestige formulas, and four ports were wrong before
they were right — each wrong port produced a confident wrong total:

| Gate | Engine truth | Before the fix |
|---|---|---|
| static prestige | `canReset` for statics is `baseAmount ≥ getNextAt` (game.js:124), never "gain ≥ 1" — `getResetGain` floors to 1 below the requirement | a row-2 static pressed every tick below its price, cascade-wiping the root: one build froze at 65 接种者 for 40 h with income 2e5/s |
| `onPrestige(gain)` order | runs BEFORE the gain is banked; `resetsNothing()` returns AFTER banking, BEFORE the root is zeroed (game.js:211) | autoPrestige+resetsNothing was simulated as wiping the base every tick — false DID-NOT-REACH |
| static next-floor price | `requires × base^(points^exponent / gainExp) × gainMult`, buy-max gain added only when `baseAmount ≥ nextAt` (game.js:55) | unconditional buy-max inflated the price: cc/mob sat at 0 floors for 29 h despite gain 21/16 |
| `update(diff)` receives a NUMBER | game.js:353 passes the numeric step; the sim once passed a Decimal | the sim ran clean while a real browser threw `diff.times is not a function` every tick — the sim now passes the number and REPORTS a throw instead of swallowing it (source rule D-DIFFNUM) |

If you fork the harness, these four gates are the parts worth re-verifying against
`js/game.js` first.

### 3.6 Probe before knob

When the measured total lands outside the band, the instinct is to turn a pacing knob. Don't —
not before a probe. On one build the total came in at 9.3 h against a 10–30 h band; two blind
knob turns (doses 12→14, zero-window +17%) did nothing; then a launch-instant surplus print
showed ONE endgame gate holding <0.1% slack while the other gates carried 50× — a single knob
on the real gate (6 → 6.3) restored 10.08 h. The wasted turns were reverted.

`tools/simulate.js --probe <layer>` prints the state at every press of that layer; a sim-only
`simProbeGates()` hook on the layer (returning `[label, have, need]` rows) turns that into a
per-gate surplus table. Read which gate is the hard one, tune that one constant in
`js/tuning.js`, and revert the knobs that did nothing.

### 3.7 Where the real pacing valve lives

Four doctrines from measured retunes, all pointing the same way — **the requires ladder is
usually not the valve**:

1. **Multiplier zones punch through requires.** One build's guaranteed multipliers spanned
   ~30 orders of magnitude while its requires ladder spanned 2; widening requires ×400 moved
   the first prestige by 14 seconds. The real valves were the static `base^levels` cost
   curve, the endgame purchase chain, and the endgame ladder (monitoring windows) — tune
   THOSE.
2. **An automation supply layer must stay pressable end-to-end.** A `2^levels` wall on the
   layer feeding an autoPrestige broke the second endgame purchase for 44 h of sim time: the
   automation starved its own supply. If a layer feeds automation, its price curve must stay
   affordable at the era the automation arrives.
3. **Divide-type suppression never reaches zero.** `÷1.25^levels` asymptotes; a goal of
   "hold zero for two years" is mechanically impossible. Sell a constant window instead
   (pressure ≤ 0.1 counts as zero), and price depth so the window is reachable.
4. **Quote the dt spread.** Report the total at dt 0.5 / 1 / 2 and cite the dt-1 value —
   one build measured 12.4 / 15.0 / 19.7 h (±25%). A total that swings more than that is
   measuring the harness, not the game.

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
- [ ] The total is quoted with its dt spread (0.5 / 1 / 2) and the dt-1 value cited (§3.7).
- [ ] An out-of-band total was met with a probe first, a knob second (§3.6) — and the knobs
      that did nothing were reverted.
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
      Latin1-only, 07 Part F23). After injecting state for a test, wait one frame before
      asserting: `tmp` recomputes per frame, and a same-frame read after a write sees the
      pre-tick value (one build chased a phantom crash that existed only in the injected
      same-frame assertion).
- [ ] **Console clean at the end.** Re-run Stage 5 after every fix; record each browser-only
      fix in the brief's §12 so the next build inherits the pattern.

Run it with the bundled no-store server (`node tools/serve.js`, copied from
`assets/harness/`) plus a real browser — `python -m http.server` and `npx http-server` send
no cache headers, and Chrome's heuristic cache kept serving a pre-fix `js/mod.js` on one
build: "the fix doesn't take effect" was a whole feedback round. The engine loader reads
modFiles from mod.js, so those URLs cannot take a `?v=`; the server side is the only channel.
CSS links can and should: bump `?v=N` after any CSS edit. If console capture is unavailable,
install the `window.__bootErrors` collector from SKILL.md Stage 6.5 into `index.html` — the
scaffolder already injects it; it records message plus stack first line, so a boot error
names its file, not just its mood.

### §5.1 The per-layer micro-gate (Stage 4.2)

Bottom-row-first generation means every intermediate state is already a playable game — the
engine row-gates layers that do not exist yet, so a partial tree needs no stubs (stubbing is
the simulator's known blind spot; absence is safe). SKILL.md Stage 4.2 therefore gates each
layer at write time: static checks re-run (the scaffold baseline is 0 FAIL, and only the
cross-layer wiring rules N-UNWIRED / N-BUYABLEDEAD may carry red for ids whose consumer is a
later layer, clearing at that layer's gate), then a boot + tab-open + one prestige + one
purchase + clean console.

What this buys: the browser-only crash class dies with a one-layer debug radius at write
time — the factory display bare line, the render throw stuck on "Loading...", the layer-color
leak, the static-L i18n field. Before this gate existed, all of those waited for Stage 6.5,
where any of N layers is a suspect and every fix restarts the pass.

What it must NOT become: the micro-gate is interaction smoke, not a tuning loop. A number
that felt wrong while pressing is a brief §10 deviation row → a `js/tuning.js` constant → a
sim re-run. The final full pass (§5) also stays mandatory — cross-row cascades, save/export
and offline only exist once the last layer is written.

### §5.2 The save injector — late layers in seconds

`node tools/simulate.js <game> --save-at <layerId>` ends the run at the instant that layer
first unlocks and writes `tools/save-at-<layerId>.js`: a one-line
`localStorage.setItem(modInfo.id, "<base64>")` in exactly the engine's own format
(save.js:7 — `btoa(unescape(encodeURIComponent(JSON.stringify(player))))`; `Buffer.from(json,
"utf8").toString("base64")` is byte-identical). Paste the line into the console and the page
reopens at that layer's entry: `load()` is `Object.assign(getStartPlayer(), parsed)` plus
`fixSave()`, so a partial engine-shaped save is legal — `Decimal.toJSON()` (= toString)
round-trips through fixData's `new Decimal(...)` wherever the start player holds one, and
every field the sim does not track is filled from the start player.

Validated live on The Smallpox Tree (2026-10-25): the reloaded page matched the snapshot
field-for-field (var 467 / upgrades 11–15 / knw+vac unlocked, sur locked), booted clean, and
the state survived two further reloads. Two operational rules from that test: **wait one
frame** after the reload before asserting (§5 line 4), and in an automated browser run the
setItem and the reload as **two separate steps** — an in-script `location.reload()` plus a
second reload raced the engine's 5 s autosave and the injection was overwritten before
`load()` saw it. The injected banks are a greedy policy's, a plausible entry state — use them
to open tabs and press buttons, never as a pacing verdict.

### §5.3 The feel protocol (brief §12)

The browser pass is the only instrument that can see legibility, and it must write its
findings down or they evaporate. Per layer, record three machine-checkable proxies:
seconds to the layer's first prestige press, clicks before its first upgrade purchase, and
whether the next action is named on screen (yes/no + what it says). These catch "the player
cannot tell what to do" — the one defect class no tool in this handbook can see.

The protocol's discipline: these rows are **observations, not a tuning signal**. A bad row
routes through §10 (deviation) → tuning.js → sim, exactly like every other play observation.
The generator cannot feel fun; it can measure time-to-first-press, and it can fix legibility.

### §5.4 Why "build while playing" is not the primary loop

The proposal — write a layer, play it in the browser immediately, fill the numbers in as you
play — keeps resurfacing, and half of it is now pipeline (§5.1 gates each layer in a browser;
§5.2 opens late layers in seconds). The other half — play as the pacing authority — is
rejected on measured evidence, and this section exists so the decision is not relitigated:

1. **Pacing is a global closed-loop property.** A total-duration target (99.8 h on one build,
   10.08 h on another) is only measurable on the complete loop; a late layer that overruns
   invalidates every earlier "played and approved" number. The sim compresses the whole loop
   into ≤120 s of wall clock; the browser runs it in real time.
2. **A playthrough is one noisy sample.** The dt spread alone is ±25% (§3.7). Play-tuned
   numbers overfit noise; the sim quotes the spread, a session quotes nothing.
3. **Playing is knob-turning without a probe.** One build's binding gate held <0.1% slack
   while the others held 50× — two blind knob turns did nothing before the probe found it
   (§3.6). A browser session has less gate visibility than the probe, not more.
4. **Untraceable numbers break the brief system.** The brief exists so numbers are
   re-derivable, user-confirmed, and inheritable as defaults. Play-tuned literals have no
   ledger, bypass the Stage 2 confirmation gate, and die with the game that produced them.
5. **Cross-layer wiring is invisible per-layer.** The corpus's 54%-unwired trap and the dead
   buyable rule exist because layer-local views cannot see consumers that live later. The
   relay tree — nine human authors each playing then extending the game — still shipped the
   cross-layer defect classes; playing per layer does not reveal them.
6. **"More human" is selective.** A browser session is human in channel (real engine, real
   frames) and un-human in psychology: it reads exact numbers, never gets bored, never tabs
   away — so legibility shows, but grind fatigue and offline behavior (core incremental
   mechanics) cannot.

The division of authority that falls out: **fast tools inner, slow tools outer.** Static
checks (instant) and the sim (≤120 s) iterate inside the loop and own correctness and pacing;
the browser (minutes) gates at the boundary — per layer for interaction (§5.1), whole-game at
6.5 — and contributes observations, never numbers.
