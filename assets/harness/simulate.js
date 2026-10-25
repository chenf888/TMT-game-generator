/* =============================================================================
 * simulate.js — headless greedy playthrough for pacing calibration.
 * Bundled with the tmt-game-generator skill (stage 6). TEMPLATE — validate before use.
 *
 * WHY THIS EXISTS
 *   Paper reachability estimates were wrong on every build that was ever checked
 *   against a simulator:
 *     · one game estimated 8–18 h from the brief and was finished in 2.5 h
 *     · another estimated a sane curve and detonated at 28 s of simulated play
 *   The design brief is a lower bound, not a prediction. Stage 6 is therefore a
 *   MEASUREMENT, not an estimate: run this, then rebalance the brief.
 *
 * WHAT IT DOES
 *   Loads the REAL mod files in Node with engine stubs, ports the engine's own
 *   prestige formulas out of js/game.js, and drives the economy with a greedy
 *   "buy everything the moment it is affordable" policy. It reports the time to
 *   the first affordable purchase, to each layer's first prestige and unlock,
 *   and to isEndgame().
 *
 * KNOWN LOWER-BOUND BIAS (documented, not a bug)
 *   Excluded: challenge rewards, achievement effects, clickable/minigame and
 *   board content, offline time, and human dithering. The sim is therefore
 *   FASTER than a real player. Two reference points: one build's sim was 0.62 h
 *   against a 2.5 h human run (×4), another's 99.8 h matched its target. Read
 *   the sim's total as a floor; if the floor already misses the target, the
 *   target is missed. If it lands at ~1/4 of the target, you are on pace.
 *
 * CALIBRATION IS MANDATORY BEFORE YOU QUOTE A TOTAL
 *   A generic policy over-prestiges: it clicks the prestige button every tick a
 *   gain is available and ignores every per-game guard (cap-stop upgrades, timed
 *   rituals, cash-out costs). On a real build that made the sim finish in 0.00 h
 *   against the author's own calibrated 0.77 h. So: TRUST the early timeline
 *   (first purchase, first prestige per layer, the era where things unlock) —
 *   those are policy-independent. DO NOT trust the total until you have fitted
 *   the policy to one point you already know from a real playthrough. When the
 *   run ends implausibly fast the script says so out loud.
 *
 *   The largest single source of over-prestige is the click rate: see --click
 *   below. A sim whose total moves when you change only --dt is measuring its own
 *   step, not the game — the click throttle is what makes the total mean anything.
 *
 * USAGE
 *   node assets/harness/simulate.js <game-folder> [--max-hours 200] [--json]
 *   node assets/harness/simulate.js <game-folder> --click 1 --dt 1 --max-hours 200
 *   node assets/harness/simulate.js <game-folder> --click 1 --dt 1 --probe <endgame-layer>
 *   node assets/harness/simulate.js <game-folder> --save-at <layerId>   (browser handoff)
 *   Copy to <game>/tools/simulate.js next to the game. Put every tunable
 *   constant in a modFile (e.g. js/tuning.js) that BOTH the game and this script
 *   read — otherwise you are tuning a number the game does not use.
 *
 * ADAPT PER GAME (grep for ADAPT):
 *   · buyables  — the generic policy buys them from the layer's own points pool;
 *                 a layer that overrides canAfford()/pay() (static layers paid
 *                 from a shared resource) must be taught here too
 *   · custom layers — if getResetGain() is defined it is used; a layer whose
 *                 prestige is bespoke needs its own branch
 *   · production  — getPointGen() is called directly; a game whose rate lives in
 *                 a helper must expose it (see js/tuning.js in the references)
 *   · endgame probe — --probe <layer> prints the state at every press of that
 *                 layer; give the layer a sim-only simProbeGates() hook returning
 *                 [label, have, need] rows to see WHICH gate is the hard one.
 *                 PROBE BEFORE KNOB: on The Smallpox Tree two blind knob turns
 *                 did nothing, then the probe showed one gate at <0.1% slack
 *                 while the others had 50× — a single knob fixed the pacing.
 *
 * BROWSER HANDOFF (--save-at <layerId>) — open a LATE layer in the browser in seconds
 *   The sim runs the whole economy in ≤120 s of wall clock; the browser runs it in real
 *   time, so "play to layer 5" costs hours there. --save-at snapshots the sim's
 *   engine-shaped player at the instant layer <id> first unlocks, serializes it exactly
 *   as js/utils/save.js:7 does, and writes tools/save-at-<id>.js — a localStorage
 *   one-liner to paste into the browser console (then reload). Fidelity notes:
 *     · the engine stores localStorage[modInfo.id] = btoa(unescape(encodeURIComponent(
 *       JSON.stringify(player)))); Node has no escape/btoa, but
 *       Buffer.from(json,"utf8").toString("base64") is byte-identical to that trick
 *     · Decimal.toJSON() is toString(), and load()'s fixData() rebuilds Decimals
 *       wherever getStartPlayer() has one — so the sim's player serializes as-is and
 *       every field the sim does not track is filled from the start player
 *     · after the reload, WAIT ONE FRAME before asserting state — tmp recomputes per
 *       frame (a same-frame read sees the pre-tick value)
 *     · pasting the whole line into a normal browser console is one step. In an
 *       AUTOMATED browser (ZCode IAB) run it as TWO: evaluate the localStorage.setItem
 *       expression, then reload via the browser API — calling location.reload() inside
 *       the same evaluated script plus a second reload raced the engine's 5 s autosave
 *       and the injected save was overwritten before load() saw it (found live,
 *       2026-10-25: setItem → API-reload loaded the state field-for-field).
 *   The greedy policy's banks are a plausible ENTRY state, not a human's: the save is
 *   for interaction testing (tab opens, prestige works, save survives), never a pacing
 *   verdict — the sim alone owns pacing.
 *
 * ENGINE-FIDELITY PATCHES (each one was a real mis-measurement before it existed)
 *   · static prestige is gated on baseAmount ≥ getNextAt (game.js:124), never on
 *     gain ≥ 1 — gainOf floors to 1 below the requirement (Smallpox: a row-2
 *     static cascade-wiped the root every tick; var frozen at 65 for 40 h)
 *   · onPrestige(gain) runs BEFORE the gain is banked; resetsNothing() returns
 *     AFTER banking and BEFORE the root is zeroed/cascade (game.js:211)
 *   · update() receives a NUMERIC diff, exactly as the engine passes it
 *     (game.js:353) — a layer that calls diff.times() without normalizing is
 *     reported, not masked
 * ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const maxHoursIdx = argv.indexOf("--max-hours");
const MAXH = maxHoursIdx >= 0 ? Number(argv[maxHoursIdx + 1]) : 400;
/* --dt <seconds>: the simulated step. 0.1 mirrors the engine's ~20 Hz temp refresh, which is
 * what an interactive run wants; a long Stage-6 run can use 1 (the per-tick income integral and
 * the purchase cadence are unchanged — only the resolution of the discrete jumps is coarser,
 * and both 0.1 and 1 are far finer than a human's). */
const dtIdx = argv.indexOf("--dt");
const DT = dtIdx >= 0 ? Number(argv[dtIdx + 1]) : 0.1;
/* --budget <ms>: wall-clock cap. The 120 s default keeps an interactive run snappy; a full
 * 400 h simulation of a slow tick costs far more, so Stage 6 raises it explicitly. */
const budgetIdx = argv.indexOf("--budget");
const BUDGET = budgetIdx >= 0 ? Number(argv[budgetIdx + 1]) : 120000;
/* --click <seconds>: how often the policy may press ONE layer's prestige button. This is the
 * most important fidelity knob in the script. The policy runs once per --dt, and any prestige
 * worth >= 1 unit banks that unit — so without a click rate the sim's income is a function of
 * the STEP rather than of the game: at --dt 0.1 every layer banks >= 10 units per second for
 * free, at --dt 1 it banks 1. That artefact alone turns a multi-hour ladder into a ten-minute
 * one. One press per layer per second is still generous (a player moving between nine tabs,
 * reading tooltips and playing a minigame acts far slower), so the total stays a LOWER bound. */
const clickIdx = argv.indexOf("--click");
const CLICK = clickIdx >= 0 ? Number(argv[clickIdx + 1]) : 1;
/* --trace: at each layer's FIRST prestige, print the numbers the gain formula saw
 * (base currency, requires, gainMult, exponent, gain). A layer that gains 1e10 on its first
 * press is being fed by an over-tuned multiplier, and this line names which one by arithmetic
 * instead of by guesswork. */
const TRACE = argv.includes("--trace");
/* --trace-every <seconds>: print the state of the economy on that cadence — the root currency,
 * its rate, and every layer's bank and gain. This is the view that shows WHICH loop is closing
 * too fast (root rate -> prestige currency -> upgrades -> root rate), as opposed to --trace,
 * which only shows the instant each layer first fires. */
const traceEveryIdx = argv.indexOf("--trace-every");
const TRACE_EVERY = traceEveryIdx >= 0 ? Number(argv[traceEveryIdx + 1]) : 0;
/* --probe <layer>: at EVERY prestige press of that layer, print the state line — and if the
 * layer defines a sim-only simProbeGates() hook (returning [label, have, need] rows), print
 * each endgame gate's surplus at that instant. Origin (The Smallpox Tree, 2026-10-25): after
 * the measured total drifted out of band, two blind knob turns did nothing; the launch-
 * instant surplus print then showed ONE gate at <0.1% slack while the others held 50× — a
 * single knob (6 → 6.3) brought the run back in band. Probe before knob. */
const probeIdx = argv.indexOf("--probe");
const PROBE = probeIdx >= 0 ? argv[probeIdx + 1] : null;
/* --save-at <layerId>: dump an engine-format save at the instant that layer first unlocks
 * (see BROWSER HANDOFF above) and end the run — the pacing report needs the flag dropped. */
const saveAtIdx = argv.indexOf("--save-at");
const SAVE_AT = saveAtIdx >= 0 ? argv[saveAtIdx + 1] : null;
/* the value after a flag is not a path; when the flag is absent there is no such index, so the
 * guards must not become 0 — that would eat the game folder argument. */
const FLAG_VALUE_IDX = new Set([maxHoursIdx, dtIdx, budgetIdx, clickIdx, traceEveryIdx, probeIdx, saveAtIdx].filter((i) => i >= 0).map((i) => i + 1));
const game = path.resolve(argv.filter((a, i) => !a.startsWith("--") && !FLAG_VALUE_IDX.has(i))[0] || path.join(__dirname, "..", ".."));
if (!fs.existsSync(path.join(game, "js", "mod.js"))) {
    console.error("no js/mod.js under " + game + " — pass the game folder as the first argument");
    process.exit(2);
}

const Decimal = require(path.join(game, "js", "technical", "break_eternity.js"));
if (typeof Decimal !== "function") { console.error("break_eternity.js did not export a Decimal constructor"); process.exit(2); }

const LOG = (...a) => { if (!asJson) console.log(...a); };

// ---- engine stubs ----------------------------------------------------------
const LAYERS = {};
const layerOrder = [];
global.window = global;
global.Decimal = Decimal;
global.format = (x) => (x && x.toString ? x.toString() : String(x));
global.formatWhole = global.format;
global.formatTime = (s) => String(s);
global.formatSmall = global.format;
global.TREE_LAYERS = [];
global.UP = 0; global.DOWN = 1; global.LEFT = 2; global.RIGHT = 3;
global.addNode = () => {};
global.addLayer = function (id, def) { LAYERS[id] = def; layerOrder.push(id); };
global.hasUpgrade = (l, id) => !!player[l] && player[l].upgrades.includes(Number(id));
global.hasMilestone = (l, id) => !!player[l] && player[l].milestones.includes(Number(id));
global.hasAchievement = () => false;
global.inChallenge = () => false;
global.hasChallenge = () => false;
global.maxedChallenge = () => false;
global.challengeCompletions = () => new Decimal(0);
global.challengeEffect = () => new Decimal(1);
global.completeChallenge = () => {};
global.getBuyableAmount = (l, id) => (player[l].buyables[id] || new Decimal(0));
global.setBuyableAmount = (l, id, v) => { player[l].buyables[id] = v; };
global.upgradeEffect = function (l, id) { const u = LAYERS[l].upgrades[id]; u.layer = l; u.id = Number(id); return u.effect(); };
global.buyableEffect = function (l, id) { const b = LAYERS[l].buyables[id]; b.layer = l; b.id = Number(id); return b.effect(global.getBuyableAmount(l, id)); };
global.softcap = (v, cap, p) => (v.gt(cap) ? v.pow(p).times(cap.pow(1 - p)) : v);
global.softcapHTML = (x) => x;
global.layerDataReset = function (l, keep) {
    keep = keep || [];
    const sd = LAYERS[l].startData();
    /* Mirrors game.js layerDataReset: the layer is rebuilt from startData() and ONLY the
     * engine's four always-kept fields plus the caller's keep list survive. `points` is
     * NOT implicitly kept — a keep list that omits it means the reset wipes the currency,
     * which is exactly what a lower row is supposed to feel when a deeper layer resets.
     * Keeping points unconditionally here made every cascade free, so the ladder could be
     * climbed without ever rebuilding a row (2026-10-17, The-Solar-Terms-Tree: the sim
     * finished the whole game in 3 minutes and reported it as a 0.05 h playthrough). */
    const ALWAYS = ["unlocked", "forceTooltip", "noRespecConfirm", "prevTab"];
    const saved = {};
    ALWAYS.concat(keep).forEach((k) => { if (player[l][k] !== undefined) saved[k] = player[l][k]; });
    player[l] = Object.assign({}, sd);
    player[l].points = (saved.points !== undefined) ? saved.points : (sd.points || new Decimal(0));
    player[l].upgrades = [];
    player[l].milestones = [];
    player[l].achievements = [];
    player[l].buyables = {};
    player[l].clickables = {};
    player[l].challenges = {};
    player[l].grid = {};
    Object.keys(saved).forEach((k) => { player[l][k] = saved[k]; });
};
global.addPoints = (l, amt) => { player[l].points = player[l].points.add(amt); };
global.addPointsNoReturn = global.addPoints;
global.addResource = (l, name, amt) => { player[l][name] = (player[l][name] || new Decimal(0)).add(amt); };
global.run = (fn) => (typeof fn === "function" ? fn() : undefined);
global.canBuy = () => false;
global.canAfford = () => false;
global.respecBuyables = () => {};
global.buyUpgrade = () => {};
global.buyBuyable = () => {};
const compStub = () => ({ cost: new Decimal(1), effect: new Decimal(1), amount: new Decimal(0), unlocked: true, canComplete: () => false });
const layerStub = () => new Proxy({}, { get(t, k) {
    if (typeof k === "symbol") return Reflect.get(t, k);
    if (k === "buyables" || k === "upgrades" || k === "challenges") return new Proxy({}, { get: () => compStub() });
    return new Decimal(1);
}});
global.tmp = new Proxy({}, { get: () => layerStub() });

// ---- load the mod, in index.html order -------------------------------------
const ENGINE = /^js\/(technical|utils)\/|^js\/(game|components|utils)\.js$|^js\/Demo\//;
const html = fs.readFileSync(path.join(game, "index.html"), "utf8");
const htmlScripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map((m) => m[1])
    .filter((s) => !/^https?:|^\/\//.test(s)).map((s) => s.replace(/^\.?\//, ""))
    .filter((s) => s.startsWith("js/") && !ENGINE.test(s));
const modSrc = fs.readFileSync(path.join(game, "js", "mod.js"), "utf8");
const mf = modSrc.match(/modFiles\s*:\s*\[([\s\S]*?)\]/);
const modFiles = mf ? [...mf[1].matchAll(/["']([^"']+)["']/g)].map((m) => "js/" + m[1]) : [];
const files = [];
/* Vendored third-party bundles (vue.min.js) are not mod code — Node has no `document`
 * (same exclusion as tools/smoke.js; found after localizing Vue per the T2+ rule). */
const VENDOR = /\/vue(\.min)?\.js$/;
const push = (f) => { if (f && !files.includes(f) && !ENGINE.test(f) && !/tree\.js$/.test(f) && !VENDOR.test(f)) files.push(f); };
htmlScripts.filter((f) => /\/lang\//.test(f)).forEach(push);
push("js/mod.js"); modFiles.forEach(push); htmlScripts.forEach(push);
for (const f of files) {
    const p = path.join(game, f);
    if (!fs.existsSync(p)) continue;
    const code = fs.readFileSync(p, "utf8").replace(/\b(?:const|let)\s+(?=[A-Za-z_$])/g, "var ");
    try { (0, eval)(code); } catch (e) { console.error(f + " threw at load: " + e.message); process.exit(2); }
}

// ---- player ----------------------------------------------------------------
// the engine tags every layer with its own id so layer hooks can read this.layer
for (const id of layerOrder) LAYERS[id].layer = id;
if (SAVE_AT !== null && !LAYERS[SAVE_AT]) {
    console.error("--save-at: no layer \"" + SAVE_AT + "\" (this game's layers: " + layerOrder.join(", ") + ")");
    process.exit(2);
}
let player = {};
for (const id of layerOrder) {
    let sd = {};
    try { sd = LAYERS[id].startData ? LAYERS[id].startData() : {}; } catch (_) { sd = {}; }
    player[id] = Object.assign({}, sd, { upgrades: [], milestones: [], challenges: [], buyables: {} });
    if (typeof player[id].unlocked !== "boolean") player[id].unlocked = false;
    if (!player[id].points || typeof player[id].points.add !== "function") player[id].points = new Decimal(0);
}
/* modInfo.initialStartPoints is what the engine hands a fresh save, and what a non-row-0
 * prestige returns the root currency to. Fall back to the template's 10. */
const START_POINTS = (() => {
    try { if (global.modInfo && global.modInfo.initialStartPoints) return new Decimal(global.modInfo.initialStartPoints); } catch (_) {}
    return new Decimal(10);
})();
player.points = START_POINTS;
if (typeof global.addedPlayerData === "function") Object.assign(player, global.addedPlayerData());
global.player = player;
global.getPointGen = global.getPointGen || (() => new Decimal(1));
const ENDGAME = typeof global.isEndgame === "function" ? global.isEndgame : () => false;

// ---- engine-formula port (mirrors js/game.js) ------------------------------
/* softcap: the engine evaluates `softcap()` as a function (tmp[layer].softcap) but copies
 * `softcapPower` into tmp as a PLAIN VALUE (temp.js setupTempData; layerSupport.js:188-189
 * defaults it to a Decimal). Accept either shape for both, so a game may write the power as
 * a constant or as a function and the simulator still mirrors js/game.js:28. */
const asValue = (v, dflt) => (v === undefined ? dflt : (typeof v === "function" ? v() : new Decimal(v)));
const layerSoftcap = (l) => asValue(LAYERS[l].softcap, new Decimal("e1e7"));
const layerSoftcapPower = (l) => asValue(LAYERS[l].softcapPower, new Decimal(0.5));
const layerGainMult = (l) => (LAYERS[l].gainMult ? LAYERS[l].gainMult() : new Decimal(1));
const layerGainExp = (l) => (LAYERS[l].gainExp ? LAYERS[l].gainExp() : new Decimal(1));
const reqOf = (l) => { const r = LAYERS[l].requires; return typeof r === "function" ? r() : r; };
const isPrestige = (l) => ["normal", "static", "custom"].includes(LAYERS[l].type);

function gainOf(l) {
    const L = LAYERS[l];
    if (!player[l].unlocked) return new Decimal(0);
    if (typeof L.getResetGain === "function") return L.getResetGain();     // ADAPT: bespoke prestige
    const rm = reqOf(l); if (rm === undefined) return new Decimal(0);
    if (L.type === "static") {
        const base = L.baseAmount();
        if (!L.canBuyMax || !L.canBuyMax()) return new Decimal(1);
        if (base.lt(rm)) return new Decimal(1);
        let g = base.div(rm).div(layerGainMult(l)).max(1).log(L.base).times(layerGainExp(l)).pow(Decimal.pow(L.exponent, -1));
        return g.floor().sub(player[l].points).add(1).max(1);
    }
    if (L.type !== "normal") return new Decimal(0);
    /* ADAPT: the base currency is the layer's OWN baseAmount(), never a blanket
     * player.points. The engine reads tmp[layer].baseAmount in getResetGain()/canReset(),
     * and a tree whose rows feed each other (the standard shape: layer N's requires is
     * expressed in layer N-1's currency) would otherwise be simulated as if every layer
     * prestiged off the root resource — which makes the whole ladder look trivial. */
    const base = (typeof L.baseAmount === "function") ? L.baseAmount() : player.points;
    if (base.lt(rm)) return new Decimal(0);
    let g = base.div(rm).pow(L.exponent || 0.5).times(layerGainMult(l)).pow(layerGainExp(l));
    const sc = layerSoftcap(l);
    if (g.gte(sc)) g = g.pow(layerSoftcapPower(l)).times(sc.pow(new Decimal(1).sub(layerSoftcapPower(l))));
    return g.floor().max(0);
}
/* Engine fidelity (game.js getNextAt, static branch): the next static level costs
 * requires × base^(points^exponent / gainExp) × gainMult, and canReset for statics is
 * baseAmount ≥ nextAt (game.js:124) — NOT gain ≥ 1. Gating statics on gain≥1 let them
 * press below the requirement (gainOf returns the floor value 1 there), so a row-2
 * static cascade-wiped the root currency every tick and starved rows 0-1 (found live on
 * The Smallpox Tree: var frozen at 65 接种者 for 40 h with income 2e5/s). */
const staticNextAt = (l) => {
    const L = LAYERS[l];
    const rm = reqOf(l);
    const exp = L.exponent || 1;
    const gexp = (typeof L.gainExp === "function") ? L.gainExp() : (L.gainExp || 1);
    const dmult = (typeof L.directMult === "function") ? L.directMult() : (L.directMult || 1);
    const baseNum = (L.base === undefined) ? 2 : L.base;
    /* engine game.js:55 gates the resetGain term on `baseAmount.gte(nextAt)` — at rest
     * (base below nextAt) the next-level cost is computed from points alone. Adding the
     * buy-max gain unconditionally inflated the next-level cost and froze cc/mob at 0
     * points for 29 h of sim time despite gain 21/16. */
    let amt = player[l].points.div(dmult);
    let cost = Decimal.pow(baseNum, amt.pow(exp).div(gexp)).times(layerGainMult(l)).times(rm).max(rm);
    if (L.roundUpCost) cost = cost.ceil();
    return cost;
};
const canPrestige = (l) => {
    if (!isPrestige(l)) return false;
    const L = LAYERS[l];
    if (typeof L.canReset === "function") return !!L.canReset();
    const base = (typeof L.baseAmount === "function") ? L.baseAmount() : player.points;
    if (base.lt(reqOf(l))) return false;   // engine doReset's own gate (game.js:182)
    if (L.type === "static") return base.gte(staticNextAt(l));   // game.js:124
    return gainOf(l).gte(1);
};
function doPrestige(l) {
    const g = gainOf(l);
    if (g.lt(1)) return false;
    if (PROBE === l) {
        LOG("  probe " + l + " press @ " + (t / 3600).toFixed(2) + " h  gain=" + global.format(g) +
            "  points=" + global.format(player[l].points));
        if (typeof LAYERS[l].simProbeGates === "function") {
            try {
                for (const row of LAYERS[l].simProbeGates() || []) {
                    const slack = (row[2] && row[2].gt && row[2].gt(0)) ? " (" + row[1].div(row[2]).toFixed(3) + "×)" : "";
                    LOG("    gate " + row[0] + ": have " + global.format(row[1]) + " / need " + global.format(row[2]) + slack);
                }
            } catch (e) { LOG("    (simProbeGates threw: " + e.message + ")"); }
        }
    }
    if (TRACE && events.firstPrestige[l] === undefined) {
        const L = LAYERS[l];
        const base = (typeof L.baseAmount === "function") ? L.baseAmount() : player.points;
        LOG("  trace " + l + " @ " + t.toFixed(1) + " s: base=" + global.format(base) +
            " requires=" + global.format(reqOf(l)) + " gainMult=" + global.format(layerGainMult(l)) +
            " exp=" + (L.exponent || 0.5) + " -> gain=" + global.format(g) +
            "  (points before=" + global.format(player[l].points) + ")");
    }
    /* Engine fidelity (game.js doReset order): onPrestige(gain) runs BEFORE the gain is
     * banked; resetsNothing() short-circuits AFTER banking and BEFORE the root currency is
     * zeroed and the cascade runs (game.js:211). Skipping either line makes the port harsher
     * than the engine and masks the game's real behavior (found live on The Smallpox Tree:
     * var autoPrestige+resetsNothing was simulated as wiping cases every tick, so the row-2
     * statics never unlocked and the run reported a false DID-NOT-REACH). */
    if (typeof LAYERS[l].onPrestige === "function") { try { LAYERS[l].onPrestige(g); } catch (_) {} }
    player[l].points = player[l].points.add(g);
    if (player[l].best === undefined || player[l].points.gt(player[l].best)) player[l].best = player[l].points;
    if (player[l].total === undefined) player[l].total = new Decimal(0);
    player[l].total = player[l].total.add(g);
    if (LAYERS[l].resetsNothing && LAYERS[l].resetsNothing()) return true;
    /* The engine zeroes the ROOT currency on every prestige (game.js doReset:
     * `player.points = (row == 0 ? 0 : getStartPoints())`) — the gain is measured against
     * a base the player has to earn back, so skipping this line hands the sim free income. */
    player.points = (LAYERS[l].row === 0) ? new Decimal(0) : START_POINTS;
    cascade(LAYERS[l].row, l);
    return true;
}
// ADAPT: generic reset cascade — rows below the resetting layer are wiped with the
// layer's own doReset() keep list when it defines one, else the engine default.
function cascade(fromRow, except) {
    for (const id of layerOrder) {
        const L = LAYERS[id];
        if (typeof L.row !== "number" || L.row >= fromRow) continue;
        if (LAYERS[except] && LAYERS[except].resetsNothing && LAYERS[except].resetsNothing()) continue;
        try { if (L.doReset) L.doReset(except); else global.layerDataReset(id); } catch (_) { /* keep going */ }
    }
}

// ---- purchases -------------------------------------------------------------
const poolFor = (l, obj) => (obj.currencyLayer ? player[obj.currencyLayer][obj.currencyInternalName || "points"] : player[l].points);
function tryBuyUpgrades(l) {
    let bought = 0;
    const ups = LAYERS[l].upgrades || {};
    for (const id of Object.keys(ups)) {
        const u = ups[id];
        if (!u || typeof u !== "object") continue;
        if (player[l].upgrades.includes(Number(id))) continue;
        u.layer = l; u.id = Number(id);
        if (u.unlocked && !u.unlocked()) continue;
        if (typeof u.cost === "undefined") continue;                       // free ritual upgrades
        if (poolFor(l, u).lt(u.cost)) continue;
        if (u.pay) { try { u.pay(); } catch (_) { continue; } }            // layer owns its own payer
        else if (u.currencyLayer) {
            const nm = u.currencyInternalName || "points";
            player[u.currencyLayer][nm] = player[u.currencyLayer][nm].sub(u.cost);
        } else player[l].points = player[l].points.sub(u.cost);
        player[l].upgrades.push(Number(id));
        player[l].upgrades.sort((a, b) => a - b);
        try { if (u.onPurchase) u.onPurchase(u.cost); } catch (_) {}
        bought++;
    }
    return bought;
}
function tryBuyBuyables(l) {
    let bought = 0;
    for (const id of Object.keys(LAYERS[l].buyables || {})) {
        const b = LAYERS[l].buyables[id];
        if (!b || typeof b !== "object") continue;
        if (b.unlocked && !b.unlocked()) continue;
        const have = global.getBuyableAmount(l, id);
        b.layer = l; b.id = Number(id);
        let cost;
        try { cost = b.cost(have); } catch (_) { continue; }
        if (!cost || cost.lte(0)) continue;
        if (poolFor(l, b).lt(cost)) continue;
        player[l].points = player[l].points.sub(cost);                     // ADAPT: overridden payers
        global.setBuyableAmount(l, id, have.add(1));
        bought++;
    }
    return bought;
}
function updateMilestones() {
    let n = 0;
    for (const id of layerOrder) {
        for (const mid of Object.keys(LAYERS[id].milestones || {})) {
            if (hasMilestone(id, mid)) continue;
            const m = LAYERS[id].milestones[mid];
            m.layer = id; m.id = Number(mid);
            try { if (!m.done()) continue; } catch (_) { continue; }
            player[id].milestones.push(Number(mid));
            player[id].milestones.sort((a, b) => a - b);
            if (LAYERS[id].unlocked) player[id].unlocked = true;
            try { if (m.onComplete) m.onComplete(); } catch (_) {}
            n++;
        }
    }
    return n;
}
// layers become visible/unlocked when the engine's layerShown/layerUnlocked says so
function refreshUnlocks() {
    for (const id of layerOrder) {
        const L = LAYERS[id];
        if (L.leftTab) continue;
        try {
            if (typeof L.layerShown !== "function" || L.layerShown() || (L.layerUnlocked && L.layerUnlocked())) player[id].unlocked = true;
        } catch (_) {}
    }
}

// ---- browser handoff (--save-at) --------------------------------------------
let saveDumped = false, saveAtPath = null;
/* Serializes the sim's player EXACTLY as the engine saves it (js/utils/save.js:7):
 * localStorage[modID] = btoa(unescape(encodeURIComponent(JSON.stringify(player)))).
 * load() is Object.assign(getStartPlayer(), parsed) + fixSave(), so a partial,
 * engine-shaped save is legal — every field the sim does not track is filled from the
 * start player, and Decimal.toJSON() (= toString) round-trips through fixData's
 * new Decimal(...) wherever the start player holds a Decimal. */
function dumpSaveAt() {
    saveDumped = true;   // set FIRST — a throw below must not re-trigger the dump next tick
    const info = global.modInfo || {};
    const modId = (info.id !== undefined && info.id !== null) ? info.id
        : String(info.name || "game").replace(/\s+/g, "-") + "-" + String(info.author || "ai").replace(/\s+/g, "-");   // save.js getModID fallback
    const b64 = Buffer.from(JSON.stringify(player), "utf8").toString("base64");
    const line = 'localStorage.setItem(' + JSON.stringify(modId) + ', ' + JSON.stringify(b64) + '); location.reload();';
    saveAtPath = path.join(game, "tools", "save-at-" + SAVE_AT + ".js");
    fs.mkdirSync(path.dirname(saveAtPath), { recursive: true });
    fs.writeFileSync(saveAtPath, line + "\n");
    LOG("  --save-at " + SAVE_AT + " @ " + (t / 3600).toFixed(2) + " h: entry save written to " + path.relative(process.cwd(), saveAtPath));
    LOG("    serve the game (tools/serve.js), open it, paste that file's one line into the");
    LOG("    browser console, and the page reloads into the moment " + SAVE_AT + " unlocks.");
    LOG("    WAIT ONE FRAME after the reload before asserting anything — tmp recomputes per");
    LOG("    frame. In an automated browser, run setItem and the reload as TWO separate steps");
    LOG("    (an in-script location.reload() raced the 5 s autosave in testing). This save is");
    LOG("    for interaction testing, never a pacing verdict.");
}

// ---- the run ---------------------------------------------------------------
const STEP = DT;
const events = { firstPurchase: null, firstPrestige: {}, firstMilestone: {}, unlocks: {} };
const lastPress = {};   // per layer: the last simulated second the policy pressed its button
const updateThrew = {}; // per layer: update() threw at least once (reported once, never swallowed)
let t = 0, peakIncome = new Decimal(0), peakAt = 0;
const tick = () => {
    // base currency
    let gen;
    try { gen = global.getPointGen(); } catch (_) { gen = new Decimal(0); }
    if (gen && gen.gt(0)) player.points = player.points.add(gen.times(DT));
    if (gen && gen.gt(peakIncome)) { peakIncome = gen; peakAt = t; }
    // per-layer passive generation + custom ticks
    for (const id of layerOrder) {
        const L = LAYERS[id];
        if (typeof L.update === "function") {
            /* The engine passes a NUMERIC diff to update() (game.js:353 `layers[layer].update(diff)`).
             * Handing a Decimal here once masked a per-frame crash: the layer called diff.times(),
             * which only exists on a Decimal — the real browser threw every tick while the sim ran
             * clean (The Smallpox Tree §12 #2). So: numeric diff, and a throw is reported once,
             * never silently swallowed. */
            try { L.update(DT); }
            catch (e) {
                if (!updateThrew[id]) {
                    updateThrew[id] = true;
                    LOG("  !! layer " + id + " update() threw: " + e.message +
                        "\n     The engine hands update() a NUMERIC diff — normalize with new Decimal(diff) before" +
                        "\n     calling any method on it (static rule D-DIFFNUM catches this before the sim does).");
                }
            }
        }
        if (typeof L.passiveGeneration === "function") {
            try {
                const rate = L.passiveGeneration();
                if (typeof rate === "number" && rate > 0) {
                    if (isPrestige(id)) player[id].points = player[id].points.add(gainOf(id).times(rate).times(DT));
                    else if (L.baseResource) player[id].points = player[id].points.add(player[L.baseResource].points.times(rate).times(DT));
                }
            } catch (_) {}
        }
        if (LAYERS[id].canBuyMax && LAYERS[id].canBuyMax()) { /* static buy-max handled by gainOf */ }
    }
    updateMilestones();
    refreshUnlocks();
    if (SAVE_AT !== null && !saveDumped && player[SAVE_AT] && player[SAVE_AT].unlocked) dumpSaveAt();
    if (saveDumped) return;
    for (const id of layerOrder) if (LAYERS[id].type) { tryBuyUpgrades(id); tryBuyBuyables(id); }
    // prestige greedily, deepest row first so cascades settle
    for (const id of [...layerOrder].sort((a, b) => (LAYERS[b].row || 0) - (LAYERS[a].row || 0))) {
        if (t - (lastPress[id] === undefined ? -Infinity : lastPress[id]) < CLICK) continue;   // one press per layer per --click
        if (canPrestige(id) && doPrestige(id)) {
            lastPress[id] = t;
            if (!events.firstPrestige[id]) events.firstPrestige[id] = +t.toFixed(1);
            updateMilestones();
        }
    }
    t += STEP;
    if (TRACE_EVERY > 0 && t % TRACE_EVERY < STEP) {
        const cells = layerOrder.map((id) => id + "=" + global.format(player[id].points) +
            (isPrestige(id) ? "/" + global.format(gainOf(id)) : "")).join(" ");
        LOG("  t=" + t.toFixed(0) + "s  " + LAYERS[layerOrder[0]].baseResource() + "=" +
            global.format(player.points) + " @" + global.format(gen || new Decimal(0)) + "/s   " + cells);
    }
};
const started = Date.now();
while (t < MAXH * 3600) {
    tick();
    if (saveDumped) break;   // --save-at ends the run at the snapshot tick
    const bought = layerOrder.reduce((n, id) => n + (player[id].upgrades.length || 0), 0);
    if (events.firstPurchase === null && bought > 0) events.firstPurchase = +t.toFixed(2);
    try { if (ENDGAME()) break; } catch (_) {}
    if (Date.now() - started > BUDGET) { LOG("(stopped at the " + Math.round(BUDGET / 1000) + " s wall-clock budget)"); break; }
}
if (SAVE_AT !== null && !saveDumped) LOG("  !! --save-at " + SAVE_AT + ": the layer never unlocked within the run — no save dumped.");
for (const id of layerOrder) if (player[id].milestones.length) events.firstMilestone[id] = player[id].milestones.slice();

// ---- report ---------------------------------------------------------------
const hours = t / 3600;
let reached = false;
try { reached = !!ENDGAME(); } catch (_) {}
const report = {
    game, reachedEndgame: reached, totalHours: +hours.toFixed(2),
    firstPurchaseSeconds: events.firstPurchase,
    firstPrestigeSeconds: events.firstPrestige,
    peakIncome: global.format(peakIncome), peakAtSeconds: +peakAt.toFixed(1),
    clickSeconds: CLICK, dtSeconds: DT,
    layers: layerOrder.length,
    upgradesBought: layerOrder.reduce((n, id) => n + player[id].upgrades.length, 0),
    milestonesEarned: layerOrder.reduce((n, id) => n + player[id].milestones.length, 0),
    saveAt: saveDumped ? path.basename(saveAtPath) : null,
    simIsLowerBound: true,
};
if (asJson) { console.log(JSON.stringify(report, null, 2)); }
else {
    LOG("simulate: " + path.basename(game) + " — " + report.layers + " layer(s)");
    LOG("  policy                   : buy instantly, one prestige press per layer per " + CLICK + " s (step " + DT + " s)");
    LOG("  first affordable purchase : " + (report.firstPurchaseSeconds === null ? "never" : report.firstPurchaseSeconds + " s") + "   (author rule: < 10 s)");
    LOG("  first prestige by layer   : " + (Object.keys(events.firstPrestige).length ? JSON.stringify(events.firstPrestige) : "none"));
    LOG("  peak income              : " + report.peakIncome + " at " + report.peakAtSeconds + " s");
    LOG("  upgrades / milestones    : " + report.upgradesBought + " / " + report.milestonesEarned);
    LOG("  total to isEndgame()     : " + hours.toFixed(2) + " h" + (saveDumped ? "  (run cut short by --save-at — not a pacing run)" : reached ? "" : "  (DID NOT REACH — check the endgame target vs the production curve)"));
    if (reached && hours < 0.1)
        LOG("  !! NOT CALIBRATED: finishing this fast means the generic policy out-prestiged the\n" +
            "     game's own guards. The early timeline above is still valid; the total is not.\n" +
            "     Wire the ADAPT points, then fit the policy to one known playthrough value.");
    LOG("");
    LOG("  This is a LOWER BOUND: no challenge rewards, no achievements, no clickables,");
    LOG("  no human dithering. Rebalance the BRIEF, then re-run — never hand-tune the code.");
}
