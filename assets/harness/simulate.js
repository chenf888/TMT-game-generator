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
 * USAGE
 *   node assets/harness/simulate.js <game-folder> [--max-hours 200] [--json]
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
const game = path.resolve(argv.filter((a, i) => !a.startsWith("--") && i !== maxHoursIdx + 1)[0] || path.join(__dirname, "..", ".."));
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
    const saved = { unlocked: player[l].unlocked };
    ["points"].concat(keep).forEach((k) => { saved[k] = player[l][k]; });
    player[l].points = sd.points;
    player[l].upgrades = [];
    player[l].buyables = {};
    player[l].milestones = [];
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
player.points = new Decimal(10);
if (typeof global.addedPlayerData === "function") Object.assign(player, global.addedPlayerData());
global.player = player;
global.getPointGen = global.getPointGen || (() => new Decimal(1));
const ENDGAME = typeof global.isEndgame === "function" ? global.isEndgame : () => false;

// ---- engine-formula port (mirrors js/game.js) ------------------------------
const layerSoftcap = (l) => (LAYERS[l].softcap ? LAYERS[l].softcap() : new Decimal("e1e7"));
const layerSoftcapPower = (l) => (LAYERS[l].softcapPower ? LAYERS[l].softcapPower() : new Decimal(0.5));
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
    if (player.points.lt(rm)) return new Decimal(0);
    let g = player.points.div(rm).pow(L.exponent || 0.5).times(layerGainMult(l)).pow(layerGainExp(l));
    const sc = layerSoftcap(l);
    if (g.gte(sc)) g = g.pow(layerSoftcapPower(l)).times(sc.pow(new Decimal(1).sub(layerSoftcapPower(l))));
    return g.floor().max(0);
}
const canPrestige = (l) => isPrestige(l) && gainOf(l).gte(1) && (typeof LAYERS[l].canReset !== "function" || LAYERS[l].canReset());
function doPrestige(l) {
    const g = gainOf(l);
    if (g.lt(1)) return false;
    player[l].points = player[l].points.add(g);
    if (player[l].best === undefined || player[l].points.gt(player[l].best)) player[l].best = player[l].points;
    if (player[l].total === undefined) player[l].total = new Decimal(0);
    player[l].total = player[l].total.add(g);
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
const DT = 0.1, STEP = 0.1;
const events = { firstPurchase: null, firstPrestige: {}, firstMilestone: {}, unlocks: {} };
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
        if (canPrestige(id) && doPrestige(id)) {
            if (!events.firstPrestige[id]) events.firstPrestige[id] = +t.toFixed(1);
            updateMilestones();
        }
    }
    t += STEP;
};
const started = Date.now();
while (t < MAXH * 3600) {
    tick();
    const bought = layerOrder.reduce((n, id) => n + (player[id].upgrades.length || 0), 0);
    if (events.firstPurchase === null && bought > 0) events.firstPurchase = +t.toFixed(2);
    try { if (ENDGAME()) break; } catch (_) {}
    if (Date.now() - started > 120000) { LOG("(stopped at the 120 s wall-clock budget)"); break; }
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
    layers: layerOrder.length,
    upgradesBought: layerOrder.reduce((n, id) => n + player[id].upgrades.length, 0),
    milestonesEarned: layerOrder.reduce((n, id) => n + player[id].milestones.length, 0),
    simIsLowerBound: true,
};
if (asJson) { console.log(JSON.stringify(report, null, 2)); }
else {
    LOG("simulate: " + path.basename(game) + " — " + report.layers + " layer(s)");
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
