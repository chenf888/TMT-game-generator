/* =============================================================================
 * smoke.js — TMT load-time harness (bundled with the tmt-game-generator skill, stage 5.5).
 *
 * WHY THIS EXISTS
 *   static_checks.js reads the source as TEXT. It cannot tell you that a file
 *   throws while loading, that two layers share an id, that a startData() breaks
 *   the contract, or that a formula returns NaN. All four were real defects in
 *   generated games, and all four are invisible until the page is opened.
 *   This harness loads the REAL mod files in Node with engine stubs and asserts
 *   them, so the first browser open is not the first test.
 *
 * USAGE
 *   node assets/harness/smoke.js <game-folder> [--json]
 *   Copy it into <game>/tools/smoke.js and run `node tools/smoke.js` from there.
 *
 * SCOPE (deliberate)
 *   It does NOT port the engine's economy — use simulate.js for pacing.
 *   It checks: load order, load-time throws, duplicate ids, startData contract,
 *   modFiles completeness, component shape, and NaN/undefined in the hooks it can
 *   call safely with a zeroed player.
 *
 * NOTE: deliberately NOT strict mode — function declarations must leak between
 * evals exactly like <script> globals in the browser.
 * ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const game = path.resolve(args.filter((a) => !a.startsWith("--"))[0] || path.join(__dirname, "..", ".."));
if (!fs.existsSync(path.join(game, "js", "mod.js"))) {
    console.error("no js/mod.js under " + game + " — pass the game folder as the first argument");
    process.exit(2);
}

const findings = [];
const fail = (rule, msg) => findings.push({ level: "FAIL", rule, msg });
const warn = (rule, msg) => findings.push({ level: "WARN", rule, msg });
const info = (msg) => { if (!asJson) console.log(msg); };

// --- Decimal ---------------------------------------------------------------
// Normally the game's own vendored copy. A bare fixture (or a game whose engine files
// were pruned) falls back to the copy bundled with the skill's template, so the harness
// never reports an infrastructure error where it should report a game error.
const decimalCandidates = [
    path.join(game, "js", "technical", "break_eternity.js"),
    path.join(__dirname, "..", "..", "template", "js", "technical", "break_eternity.js"),
];
const decimalPath = decimalCandidates.find((p) => fs.existsSync(p));
if (!decimalPath) {
    console.error("no break_eternity.js found in the game or in the bundled template");
    process.exit(2);
}
const Decimal = require(decimalPath);
if (typeof Decimal !== "function") {
    console.error("break_eternity.js did not export a Decimal constructor");
    process.exit(2);
}

// --- engine stubs ----------------------------------------------------------
global.window = global;
global.Decimal = Decimal;
global.format = (x) => (x && x.toString ? x.toString() : String(x));
global.formatWhole = (x) => (x && x.floor ? x.floor().toString() : String(x));
global.formatTime = (s) => String(s);
global.formatSmall = global.format;
const FALSE = () => false;
["hasUpgrade", "hasMilestone", "hasAchievement", "hasChallenge", "inChallenge",
 "maxedChallenge", "canReset", "hasTree", "isBuyableAffordable"].forEach((fn) => { global[fn] = FALSE; });
global.challengeEffect = () => new Decimal(1);
global.TREE_LAYERS = [];
global.UP = 0; global.DOWN = 1; global.LEFT = 2; global.RIGHT = 3;
global.softcap = (v, cap, p) => (v.gt(cap) ? v.pow(p).times(cap.pow(1 - p)) : v);
global.doReset = () => {};
global.layerDataReset = () => {};
global.addNode = () => {};
global.getBuyableAmount = (l, id) => (player[l].buyables[id] || new Decimal(0));
// engine write-helpers that live layer update()/action code calls. Stubbed, not
// simulated: this harness answers "does it throw?", simulate.js answers "does it pace?".
global.addPoints = () => new Decimal(0);
global.addPointsNoReturn = () => {};
global.addResource = () => {};
global.setBuyableAmount = (l, id, v) => { player[l].buyables[id] = v; };
global.buyUpgrade = () => {};
global.buyBuyable = () => {};
global.upgradeEffect = (l, id) => new Decimal(1);
global.buyableEffect = (l, id) => new Decimal(1);
global.challengeCompletions = () => new Decimal(0);
global.completeChallenge = () => {};
global.getPointGen = () => new Decimal(1);
global.run = (fn) => (typeof fn === "function" ? fn() : undefined);
global.canBuy = () => false;
global.canAfford = () => false;
global.formatGain = global.format;
global.formatWholeGain = global.formatWhole;
global.softcapHTML = (x) => x;

const LAYERS = {};
const order = [];
global.addLayer = function (id, def) {
    if (typeof id !== "string" || !id) { fail("S-ID", "addLayer with a non-literal id — the layer is invisible to every tool"); return; }
    if (LAYERS[id]) fail("S-DUPID", 'duplicate layer id "' + id + '" — the later definition is dropped by the engine');
    if (!def || typeof def !== "object") { fail("S-FACTORY", 'addLayer("' + id + '", …) second argument is not an object literal — the layer cannot be inspected'); return; }
    if (typeof def.startData === "function") {
        let sd;
        try { sd = def.startData(); } catch (e) { fail("S-STARTDATA", id + ": startData() threw — " + e.message); }
        if (sd) {
            if (!("unlocked" in sd)) fail("S-STARTDATA", id + ": startData() has no `unlocked`");
            if (!sd.points || typeof sd.points.add !== "function") fail("S-STARTDATA", id + ": startData().points is not a Decimal");
            for (const k of Object.keys(sd)) {
                if (k === "unlocked") continue;
                if (sd[k] === undefined) warn("S-STARTDATA", id + ": startData()." + k + " is undefined");
            }
        }
    } else if (id !== "tree-tab" && !def.leftTab) {
        fail("S-NOSTARTDATA", id + ": no startData() — NaN cascades on first load");
    }
    LAYERS[id] = def;
    // Stub fidelity (14 §2): the engine's setupLayer tags the definition with its own id
    // (03 §2 "layer is assigned automagically"); layer-level hooks read this.layer.
    if (!("layer" in def)) def.layer = id;
    order.push(id);
};
const compStub = () => ({ cost: new Decimal(1), effect: new Decimal(1), amount: new Decimal(0), unlocked: true, canComplete: () => false });
const layerStub = () => new Proxy({}, { get(t, k) {
    if (k === "buyables" || k === "upgrades" || k === "challenges" || k === "milestones" || k === "clickables") return new Proxy({}, { get: () => compStub() });
    return new Decimal(1);
}});
global.tmp = new Proxy({}, { get: () => layerStub() });

// --- which files, in which order -------------------------------------------
// index.html's local <script src> order is the truth: a lang/text layer must load
// before mod.js, and the technical/ + utils/ + game.js + components.js files are
// the engine (already stubbed above, and never re-executed here).
const ENGINE = /^js\/(technical|utils)\/|^js\/(game|components|utils)\.js$|^js\/Demo\//;
const html = fs.readFileSync(path.join(game, "index.html"), "utf8");
const htmlScripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((s) => !/^https?:|^\/\//.test(s))
    .map((s) => s.replace(/^\.?\//, ""))
    .filter((s) => s.startsWith("js/") && !ENGINE.test(s));

const modSrc = fs.readFileSync(path.join(game, "js", "mod.js"), "utf8");
const mf = modSrc.match(/modFiles\s*:\s*\[([\s\S]*?)\]/);
const modFiles = mf ? [...mf[1].matchAll(/["']([^"']+)["']/g)].map((m) => "js/" + m[1]) : [];
if (!mf) fail("S-MODFILES", "modInfo.modFiles not found (or not a literal array) in js/mod.js");

const files = [];
const push = (f) => { if (f && !files.includes(f) && !ENGINE.test(f)) files.push(f); };
htmlScripts.filter((f) => /\/lang\//.test(f)).forEach(push);   // text layer first
push("js/mod.js");
modFiles.forEach(push);
htmlScripts.forEach(push);
files.forEach((f) => { if (!fs.existsSync(path.join(game, f))) fail("S-MISSING", f + " does not exist (listed in modFiles / index.html)"); });

const loadable = files.filter((f) => fs.existsSync(path.join(game, f)) && !/tree\.js$/.test(f));
for (const f of loadable) {
    const code = fs.readFileSync(path.join(game, f), "utf8").replace(/\b(?:const|let)\s+(?=[A-Za-z_$])/g, "var ");
    try { (0, eval)(code); }
    catch (e) { fail("S-LOAD", f + " threw at load: " + e.message); }
}

// --- modInfo / wiring sanity ----------------------------------------------
if (order.length === 0) fail("S-NOLAYER", "no addLayer() call executed — every file failed to load or modFiles is empty");

// --- build a mock player from the real startData() ------------------------
// Every layer starts UNLOCKED so that its hooks actually execute: a hook that
// throws only when the layer is reachable is exactly the defect we are hunting.
const mockPlayer = {};
for (const id of order) {
    let sd = {};
    try { sd = LAYERS[id].startData ? LAYERS[id].startData() : {}; } catch (_) { sd = {}; }
    mockPlayer[id] = Object.assign({}, sd, {
        unlocked: true,
        upgrades: [],
        milestones: [],
        challenges: [],
        buyables: sd.buyables || {},
        clickables: sd.clickables || {},
    });
    if (!mockPlayer[id].points || typeof mockPlayer[id].points.add !== "function") mockPlayer[id].points = new Decimal(0);
}
global.player = mockPlayer;
// the engine merges mod.js's addedPlayerData() into the save root; do the same,
// or every hook that reads a global counter (player.truthBest, player.erasSeen…)
// throws against the mock and reports a phantom defect.
if (typeof global.addedPlayerData === "function") {
    try { Object.assign(global.player, global.addedPlayerData()); }
    catch (e) { fail("S-ADDEDDATA", "addedPlayerData() threw at load: " + e.message); }
}
global.player.points = global.player.points || new Decimal(10);
for (const k of order) if (!global.player[k]) global.player[k] = mockPlayer[k];
// the engine exposes the layer registry as `layers`; doReset hooks and update() read it
global.layers = LAYERS;

// --- exercise the hooks ---------------------------------------------------
for (const id of order) {
    const L = LAYERS[id];
    const probe = (name) => {
        if (typeof L[name] !== "function") return;
        try {
            // Stub fidelity (14 §2): the engine invokes layer-level hooks as method calls on the
            // layer definition (game.js getResetGain/getNextAt: layers[layer].getResetGain();
            // temp.js updateTempData: layerData[item]()), so this === the definition. A bare
            // {layer,id} stub here made custom layers' this.gainMult() a phantom throw.
            const v = L[name].call(L);
            if (v === undefined) fail("S-UNDEF", id + "." + name + "() returned undefined");
            else if (v !== null && typeof v.toString === "function" && /NaN/.test(v.toString())) fail("S-NAN", id + "." + name + "() returned NaN");
        } catch (e) { fail("S-HOOKTHROW", id + "." + name + "() threw with a fresh save: " + e.message); }
    };
    probe("gainMult"); probe("gainExp"); probe("passiveGeneration"); probe("resetsNothing");
    probe("autoPrestige"); probe("autoUpgrade"); probe("layerShown"); probe("baseAmount");
    probe("getResetGain"); probe("getNextAt"); probe("canReset");
    if (typeof L.update === "function") {
        try { L.update(new Decimal(0.05)); }
        catch (e) { fail("S-UPDATETHROW", id + ".update(diff) threw with a fresh save: " + e.message); }
    }
    if (["normal", "static", "custom"].includes(L.type)) {
        if (typeof L.baseAmount !== "function") fail("S-PRESTIGE", id + " (type " + L.type + ") has no baseAmount()");
        if (L.requires === undefined) fail("S-PRESTIGE", id + " (type " + L.type + ") has no requires");
    }
    if (L.type === "static" && typeof L.canBuyMax !== "function")
        warn("S-STATICMAX", id + ": static layer with no canBuyMax() — banks exactly one floor per prestige");
    const n = (o) => Object.keys(o || {}).length;
    const comps = n(L.upgrades) + n(L.buyables) + n(L.milestones) + n(L.challenges) +
                  n(L.clickables) + n(L.achievements) + n(L.bars) + (L.grid ? 1 : 0);
    const isSide = L.leftTab || L.isSide === true || String(L.row) === "side";
    if (comps === 0 && !isSide) warn("S-EMPTY", id + ": layer defines no content components at all");
}

// --- report ---------------------------------------------------------------
const fails = findings.filter((f) => f.level === "FAIL");
const warns = findings.filter((f) => f.level === "WARN");
if (asJson) {
    console.log(JSON.stringify({ game, layers: order, findings }, null, 2));
} else {
    console.log("smoke: " + loadable.length + " mod file(s), " + order.length + " layer(s) loaded");
    for (const f of findings) console.log("  [" + f.level + "] " + f.rule + " — " + f.msg);
    console.log("summary: " + fails.length + " FAIL, " + warns.length + " WARN");
    if (!fails.length) console.log("load-time smoke test clean.");
}
process.exit(fails.length ? 1 : 0);
