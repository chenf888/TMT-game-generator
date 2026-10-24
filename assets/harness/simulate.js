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
/* the value after a flag is not a path; when the flag is absent there is no such index, so the
 * guards must not become 0 — that would eat the game folder argument. */
const FLAG_VALUE_IDX = new Set([maxHoursIdx, dtIdx, budgetIdx, clickIdx, traceEveryIdx].filter((i) => i >= 0).map((i) => i + 1));
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
const push = (f) => { if (f && !files.includes(f) && !ENGINE.test(f) && !/tree\.js$/.test(f)) files.push(f); };
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
const canPrestige = (l) => isPrestige(l) && gainOf(l).gte(1) && (typeof LAYERS[l].canReset !== "function" || LAYERS[l].canReset());
function doPrestige(l) {
    const g = gainOf(l);
    if (g.lt(1)) return false;
    if (TRACE && events.firstPrestige[l] === undefined) {
        const L = LAYERS[l];
        const base = (typeof L.baseAmount === "function") ? L.baseAmount() : player.points;
        LOG("  trace " + l + " @ " + t.toFixed(1) + " s: base=" + global.format(base) +
            " requires=" + global.format(reqOf(l)) + " gainMult=" + global.format(layerGainMult(l)) +
            " exp=" + (L.exponent || 0.5) + " -> gain=" + global.format(g) +
            "  (points before=" + global.format(player[l].points) + ")");
    }
    player[l].points = player[l].points.add(g);
    if (player[l].best === undefined || player[l].points.gt(player[l].best)) player[l].best = player[l].points;
    if (player[l].total === undefined) player[l].total = new Decimal(0);
    player[l].total = player[l].total.add(g);
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

// ---- the run ---------------------------------------------------------------
const STEP = DT;
const events = { firstPurchase: null, firstPrestige: {}, firstMilestone: {}, unlocks: {} };
const lastPress = {};   // per layer: the last simulated second the policy pressed its button
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
        if (typeof L.update === "function") { try { L.update(new Decimal(DT)); } catch (_) {} }
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
    const bought = layerOrder.reduce((n, id) => n + (player[id].upgrades.length || 0), 0);
    if (events.firstPurchase === null && bought > 0) events.firstPurchase = +t.toFixed(2);
    try { if (ENDGAME()) break; } catch (_) {}
    if (Date.now() - started > BUDGET) { LOG("(stopped at the " + Math.round(BUDGET / 1000) + " s wall-clock budget)"); break; }
}
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
    LOG("  total to isEndgame()     : " + hours.toFixed(2) + " h" + (reached ? "" : "  (DID NOT REACH — check the endgame target vs the production curve)"));
    if (reached && hours < 0.1)
        LOG("  !! NOT CALIBRATED: finishing this fast means the generic policy out-prestiged the\n" +
            "     game's own guards. The early timeline above is still valid; the total is not.\n" +
            "     Wire the ADAPT points, then fit the policy to one known playthrough value.");
    LOG("");
    LOG("  This is a LOWER BOUND: no challenge rewards, no achievements, no clickables,");
    LOG("  no human dithering. Rebalance the BRIEF, then re-run — never hand-tune the code.");
}
