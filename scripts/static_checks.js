#!/usr/bin/env node
/*
 * static_checks.js — post-generation static checks for a TMT game folder.
 *
 * Usage:
 *   node static_checks.js <game-folder> [--json]
 *
 * Exit code: 1 if any FAIL finding, else 0. WARNs must be individually accepted
 * with a written reason in the design brief (SKILL.md Stage 5 policy).
 *
 * Rules (ids, levels, provenance):
 *   Hard rules (07-Pitfalls Part A/B, FAIL unless noted):
 *     M-INFO        modInfo object parseable in js/mod.js
 *     M-ID          modInfo.id present (07 rule 3: keys the savefile)
 *     M-FIELDS      modInfo.name / author / pointsName present
 *     M-VER         VERSION present
 *     M-LOG         changelog present
 *     M-WIN         winText present
 *     M-END         isEndgame() present;  M-END-PLACEHOLDER (WARN) template placeholder still in place
 *     M-POINTGEN    getPointGen() present
 *     M-DNC         (WARN) doNotCallTheseFunctionsEveryTick declared
 *     M-FILES       every modInfo.modFiles entry exists on disk
 *     M-UNREG       a modder-scope js file defines addLayer/addNode but is not in modFiles (07 rule 2)
 *     M-VERCMP      (WARN) VERSION.num is unsafe for the engine's STRING comparison (utils/save.js:301):
 *                   a component >= 10 sorts below a single-digit one ("0.10" < "0.9"), and a num
 *                   below what the changelog documents is a downgrade that rewrites every save it
 *                   opens and skips fixOldSave()
 *     C-MOD         `.mod(` call — this engine's Decimal has no .mod (07 Part A 1)
 *     C-RESETBUY    `resetBuyables(` — nonexistent engine function, official-demo bug (07 Part B)
 *     C-EXPANTA     `ExpantaNum` reference — framework-swap mod code copied into a standard game (09 §6)
 *     C-RAWNUM      raw number where a Decimal belongs: cost/requires/purchaseLimit/initialStartPoints (07 Part B)
 *     C-NATIVEOPS   (WARN) native operator applied to a player currency (07 Part A 1)
 *   Design assertions (09 §5 anti-patterns + phase-④ incidents):
 *     D-DUPID       duplicate layer/node id
 *     D-STARTDATA   every real layer's startData() has unlocked + points as new Decimal (07 rule 6)
 *     D-PRESTIGE    normal/static layers have baseResource + baseAmount() + requires (07 rule 7)
 *     D-ROWMISSING  main rows not contiguous from 0 (09 A2 — The Tree of Vote incident)
 *     D-ROW-UNSET   (WARN) main layer without a row property
 *     D-REQLADDER   requires ladder decreases as rows deepen (09 A1 — The Click Tree incident)
 *     D-REQRATIO    (WARN) adjacent-row requires ratio outside the measured x10–x100 band (09 §4 / P2)
 *     D-DUPKEY      same layer-level property defined twice in one addLayer (silent last-wins bug)
 *     D-AUTOCOLLIDE (WARN) two strings in one layer both claim the same automation grant
 *                   (Mario Maker 2 Tree "//冲突点位" incident; 09 P4/P17)
 *     D-PUSHGUARD   (WARN) achievements-backfill .push() without a !has* idempotence guard (09 P11)
 *     D-BRANCH      branches edge points at a nonexistent layer/node id
 *     B-DEPRECATED  (WARN) deprecated features: challenge goal:, goalTooltip/doneTooltip (07 Part B)
 *   Fun-density assertions (handbook 10 §2/§3/§5; phase-⑤b; thresholds in assets/fun-quota.json):
 *     D-EFFECTMONO  (WARN) main layer with >=8 upgrades where >60% are flat multipliers
 *                   (inline constant effect or externally-wired no-effect upgrades) — 10 §2
 *     D-MICROTABS   content items without tabFormat/microtabs: >=16 FAIL, >=10 WARN — 10 §3
 *     D-MECHQUOTA   (WARN) game with >=4 main layers and zero challenges/clickables/bars/grids
 *                   anywhere — 10 §5 mechanic floor
 *     D-NOUPDATE    (WARN) game with >=4 main layers and no update() tick logic — 10 §5
 *   Phase-⑥ second validation (2026-10-02, The Yeast Tree):
 *     M-CHARSET     (WARN) index.html without a charset meta — theme glyphs (×, —, emoji)
 *                   garble on servers that default to latin-1 (the template ships without one)
 *     C-CONTENT1ELEM  1-element content arrays like ["upgrades"] render as NOTHING — the engine's
 *                   row/column content renderer handles bare strings and 2/3-element arrays only
 *   Phase-⑦ negative-example rules (2026-10-02 second pass, The Yeast Tree as the bad specimen):
 *     N-ACHVIS      (FAIL) achievementStyle() hides uncompleted achievements with
 *                   visibility:hidden (stock engine default) — always show them, dimmed
 *     N-UNLOCKDEAD  (FAIL) layers gate layerShown() on player[X].unlocked but no mod file
 *                   defines any onPurchase — the tree dead-ends after layer 1
 *     N-UNLOCKTEXT  (WARN) an upgrade whose text promises "Unlock X" (and is not a
 *                   buyable/tab ticket) has neither onPurchase nor a layerShown hasUpgrade ref
 *     N-CAPMULT     (FAIL) a cap-valued upgrade effect (softcap/tolerance constants) is wired
 *                   into getPointGen() — multiplies the base currency by ~1e12+ (y-22 incident)
 *     N-SELFTOTAL   (FAIL ≥1 / WARN ≥0.75) Σ self-scaling exponents a layer wires into its own
 *                   gainMult via player[this.layer].points.pow(p) effects — Σp ≥ 1 compounds
 *                   superlinearly per prestige and explodes within the layer (y summed 1.25)
 *     N-PGBOOL      (WARN) passiveGeneration() returns a bare boolean. The docs promise a plain
 *                   NUMBER: stock v2.7 only coerces true→1 via a temp.js normalization line, and
 *                   new Decimal(true) is ZERO — so forks or custom code reading
 *                   tmp[layer].passiveGeneration as a Decimal silently zero it. Decimals are also
 *                   wrong here: game.js does diff * passiveGeneration, which is NaN for objects.
 *                   Return 1 / 0 / 0.5 — plain numbers only (found via a player report on a
 *                   generated game)
 * Phase-⑧ corpus rules (2026-10-03, from the full numeric archive of 329 real TMT games —
 *   E:\Idle-Skill\archive\, guide §1–§2). Every threshold below is a MEASURED corpus value,
 *   not a guess:
 *     N-UNWIRED    (FAIL) an upgrade defines effect() but its id is referenced NOWHERE else in
 *                   the mod files — the effect is never read and buying it changes nothing.
 *                   Corpus: 7,472 of 13,746 upgrades (54.4%) have no effect() of their own
 *                   because their power is wired into gainMult/gainExp/passiveGeneration instead;
 *                   only 2 of 1,156 layers do that wiring inside their own file. This is the
 *                   #1 way a generated TMT game runs perfectly and does nothing.
 *     D-LOCALWIRE  (WARN) a main layer with >=3 effect-bearing upgrades whose gainMult/gainExp/
 *                   passiveGeneration/update reference NONE of them
 *     N-GHOSTFIELD (WARN) component keys the engine never reads: challenges{reward, repeatable,
 *                   canBypass, countTowardsCompletion}, milestones{persistent},
 *                   achievements{condition, secret}, layer{grids}. Grounded in the engine
 *                   source, NOT in corpus absence: js/components.js:148 renders
 *                   rewardDescription (not reward) and js/technical/layerSupport.js:109-110
 *                   defaults completionLimit to 1, so challenges ARE repeatable.
 *     D-EFFECTSHAPE (WARN) all of a layer's effects are flat multiplies — corpus op frequencies
 *                   are pow 4,830 / add 3,364 / log 3,350 / mul 1,652 / softcap 39
 *     D-COSTSPAN   (WARN) a layer's literal costs span <3 orders of magnitude — corpus: 38.7% of
 *                   the 5,038 literal costs are >=1e10; real ladders span 6+ orders
 * Handbook-12 rules (2026-10-03) — design notes by Acamaeda, the author of TMT
 *   (2020-10 .. 2023-04), collected in references/design/12-Author-Design-Wisdom.md.
 *   These outrank the corpus statistics where the two disagree.
 *     N-ARROWTHIS   (FAIL) a layer/component hook written as an arrow function whose body
 *                   uses `this`. Arrows have no own `this`, so this.layer / this.id are
 *                   undefined and the component context is lost ("Don't use the () =>
 *                   notation because you can't use the 'this' keyword", 2020-10-07).
 *     N-CONTRAST    (WARN, aggregated) layer colors too dark to read as TEXT on the page
 *                   background #0f0f0f (css/general-style.css:5). The engine renders the
 *                   layer's currency amount in this color (js/components.js:239), so a dark
 *                   color hides the player's own balance. The opposite direction (pale color
 *                   behind the near-white upgrade-button highlight, js/components.js:176) is
 *                   design guidance, not a defect: the tree node needs a LIGHT color behind
 *                   dark text (css/tree-node.css:7), so the two uses cannot both be satisfied
 *                   by one value without restyling ("your layer colors make the text hard to
 *                   read", 2023-04-17).
 *     N-UNLOCKPAYGATE (WARN, aggregated) an upgrade whose job is to admit the player to a
 *                   layer that still charges a `requires` toll — pay twice, second price
 *                   invisible ("not good to have to buy an upgrade to unlock something you
 *                   also have to pay to use", 2022-06-26). Use a threshold instead.
 *     N-HOTKEYDESC  (WARN) a hotkey whose description text omits the key itself
 *                   ("You need to have the key in the description", 2020-10-07).
 * Lifecycle rules (2026-10-04) — from the The Galaxy Nebula postmortem
 * (E:\Idle-Skill\The-Galaxy-Nebula\FINDINGS.md). All three of that game's player reports were
 * of ONE shape — each part individually reasonable, the COMBINATION unrecoverable — and all
 * three passed the entire rule set above with 0 FAIL. The rules above check wiring and
 * magnitude; these check what SURVIVES a reset:
 *     N-MSDESTROY   (FAIL) a milestone condition reads a field an upper-row reset erases.
 *                   layerDataReset() (game.js:140) rebuilds the layer from startData() and keeps
 *                   only {unlocked, forceTooltip, noRespecConfirm, prevTab} + the caller's keep
 *                   list; rowReset() (game.js:136) fires it for every lower-row layer with no
 *                   doReset hook. A milestone demanding 1e8 lifetime floors can never fire,
 *                   because the resets that reach it erase the record it is scored against.
 *     N-AUTOWIPE    (FAIL) an automation hook that can fire while the reset is still
 *                   destructive. The engine calls doReset() from the game loop with NO player
 *                   toggle in the path (game.js:369/:378), and resetsNothing() (game.js:211) is
 *                   the only brake. THE INVARIANT: autoPrestige's condition must IMPLY
 *                   resetsNothing's — compare milestone SETS, not numbers. 52 of 98 automated
 *                   layers in that game wiped their own supply every frame. (WARN) a keep list
 *                   preserving an "auto" flag that no code ever reads, so "toggleable" is an
 *                   empty promise.
 *     N-POINTSWRITE (FAIL static / WARN normal) update() assigning player[layer].points instead
 *                   of going through addPoints() (game.js:165), the only writer of best/total.
 *                   On a static layer it is far worse: the reset gain is
 *                   `…floor().sub(player[layer].points).add(1)` (game.js:24), so every trickled
 *                   floor is one the next prestige cannot bank. Only ASSIGNMENT is a defect —
 *                   TMT's Decimal is immutable, so `points.add(1).pow(0.5)` is a read.
 *     N-STATICMAX   (FAIL) a static layer with no canBuyMax(): getResetGain() short-circuits to 1
 *                   (game.js:21) and doReset() clamps the payout to 1 (game.js:186), so the layer
 *                   banks exactly ONE floor per prestige and its whole upgrade ladder is dead.
 *
 * The scanner is comment/string/template-literal aware (same pitfalls catalogued in
 * crawl/extract_metrics.js: apostrophes in comments, CR line endings, interpolation braces).
 * No third-party dependencies. Node >= 18.
 */
"use strict";

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const gameDir = args.find((a) => !a.startsWith("--"));
if (!gameDir) {
    console.error("Usage: node static_checks.js <game-folder> [--json]");
    process.exit(2);
}
const jsDir = path.resolve(gameDir, "js");
if (!fs.existsSync(path.resolve(gameDir, "index.html")) || !fs.existsSync(path.join(jsDir, "mod.js"))) {
    console.error(`ERROR: ${path.resolve(gameDir)} does not look like a TMT game (need index.html and js/mod.js).`);
    process.exit(2);
}

// ---------------------------------------------------------------------------
// findings
// ---------------------------------------------------------------------------
const findings = [];
function add(level, rule, file, idx, msg, fix) {
    findings.push({ level, rule, file: path.relative(path.resolve(gameDir), file).replace(/\\/g, "/"), line: idx == null ? null : lineOf(fileRecs.get(file).lines, idx), msg, fix: fix || null });
}
const FAIL = "FAIL", WARN = "WARN", PASS = "PASS";
function pass(rule, msg) { findings.push({ level: PASS, rule, file: null, line: null, msg, fix: null }); }

// ---------------------------------------------------------------------------
// source scanning: comment/string/template-aware
// states: 0 code, 1 string, 2 template, 3 comment
// ---------------------------------------------------------------------------
function scanSource(src) {
    const n = src.length;
    const clean = src.split("");
    const mask = new Uint8Array(n);
    let i = 0;
    while (i < n) {
        const ch = src[i], next = i + 1 < n ? src[i + 1] : "";
        if (ch === "/" && next === "/") {
            const start = i;
            while (i < n && src[i] !== "\n") i++;
            for (let j = start; j < i; j++) { clean[j] = " "; mask[j] = 3; }
            continue;
        }
        if (ch === "/" && next === "*") {
            const start = i;
            i += 2;
            while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
            i = Math.min(n, i + 2);
            for (let j = start; j < i; j++) { clean[j] = src[j] === "\n" ? "\n" : " "; mask[j] = 3; }
            continue;
        }
        if (ch === "'" || ch === '"') {
            const q = ch, start = i;
            i++;
            while (i < n) {
                if (src[i] === "\\") { i += 2; continue; }
                if (src[i] === q || src[i] === "\n") { i++; break; }
                i++;
            }
            for (let j = start; j < i; j++) mask[j] = 1;
            continue;
        }
        if (ch === "`") {
            const start = i;
            i++;
            while (i < n) {
                if (src[i] === "\\") { i += 2; continue; }
                if (src[i] === "`") { i++; break; }
                if (src[i] === "$" && src[i + 1] === "{") {
                    i += 2;
                    let d = 1;
                    while (i < n && d > 0) {
                        const c = src[i];
                        if (c === "'" || c === '"') { // nested string inside interpolation
                            const q2 = c; i++;
                            while (i < n && src[i] !== q2 && src[i] !== "\n") { if (src[i] === "\\") i++; i++; }
                            i++; continue;
                        }
                        if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
                        if (c === "/" && src[i + 1] === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++; i = Math.min(n, i + 2); continue; }
                        if (c === "{") d++;
                        else if (c === "}") d--;
                        i++;
                    }
                    continue;
                }
                i++;
            }
            for (let j = start; j < i; j++) mask[j] = 2;
            continue;
        }
        i++;
    }
    return { clean: clean.join(""), mask };
}

function makeLineIndex(src) {
    const lines = [0];
    for (let i = 0; i < src.length; i++) if (src[i] === "\n") lines.push(i + 1);
    return lines;
}
function lineOf(lines, idx) {
    if (idx == null) return null;
    let lo = 0, hi = lines.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lines[mid] <= idx) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
}

// Mask-aware scan for the matching closer of `openChar`, starting AT openChar's index.
function matchBracket(clean, mask, openIdx) {
    const open = clean[openIdx];
    const close = open === "(" ? ")" : open === "{" ? "}" : open === "[" ? "]" : null;
    let d = 0;
    for (let i = openIdx; i < clean.length; i++) {
        if (mask[i] !== 0) continue;
        const c = clean[i];
        if (c === open) d++;
        else if (c === close) { d--; if (d === 0) return i; }
    }
    return -1;
}

// All regex matches whose start sits in CODE state.
function codeMatches(clean, mask, re) {
    const out = [];
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(clean))) {
        if (mask[m.index] === 0) out.push(m);
        else re.lastIndex = m.index + 1;
    }
    return out;
}

// Extract top-level calls like addLayer("id", {...}) / addNode("id", {...}).
function extractCalls(rec, callName) {
    const { clean, mask } = rec;
    const results = [];
    const re = new RegExp("\\b" + callName + "\\s*\\(", "g");
    let m;
    while ((m = re.exec(clean))) {
        if (mask[m.index] !== 0) continue;
        const openParen = m.index + m[0].length - 1;
        const closeParen = matchBracket(clean, mask, openParen);
        if (closeParen < 0) break; // unbalanced — let syntax checks elsewhere handle it
        const args = clean.slice(m.index, closeParen + 1);
        const idM = args.match(new RegExp("^" + callName + "\\s*\\(\\s*[\"']([^\"']+)[\"']"));
        results.push({
            id: idM ? idM[1] : null,
            code: args,
            start: m.index,
            end: closeParen + 1,
        });
        re.lastIndex = closeParen + 1;
    }
    return results;
}

// Collect all string-literal contents (single/double quotes + template text).
function stringLiterals(rec, from, to) {
    const { src, mask } = rec;
    const out = [];
    let i = from, cur = null, buf = "";
    const flush = () => { if (cur !== null && buf) out.push(buf); cur = null; buf = ""; };
    while (i < to && i < src.length) {
        const st = mask[i];
        if (st === 1 || st === 2) {
            if (cur !== st) flush();
            cur = st;
            buf += src[i];
        } else flush();
        i++;
    }
    flush();
    return out;
}

// ---------------------------------------------------------------------------
// load files
// ---------------------------------------------------------------------------
const fileRecs = new Map(); // abs path -> {src, clean, mask, lines}
function loadRec(file) {
    if (fileRecs.has(file)) return fileRecs.get(file);
    const src = fs.readFileSync(file, "utf8");
    const { clean, mask } = scanSource(src);
    const rec = { src, clean, mask, lines: makeLineIndex(src) };
    fileRecs.set(file, rec);
    return rec;
}

const modJsPath = path.join(jsDir, "mod.js");
const modRec = loadRec(modJsPath);

// modInfo.modFiles
const ENGINE_FILES = new Set(["components.js", "game.js", "utils.js"]);
const ENGINE_DIRS = new Set(["technical", "Demo", "utils"]);
function walkModderFiles(dir) {
    let out = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) { if (!ENGINE_DIRS.has(ent.name)) out = out.concat(walkModderFiles(p)); }
        else if (ent.isFile() && ent.name.endsWith(".js") && !ENGINE_FILES.has(ent.name)) out.push(p);
    }
    return out;
}
const allModderCandidates = walkModderFiles(jsDir);

// parse modInfo
function extractModInfo(rec) {
    const m = rec.clean.match(/modInfo\s*=\s*\{/);
    if (!m || rec.mask[m.index] !== 0) return null;
    const open = m.index + m[0].length - 1;
    const close = matchBracket(rec.clean, rec.mask, open);
    if (close < 0) return null;
    return { code: rec.clean.slice(open, close + 1), start: open, end: close + 1 };
}
const modInfo = extractModInfo(modRec);

let modFilesList = [];
if (modInfo) {
    const mf = modInfo.code.match(/modFiles\s*:\s*\[([^\]]*)\]/);
    if (mf) {
        let mm;
        const qre = /["']([^"']+)["']/g;
        while ((mm = qre.exec(mf[1]))) modFilesList.push(mm[1]);
    }
}
const modFilesAbs = new Set(modFilesList.map((f) => path.resolve(jsDir, f)));

// ---------------------------------------------------------------------------
// mod.js checks
// ---------------------------------------------------------------------------
if (!modInfo) {
    add(FAIL, "M-INFO", modJsPath, 0, "no parseable `modInfo = {...}` object in js/mod.js", "Restore the modInfo object (references/core/02).");
} else {
    if (!/\bid\s*:\s*["'][^"']+["']/.test(modInfo.code))
        add(FAIL, "M-ID", modJsPath, modInfo.start, "modInfo.id is missing — saves would key off name-author instead", "Add id: \"<unique-slug>\"; set it once and never change it (07 rule 3).");
    else pass("M-ID", "modInfo.id present");

    const missingFields = ["name", "author", "pointsName"].filter((f) => !new RegExp("\\b" + f + "\\s*:").test(modInfo.code));
    if (missingFields.length)
        add(FAIL, "M-FIELDS", modJsPath, modInfo.start, "modInfo missing: " + missingFields.join(", "), "Set every modInfo field (references/core/02).");
    else pass("M-FIELDS", "modInfo.name/author/pointsName present");

    if (!/offlineLimit\s*:/.test(modInfo.code))
        add(WARN, "M-OFFLINE", modJsPath, modInfo.start, "modInfo.offlineLimit not set", "Set offlineLimit: 1 (hours); do not balance around long offline time (07 rule 17).");
    else pass("M-OFFLINE", "modInfo.offlineLimit present");
}

// M-CHARSET — index.html must declare a charset (phase-⑥ second validation incident)
try {
    const indexHtml = fs.readFileSync(path.resolve(gameDir, "index.html"), "utf8");
    if (!/charset/i.test(indexHtml))
        add(WARN, "M-CHARSET", path.resolve(gameDir, "index.html"), null, "index.html has no <meta charset> — theme glyphs (x, em-dash, emoji) garble on servers that serve latin-1 by default", 'Add <meta charset="utf-8" /> right after <head>.');
    else pass("M-CHARSET", "index.html declares a charset");
} catch (e) { /* unreadable index.html — not this rule's job */ }

// C-CONTENT1ELEM — 1-element content arrays render as NOTHING (phase-⑥ second validation:
// tabFormat [["microtabs","stuff"], ["upgrades"]] silently showed an empty layer — the engine's
// row/column content renderer handles bare strings and 2/3-element arrays only).
const CONTENT_COMPONENTS = new Set(
    ("main-display|prestige-button|resource-display|blank|raw-html|display-text|display-image|row|column|toggle|text-input|slider|drop-down|microtabs|bar|infobox|grid|tree|upgrades|milestones|challenges|achievements|buyables|clickables|upgrade-tree|buyable-tree|clickable-tree|layer-proxy|respec-button|master-button|sell-one|sell-all|upgrade|milestone|challenge|buyable|clickable|achievement|gridable|h-line|v-line").split("|"));
(function scanContent1Elem(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (e.name !== "Demo") scanContent1Elem(p); // js/Demo is engine-shipped, not modder code
            continue;
        }
        if (!e.name.endsWith(".js")) continue;
        const rec1 = loadRec(p);
        const re1 = /\[\s*"([A-Za-z][A-Za-z-]*)"\s*\]/g;
        let m1;
        while ((m1 = re1.exec(rec1.clean))) {
            if (rec1.mask[m1.index] !== 0) continue;
            if (!CONTENT_COMPONENTS.has(m1[1])) continue;
            add(FAIL, "C-CONTENT1ELEM", p, m1.index, "content item [\"" + m1[1] + "\"] is a 1-element array — the engine renders NOTHING for it", "Use the bare string \"" + m1[1] + "\" or a 2/3-element array [\"" + m1[1] + "\", data] in tabFormat/microtab content.");
        }
    }
})(jsDir);
if (!/\bVERSION\s*=\s*\{/.test(modRec.clean)) add(FAIL, "M-VER", modJsPath, null, "VERSION object missing", "Add let VERSION = { num: \"0.1\", name: \"...\" } (references/core/02).");
else pass("M-VER", "VERSION present");
if (!/let changelog\s*=/.test(modRec.clean)) add(FAIL, "M-LOG", modJsPath, null, "changelog missing", "Add `let changelog = ...` (references/core/02).");
else pass("M-LOG", "changelog present");
if (!/let winText\s*=/.test(modRec.clean)) add(FAIL, "M-WIN", modJsPath, null, "winText missing", "Add `let winText = ...` — shown on the endgame screen.");
else pass("M-WIN", "winText present");
const endgameM = modRec.clean.match(/function isEndgame\s*\(/);
if (!endgameM) add(FAIL, "M-END", modJsPath, null, "isEndgame() missing — the game can never be won", "Add function isEndgame() { return player.<x>.gte(new Decimal(\"...\")) }.");
else {
    pass("M-END", "isEndgame() present");
    if (/e280000000/.test(modRec.clean))
        add(WARN, "M-END-PLACEHOLDER", modJsPath, endgameM.index, "isEndgame still contains the template placeholder target e280000000", "Replace with the design brief's real endgame target.");
}
if (!/function getPointGen\s*\(/.test(modRec.clean)) add(FAIL, "M-POINTGEN", modJsPath, null, "getPointGen() missing — the core economy", "Implement getPointGen() (references/core/02; wiring map references/core/06 §3).");
else pass("M-POINTGEN", "getPointGen() present");
if (!/doNotCallTheseFunctionsEveryTick/.test(modRec.clean))
    add(WARN, "M-DNC", modJsPath, null, "doNotCallTheseFunctionsEveryTick not declared", "Declare it (even empty) — any custom layer action-function must be listed there (07 rule 4).");
else pass("M-DNC", "doNotCallTheseFunctionsEveryTick declared");

// M-VERCMP — VERSION.num is compared to the save's stored version as a STRING.
// utils/save.js:301 reads `if (player.versionType == getModID() && VERSION.num > player.version)`,
// and JS `>` on two strings is lexicographic: "0.10" < "0.9", "0.1.10" < "0.1.9". So a version
// with a component >= 10 makes every later release look OLDER, the migration guard never
// fires, and — worse — line 307 then writes the bogus version back into the player's save.
// The mirror failure is a DOWNGRADE: a build whose VERSION.num is below what the changelog
// already documents rewrites every save it opens and skips fixOldSave(). Both happened in a
// real generated game (regeneration silently re-stamped the mod from 0.3.1 back to 0.1).
{
    const verObj = /\bVERSION\s*=\s*\{/.exec(modRec.clean);
    const numM = verObj ? new RegExp("\\bnum\\s*:\\s*(\"[^\"]*\"|'[^']*'|[0-9][0-9.]*)").exec(modRec.clean.slice(verObj.index, verObj.index + 400)) : null;
    if (!numM) {
        add(WARN, "M-VERCMP", modJsPath, verObj ? verObj.index : null, "VERSION.num not found — save migration cannot be reasoned about", "Set VERSION = { num: \"0.1\", name: \"...\" }.");
    } else {
        const at = verObj.index + numM.index;
        const raw = numM[1];
        const problems = [];
        if (raw[0] !== "\"" && raw[0] !== "'") {
            problems.push(`VERSION.num is the bare number ${raw}, not a string — the engine stores and re-reads it as a string (save.js:307), so the two can disagree about which is newer`);
        }
        const ver = raw.replace(/["']/g, "");
        const parts = ver.split(".");
        for (const p of parts) {
            if (/^\d+$/.test(p) && parseInt(p, 10) >= 10)
                problems.push(`component "${p}" in VERSION.num "${ver}" is >= 10 — the engine compares as text, and "0.1.10" sorts BELOW "0.1.9", so every release after this one would look older and skip fixOldSave()`);
        }
        // downgrade: the changelog already documents a version newer than VERSION.num.
        // Only version-SHAPED tokens count (a "v" prefix, or a dotted number in a
        // heading) — bare numbers in prose ("97 pay-to-enter gates", "10 of 11 upgrades")
        // are not versions, and reading them as one invented phantom downgrades.
        const chM = /let\s+changelog\s*=/.exec(modRec.clean);
        if (chM) {
            const chBody = modRec.src.slice(chM.index, chM.index + 8000);
            const seen = new Set();
            for (const mm of chBody.matchAll(/\bv(\d+(?:\.\d+)+)\b/g)) seen.add(mm[1]);
            for (const mm of chBody.matchAll(/<h[1-6][^>]*>\s*v?(\d+(?:\.\d+)+)\s*</gi)) seen.add(mm[1]);
            const newest = [...seen].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();
            if (newest && newest.localeCompare(ver, undefined, { numeric: true }) > 0)
                problems.push(`VERSION.num is "${ver}" but the changelog already documents v${newest} — this build is a DOWNGRADE. It rewrites every save it opens (save.js:307) and skips fixOldSave(), because the text compare "${ver}" > "${newest}" is false`);
        }
        if (problems.length)
            add(WARN, "M-VERCMP", modJsPath, at,
                `VERSION.num is not safe for the engine's string comparison (utils/save.js:301): ${problems.join("; ")}. Version bumps are load-bearing — they gate fixOldSave() and decide whether an old save is migrated or silently overwritten.`,
                'Keep VERSION.num a dot-separated string with every component < 10 and at most two components ("0.1" → "0.9" → "1.0"). Never regenerate a mod without re-reading its changelog: a lower num than the changelog documents downgrades every save that opens the game.');
        else pass("M-VERCMP", `VERSION.num "${ver}" compares correctly as a string`);
    }
}

// ---------------------------------------------------------------------------
// file registration
// ---------------------------------------------------------------------------
for (const rel of modFilesList) {
    const abs = path.resolve(jsDir, rel);
    if (!fs.existsSync(abs))
        add(FAIL, "M-FILES", modJsPath, null, `modFiles entry "${rel}" does not exist on disk (paths are relative to js/)`, "Fix the path or remove the entry (07 rule 2).");
}
for (const f of allModderCandidates) {
    if (f === modJsPath) continue;
    const rec = loadRec(f);
    const defines = codeMatches(rec.clean, rec.mask, /\b(addLayer|addNode)\s*\(/g).length > 0;
    if (defines && !modFilesAbs.has(f))
        add(FAIL, "M-UNREG", f, null, "file defines addLayer/addNode but is not listed in modInfo.modFiles — it will never load", `Add "${path.relative(jsDir, f).replace(/\\/g, "/")}" to modInfo.modFiles (07 rule 2).`);
}

// ---------------------------------------------------------------------------
// whole-file banned patterns (every modder file)
// ---------------------------------------------------------------------------
for (const f of allModderCandidates) {
    const rec = loadRec(f);
    for (const m of codeMatches(rec.clean, rec.mask, /\.mod\s*\(/g))
        add(FAIL, "C-MOD", f, m.index, "`.mod(` — this engine's Decimal has no .mod method", "Compute modulo manually (07 Part A 1).");
    for (const m of codeMatches(rec.clean, rec.mask, /\bresetBuyables\s*\(/g))
        add(FAIL, "C-RESETBUY", f, m.index, "resetBuyables() does not exist in the engine (official-demo bug)", "Use respecBuyables(layer) or doReset(layer, true) (07 Part B).");
    for (const m of codeMatches(rec.clean, rec.mask, /\bExpantaNum\b/g))
        add(FAIL, "C-EXPANTA", f, m.index, "ExpantaNum reference — code copied from a framework-swapped mod", "Rewrite with Decimal (09 §6 caveat; 07 Part A 1).");
    for (const m of codeMatches(rec.clean, rec.mask, /\b(cost|requires|purchaseLimit|initialStartPoints)\s*:\s*\d[\d.eE+]*\s*[,}\s]/g))
        add(FAIL, "C-RAWNUM", f, m.index, `raw number where a Decimal belongs: "${m[0].trim().replace(/\s+/g, " ")}"`, "Wrap it: new Decimal(<n>) — or use a string like \"1e10\" for big values (07 Part B).");
    for (const m of codeMatches(rec.clean, rec.mask, /player\s*\[\s*this\s*\.layer\s*\]\s*\.(points|best|total)\s*[-+*/%]|player\s*\[[^\]]+\]\s*\.(points|best|total)\s*[-+*/%]|player\.[A-Za-z_]\w*\.(points|best|total)\s*[-+*/%]/g))
        add(WARN, "C-NATIVEOPS", f, m.index, `native operator applied to a player currency: "${m[0].replace(/\s+/g, " ").trim()}"`, "Use Decimal methods: .add/.sub/.times/.div, .gt/.gte (07 Part A 1).");
    for (const m of codeMatches(rec.clean, rec.mask, /[^a-zA-Z]goal\s*:|goalTooltip|doneTooltip/g))
        add(WARN, "B-DEPRECATED", f, m.index, `deprecated feature used: "${m[0].trim()}"`, "07 Part B: use canComplete() for challenges, dynamic tooltip() for achievements.");
}

// ---------------------------------------------------------------------------
// layer-level checks
// ---------------------------------------------------------------------------
const layers = [];  // {id, file, code, start, type, row, requiresNum, requiresDyn, isSide, isUtility}
const nodeIds = new Set();
const layerIds = new Set();
const branchTargets = []; // {id, target, file, idx}

for (const f of allModderCandidates) {
    const rec = loadRec(f);
    for (const n of extractCalls(rec, "addNode")) {
        if (n.id) {
            if (nodeIds.has(n.id)) add(FAIL, "D-DUPID", f, n.start, `duplicate tree node id "${n.id}"`, "Ids must be unique across layers and nodes.");
            nodeIds.add(n.id);
        }
        for (const b of extractBranches(rec, n, f)) branchTargets.push(b);
    }
    for (const L of extractCalls(rec, "addLayer")) {
        if (!L.id) {
            add(FAIL, "D-DUPID", f, L.start, "addLayer call with unparseable id (first argument must be a string literal)", "Quote the layer id.");
            continue;
        }
        if (layerIds.has(L.id) || nodeIds.has(L.id))
            add(FAIL, "D-DUPID", f, L.start, `duplicate layer id "${L.id}"`, "Layer ids must be unique — a collision breaks the registry and the tree.");
        layerIds.add(L.id);

        const info = { id: L.id, file: f, code: L.code, start: L.start, end: L.end, type: "none", row: null, rowDyn: false, isSide: false, isUtility: false, requiresNum: null, requiresDyn: false, color: null };
        {
            const cm = L.code.match(/\bcolor\s*:\s*(["'`])(#[0-9a-fA-F]{3,8})\1/);
            if (cm) info.color = cm[2];
        }

        const tm = L.code.match(/\btype\s*:\s*["'](normal|static|custom|none)["']/);
        if (tm) info.type = tm[1];

        if (/\bleftTab\s*:\s*true/.test(L.code) || L.id === "tree-tab") info.isUtility = true;
        if (/row\s*:\s*["']side["']/.test(L.code)) { info.isSide = true; }
        else {
            const rm = L.code.match(/\brow\s*:\s*(-?\d+)/);
            const fnM = L.code.match(/\brow\s*:\s*(function|\(\s*\)\s*=>)/) || L.code.match(/\brow\s*:\s*[A-Za-z_$][\w$.]*\s*[,}]/);
            if (rm) info.row = parseInt(rm[1], 10);
            else if (fnM) info.rowDyn = true;
            else if (!info.isUtility) { /* row unset on a main layer */ }
        }
        if (info.rowDyn && !info.isSide && !info.isUtility)
            add(WARN, "D-ROWDYN", f, L.start, `layer "${L.id}" has a dynamic row — cannot verify row contiguity`, "Keep rows static; use displayRow (OVERRIDE) for visual shifts (03 §2).");
        if (!info.isSide && !info.isUtility && info.row === null && !info.rowDyn)
            add(WARN, "D-ROW-UNSET", f, L.start, `layer "${L.id}" has no row property`, "Set row (0 = first row) or row: \"side\" for side layers.");

        // startData (07 rule 6) — utility tab layers like tree-tab are exempt
        if (!info.isUtility) {
            const sd = L.code.match(/\bstartData\s*\(/);
            if (!sd) add(FAIL, "D-STARTDATA", f, L.start, `layer "${L.id}" has no startData()`, "Add startData() returning { unlocked: ..., points: new Decimal(0) } (07 rule 6).");
            else {
                const body = functionBody(L.code, sd.index);
                const hasUnlocked = /\bunlocked\s*:/.test(body);
                const hasPoints = /\bpoints\s*:\s*new\s+Decimal/.test(body);
                if (!hasUnlocked || !hasPoints)
                    add(FAIL, "D-STARTDATA", f, L.start, `layer "${L.id}" startData() missing ${[!hasUnlocked && "unlocked", !hasPoints && "points: new Decimal(...)"].filter(Boolean).join(" and ")} — NaN cascades on first render/save`, "Return both fields from startData() (07 rule 6).");
                else pass("D-STARTDATA", `layer "${L.id}" startData ok`);
            }
        }

        // prestige requirements (07 rule 7)
        if (info.type === "normal" || info.type === "static") {
            const miss = [];
            if (!/\bbaseResource\s*:/.test(L.code)) miss.push("baseResource");
            if (!/\bbaseAmount\s*\(/.test(L.code)) miss.push("baseAmount()");
            if (!/\brequires\s*:/.test(L.code)) miss.push("requires");
            if (miss.length)
                add(FAIL, "D-PRESTIGE", f, L.start, `${info.type} layer "${L.id}" missing ${miss.join(", ")} — the prestige button crashes`, "Add all three (07 rule 7; references/core/03 §3).");
            else pass("D-PRESTIGE", `${info.type} layer "${L.id}" prestige fields ok`);

            const reqFn = /\brequires\s*:\s*(function|\(\s*\)\s*=>)/.test(L.code) || /\brequires\s*\(\s*\)\s*\{/.test(L.code);
            if (reqFn) info.requiresDyn = true;
            else {
                const rm = L.code.match(/\brequires\s*:\s*new\s+Decimal\s*\(\s*("[^"]*"|'[^']*'|[0-9][0-9.eE+]*)\s*\)/);
                if (rm) {
                    const raw = rm[1].replace(/["']/g, "");
                    const num = Number(raw);
                    if (isFinite(num)) info.requiresNum = num;
                }
            }
        }

        for (const b of extractBranches(rec, L, f)) branchTargets.push(b);

        // duplicate layer-level property keys (silent last-wins)
        const LAYER_KEYS = ["autoPrestige", "autoUpgrade", "passiveGeneration", "resetsNothing", "automate", "gainMult", "gainExp", "softcap", "softcapPower", "update"];
        const layerMask = rec.mask.slice(L.start, L.end);
        for (const key of LAYER_KEYS) {
            const defRe = new RegExp("(?:^|[,{\\n])\\s*" + key + "\\s*[(:]", "g");
            const defs = codeMatches(L.code, layerMask, defRe);
            if (defs.length >= 2)
                add(FAIL, "D-DUPKEY", f, L.start, `layer "${L.id}" defines "${key}" ${defs.length} times — later definition silently wins`, "Merge into one definition (duplicated keys are a copy-paste bug).");
        }

        // automation-grant collisions between milestone texts (Mario Maker "//冲突点位" incident)
        const AUTO_KEYWORDS = ["autoUpgrade", "autoPrestige", "passiveGeneration", "resetsNothing"];
        const strs = stringLiterals(rec, L.start, L.end).map((s) => s.toLowerCase());
        for (const kw of AUTO_KEYWORDS) {
            const hits = strs.filter((s) => s.includes(kw.toLowerCase())).length;
            if (hits >= 2)
                add(WARN, "D-AUTOCOLLIDE", f, L.start, `layer "${L.id}": ${hits} different strings mention "${kw}" — check no two milestones claim the same automation grant (Mario Maker 2 conflict-point incident)`, "One milestone (or one achievement path) per automation flag; combine the rest with || in the layer property.");
        }

        // achievements-backfill push guards (09 P11)
        for (const m of codeMatches(L.code, rec.mask.slice(L.start, L.end + 1), /\.(upgrades|milestones)\s*\.\s*push\s*\(/g)) {
            const lineStart = L.code.lastIndexOf("\n", m.index) + 1;
            const lineEnd = L.code.indexOf("\n", m.index);
            const line = L.code.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
            if (!/!\s*has(Upgrade|Milestone|Achievement|Challenge)/.test(line))
                add(WARN, "D-PUSHGUARD", f, L.start, `layer "${L.id}" pushes into ${m[1]} without a !has* idempotence guard — duplicate array entries are a real save-bug source`, 'Guard it: if (hasX(...) && !hasUpgrade("layer", id)) player.layer.upgrades.push(id) (09 P11).');
        }

        layers.push(info);
    }
}

// helper: plain-text bracket matcher used only inside an already-clean call string
function matchBracketFrom(text, openIdx) {
    const open = text[openIdx];
    const close = open === "(" ? ")" : open === "{" ? "}" : null;
    let d = 0;
    for (let i = openIdx; i < text.length; i++) {
        if (text[i] === open) d++;
        else if (text[i] === close) { d--; if (d === 0) return i; }
    }
    return -1;
}

// branches: parse `branches: [...]` and return targets with locations
function extractBranches(rec, call, file) {
    const out = [];
    const { clean, mask } = rec;
    const re = /\bbranches\s*:\s*\[/g;
    let m;
    while ((m = re.exec(call.code))) {
        const openAbs = call.start + m.index + m[0].length - 1;
        if (mask[openAbs] !== 0) continue;
        const closeAbs = matchBracket(clean, mask, openAbs);
        if (closeAbs < 0) break;
        const arrText = clean.slice(openAbs + 1, closeAbs);
        // split top-level elements (mask-aware depth over [ ] within the slice)
        const elems = [];
        let d = 0, cur = "";
        for (let i = 0; i < arrText.length; i++) {
            const c = arrText[i];
            if (mask[openAbs + 1 + i] === 0) {
                if (c === "[") d++;
                else if (c === "]") d--;
            }
            if (c === "," && d === 0) { elems.push(cur); cur = ""; }
            else cur += c;
        }
        if (cur.trim()) elems.push(cur);
        for (const el of elems) {
            const idm = el.match(/["']([^"']+)["']/);
            if (idm) out.push({ id: call.id, target: idm[1], file, idx: openAbs });
        }
        re.lastIndex = m.index + m[0].length;
    }
    return out;
}

// Given the index of a keyword, extract its function body `{ ... }` (plain-text match —
// bodies passed here are already comment-stripped and rarely contain braces in strings).
function functionBody(text, kwIdx) {
    let i = text.indexOf("(", kwIdx);
    if (i < 0) return "";
    const pEnd = matchBracketFrom(text, i);
    if (pEnd < 0) return "";
    let j = pEnd + 1;
    while (j < text.length && /\s/.test(text[j])) j++;
    if (text[j] !== "{") return "";
    const bEnd = matchBracketFrom(text, j);
    return bEnd < 0 ? text.slice(j) : text.slice(j, bEnd + 1);
}

for (const b of branchTargets) {
    if (!layerIds.has(b.target) && !nodeIds.has(b.target))
        add(FAIL, "D-BRANCH", b.file, b.idx, `layer "${b.id}" has a branch edge to "${b.target}", which is not a defined layer or node`, "Fix the id, or define the target layer (broken edges break tree rendering).");
    else pass("D-BRANCH", `branch ${b.id} → ${b.target} ok`);
}

// ---------------------------------------------------------------------------
// tree-shape assertions (09 §5 A1/A2)
// ---------------------------------------------------------------------------
const mainLayers = layers.filter((L) => !L.isSide && !L.isUtility);
const rowSet = new Map(); // row -> [layers]
for (const L of mainLayers) {
    if (L.row === null) continue;
    if (!rowSet.has(L.row)) rowSet.set(L.row, []);
    rowSet.get(L.row).push(L);
}
const rows = [...rowSet.keys()].sort((a, b) => a - b);
if (rows.length > 0) {
    const maxRow = rows[rows.length - 1];
    const missing = [];
    for (let r = 0; r <= maxRow; r++) if (!rowSet.has(r)) missing.push(r);
    if (missing.length)
        add(FAIL, "D-ROWMISSING", layers[0] ? layers[0].file : modJsPath, null, `main rows are not contiguous from 0 — missing row ${missing.join(", ")} (anti-pattern A2: The Tree of Vote rendered a broken tree)`, "Renumber rows contiguously from 0; side layers use row: \"side\".");
    else pass("D-ROWMISSING", `rows contiguous 0..${maxRow}`);
    if (rows[0] < 0)
        add(WARN, "D-ROWNEG", layers[0] ? layers[0].file : modJsPath, null, `negative row ${rows[0]} in use — corpus games start at row 0`, "Prefer rows 0..N; use displayRow for visual offsets.");

    // requires ladder (A1): min numeric requires per row must not decrease
    //
    // `unresolved` counts layers in the row whose `requires` is a function, so their
    // value is not statically known. Comparing the remaining layers produces a ratio
    // against the wrong denominator — a real generated game reported a phantom ×7.2
    // this way while the engine's actual adjacent-row ratios were all ×18. When either
    // row has an unresolved layer, skip the comparison instead of guessing.
    const rowReq = [];
    for (const r of rows) {
        const inRow = rowSet.get(r);
        const reqs = inRow.filter((L) => L.requiresNum != null).map((L) => L.requiresNum);
        rowReq.push({ row: r, req: reqs.length ? Math.min(...reqs) : null, unresolved: inRow.length - reqs.length });
    }
    for (let i = 1; i < rowReq.length; i++) {
        const prev = rowReq[i - 1], cur = rowReq[i];
        if (prev.req == null || cur.req == null) continue;
        if (prev.unresolved > 0 || cur.unresolved > 0) continue;
        const ratio = cur.req / prev.req;
        if (ratio < 1)
            add(FAIL, "D-REQLADDER", layers[0] ? layers[0].file : modJsPath, null, `backwards requires ladder (A1): row ${cur.row} requires ${fmtNum(cur.req)} but row ${prev.row} requires ${fmtNum(prev.req)} — later rows must require MORE (The Click Tree incident: 100000→50→30→…)`, "Raise the deeper row's requires; adjacent rows should sit x10–x100 apart (P2).");
        else if (ratio < 10 || ratio > 100)
            add(WARN, "D-REQRATIO", layers[0] ? layers[0].file : modJsPath, null, `adjacent-row requires ratio row ${prev.row}→${cur.row} is ×${fmtNum(ratio)} — measured corpus band is ×10–×100 (median ×25)`, "Justify in the design brief (multi-row leap like Mario Maker e86) or rebalance.");
        else pass("D-REQRATIO", `requires ladder row ${prev.row}→${cur.row}: ×${fmtNum(ratio)}`);
    }
}

function fmtNum(x) {
    if (!isFinite(x)) return String(x);
    if (x >= 1e6 || (x < 1e-3 && x > 0)) return x.toExponential(2);
    return String(Math.round(x * 100) / 100);
}

// ---------------------------------------------------------------------------
// fun-density assertions (handbook 10; phase-⑤b)
// ---------------------------------------------------------------------------

// Top-level `ident:` keys of the object literal spanning [from, to) (absolute idx).
// depth 1 = directly inside the object; strings/comments skipped via mask.
function topLevelKeys(clean, mask, from, to) {
    const keys = [];
    let depth = 0, ident = "", identStart = -1;
    for (let i = from; i < to; i++) {
        if (mask[i] !== 0) continue;
        const c = clean[i];
        if (c === "{" || c === "(" || c === "[") { depth++; ident = ""; }
        else if (c === "}" || c === ")" || c === "]") { depth--; ident = ""; }
        else if (depth === 1) {
            if (/[A-Za-z0-9_$]/.test(c)) { if (!ident) identStart = i; ident += c; }
            else { if (ident && c === ":") keys.push({ key: ident, idx: identStart }); ident = ""; }
        }
    }
    return keys;
}

// Count entries of a component collection spanning [openIdx, closeIdx]
// (object form: depth-0 `ident:` keys except rows/cols; array form: depth-0 `{` elements).
// Scan starts AFTER the opening brace, so direct children sit at depth 0.
function countCollectionEntries(clean, mask, openIdx, closeIdx) {
    const isArray = clean[openIdx] === "[";
    let count = 0, depth = 0, ident = "";
    for (let i = openIdx + 1; i < closeIdx; i++) {
        if (mask[i] !== 0) continue;
        const c = clean[i];
        if (c === "{" || c === "(" || c === "[") { depth++; if (isArray && c === "{" && depth === 1) count++; ident = ""; }
        else if (c === "}" || c === ")" || c === "]") { depth--; ident = ""; }
        else if (depth === 0 && !isArray) {
            if (/[A-Za-z0-9_$]/.test(c)) ident += c;
            else { if (ident && c === ":" && !/^(rows|cols)$/i.test(ident)) count++; ident = ""; }
        }
    }
    return count;
}

// Per-upgrade spans of an `upgrades: {...}` collection (object form only).
// Scan starts AFTER the opening brace: entry keys at depth 0, entry value `{` → depth 1.
function upgradeEntrySpans(clean, mask, openIdx, closeIdx) {
    const spans = [];
    let depth = 0, ident = "", pendingKey = null;
    for (let i = openIdx + 1; i < closeIdx; i++) {
        if (mask[i] !== 0) continue;
        const c = clean[i];
        if (c === "{" || c === "(" || c === "[") {
            depth++;
            if (depth === 1 && pendingKey && /^[0-9A-Za-z_$]+$/.test(pendingKey) && c === "{") {
                const end = matchBracket(clean, mask, i);
                if (end > 0) { spans.push({ key: pendingKey, start: i, end }); i = end; depth--; } // jump skips the closer — keep depth honest
            }
            if (depth <= 1) pendingKey = null;
            ident = "";
        }
        else if (c === "}" || c === ")" || c === "]") { depth--; ident = ""; if (depth <= 0) pendingKey = null; }
        else if (depth === 0) {
            if (/[A-Za-z0-9_$]/.test(c)) ident += c;
            else { if (ident && c === ":") pendingKey = ident; ident = ""; }
        }
    }
    return spans;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// Classify one upgrade entry (handbook 10 §2): varied / mult-const / unlock / wired-other.
function classifyUpgrade(clean, mask, start, end, layerId) {
    const text = clean.slice(start, end);
    const isUnlock = /\bunlock/i.test(text);
    // inline effect(...) — match in code state only
    let effBody = null;
    const effRe = /(?:^|[^A-Za-z_$])effect\s*\([^)]*\)\s*\{/g;
    let m;
    while ((m = effRe.exec(text))) {
        const absIdx = start + m.index + m[0].length - 1;
        if (mask[absIdx] !== 0) continue;
        const closeAbs = matchBracket(clean, mask, absIdx);
        if (closeAbs > 0) effBody = clean.slice(absIdx + 1, closeAbs);
        break;
    }
    if (effBody === null) return isUnlock ? "unlock" : "wired-other";
    const nonMult = /\.pow\s*\(|\.root\s*\(|expRoot|\.log|\.max\s*\(|\.min\s*\(|\bsoftcap\s*\(|\.add\s*\(|\.sub\s*\(|\bif\s*\(|\?/.test(effBody);
    const idEsc = escapeRe(layerId);
    const cross = new RegExp(
        "player\\s*\\.\\s*(?!this\\b|" + idEsc + "\\b|points\\b)[A-Za-z_$][\\w$]*|" +
        "player\\s*\\[\\s*[\"'](?!this\\b|" + idEsc + "\\b)|" +
        "hasUpgrade|hasMilestone|hasChallenge|hasAchievement|inChallenge|" +
        "upgradeEffect|buyableEffect|challengeEffect|milestoneEffect|clickableEffect|" +
        "getBuyableAmount|challengeCompletions"
    ).test(effBody);
    return (nonMult || cross) ? "varied" : "mult-const";
}

// Parse one addLayer call: component counts, upgrade kinds, organization flags.
const FUN_COMPONENTS = ["upgrades", "milestones", "challenges", "buyables", "clickables", "bars", "grids", "grid"];
function layerContentInfo(rec, L) {
    const info = { counts: {}, upgradeKinds: [], organized: false, hasUpdate: false };
    for (const c of ["upgrades", "milestones", "challenges", "buyables", "clickables", "bars", "grids"]) info.counts[c] = 0;
    const objStart = rec.clean.indexOf("{", L.start);
    if (objStart < 0 || objStart >= L.end) return info;
    const keys = topLevelKeys(rec.clean, rec.mask, objStart, L.end);
    for (const k of keys) {
        if (k.key === "tabFormat" || k.key === "microtabs" || k.key === "subtabs") info.organized = true;
        if (!FUN_COMPONENTS.includes(k.key)) continue;
        const comp = k.key === "grid" ? "grids" : k.key;
        // value start: first code-state char after the colon
        let i = k.idx + k.key.length;
        while (i < L.end && rec.mask[i] !== 0) i++;
        while (i < L.end && /\s/.test(rec.clean[i])) i++;
        if (rec.clean[i] !== ":" ) continue;
        i++;
        while (i < L.end && (rec.mask[i] !== 0 || /\s/.test(rec.clean[i]))) i++;
        const openCh = rec.clean[i];
        if (openCh !== "{" && openCh !== "[") continue; // variable ref — skip (conservative)
        const closeIdx = matchBracket(rec.clean, rec.mask, i);
        if (closeIdx < 0 || closeIdx > L.end) continue;
        info.counts[comp] = countCollectionEntries(rec.clean, rec.mask, i, closeIdx);
        if (comp === "upgrades" && openCh === "{") {
            for (const s of upgradeEntrySpans(rec.clean, rec.mask, i, closeIdx))
                info.upgradeKinds.push(classifyUpgrade(rec.clean, rec.mask, s.start, s.end, L.id));
        }
    }
    const layerText = rec.clean.slice(objStart, L.end);
    const um = /\bupdate\s*\(/g;
    let mm;
    while ((mm = um.exec(layerText))) {
        if (rec.mask[objStart + mm.index] === 0) { info.hasUpdate = true; break; }
    }
    return info;
}

{
    const contentByLayer = new Map();
    for (const L of layers) {
        const rec = fileRecs.get(L.file);
        const info = layerContentInfo(rec, L);
        contentByLayer.set(L.id, info);

        if (L.isUtility) continue;
        const items = Object.values(info.counts).reduce((s, x) => s + x, 0);

        if (!L.isSide) {
            if (process.env.DBG_FUN) console.error(`DBG ${L.id} kinds=[${info.upgradeKinds.join(",")}] items=${items}`);
            // D-EFFECTMONO — flat-mult monotony (10 §2)
            const total = info.upgradeKinds.length;
            if (total >= 8) {
                const mono = info.upgradeKinds.filter((k) => k === "mult-const" || k === "wired-other").length;
                if (mono / total > 0.6)
                    add(WARN, "D-EFFECTMONO", L.file, L.start, `layer "${L.id}": ${mono}/${total} upgrades are flat multipliers (inline constant or externally-wired) — 10 §2 effect-kind quota violated`, "Vary effects: K2 pow/log/root shapes, K3 cross-resource sources, K4 meta ^effects, K5 cap-play, K7 unlocks (handbook 10 §2).");
            }
            // D-MICROTABS — content organization (10 §3)
            if (items >= 16 && !info.organized)
                add(FAIL, "D-MICROTABS", L.file, L.start, `layer "${L.id}" stacks ${items} content items with no tabFormat/microtabs — long-scroll wall (10 §3; seen in a real generated game: 24 heavy layers, 0 microtabs)`, "Add tabFormat with [\"microtabs\",\"stuff\"] groups (upgrades / milestones / secondary currency / challenges), each unlocked()-gated.");
            else if (items >= 10 && !info.organized)
                add(WARN, "D-MICROTABS", L.file, L.start, `layer "${L.id}" stacks ${items} content items without tabFormat — add at least ["main-display","prestige-button","upgrades"] (10 §3)`, "Give the layer a tabFormat; microtabs once it has >=3 content groups.");
        }
    }

    // D-MECHQUOTA / D-NOUPDATE — game-level mechanic floors (10 §5)
    if (mainLayers.length >= 4) {
        let interactive = 0, updates = 0;
        for (const L of layers) {
            const info = contentByLayer.get(L.id);
            interactive += info.counts.challenges + info.counts.clickables + info.counts.bars + info.counts.grids;
            if (info.hasUpdate) updates++;
        }
        if (interactive === 0)
            add(WARN, "D-MECHQUOTA", mainLayers[0].file, mainLayers[0].start, `game has ${mainLayers.length} main layers but zero challenges/clickables/bars/grids anywhere — mechanic-variety floor (10 §5; seen in a real generated game: prestige was the only verb)`, "Add theme-fitting mechanics from handbook 10 §4 (M1/M2 challenges, M3/M4 clickable loops, M5 secondary currency).");
        if (updates === 0)
            add(WARN, "D-NOUPDATE", mainLayers[0].file, mainLayers[0].start, `game has ${mainLayers.length} main layers but no update() tick logic — nothing happens between prestiges (10 §5)`, "Add tick-driven behavior: secondary-currency production (M5), run/minigame resolution (M3), or bar charging (M4).");
    }
}

// ---------------------------------------------------------------------------
// phase-⑦ negative-example rules (2026-10-02, The Yeast Tree as the bad specimen)
// ---------------------------------------------------------------------------

// Shared: spans of one layer's component entries ({key, start, end, text}), absolute indices.
// `field` defaults to "upgrades"; pass "challenges"/"milestones"/"achievements"/"buyables"/…
// to walk another collection on the same layer object.
function layerUpgradeSpans(rec, L, field) {
    const fieldName = field || "upgrades";
    const out = [];
    const objStart = rec.clean.indexOf("{", L.start);
    if (objStart < 0 || objStart >= L.end) return out;
    const keys = topLevelKeys(rec.clean, rec.mask, objStart, L.end);
    for (const k of keys) {
        if (k.key !== fieldName) continue;
        let i = k.idx + k.key.length;
        while (i < L.end && rec.mask[i] !== 0) i++;
        while (i < L.end && /\s/.test(rec.clean[i])) i++;
        if (rec.clean[i] !== ":") continue;
        i++;
        while (i < L.end && (rec.mask[i] !== 0 || /\s/.test(rec.clean[i]))) i++;
        if (rec.clean[i] !== "{") continue; // variable ref — conservative skip
        const closeIdx = matchBracket(rec.clean, rec.mask, i);
        if (closeIdx < 0 || closeIdx > L.end) continue;
        for (const s of upgradeEntrySpans(rec.clean, rec.mask, i, closeIdx))
            out.push({ key: s.key, start: s.start, end: s.end, text: rec.clean.slice(s.start, s.end) });
    }
    return out;
}

// N-ACHVIS — uncompleted achievements must stay visible (dimmed is fine, hidden is not).
// The STOCK engine pushes {'visibility': 'hidden'} for !hasAchievement in achievementStyle()
// (js/technical/displays.js) — every game shipped blind achievements until the template was
// patched 2026-10-02. Guard against templates/regressions reintroducing it.
{
    const dispPath = path.join(jsDir, "technical", "displays.js");
    if (fs.existsSync(dispPath)) {
        const dRec = loadRec(dispPath);
        const aM = dRec.clean.match(/function\s+achievementStyle\s*\(/);
        if (aM && /visibility\s*['"]?\s*:\s*['"]?hidden/.test(dRec.clean.slice(aM.index, aM.index + 600)))
            add(FAIL, "N-ACHVIS", dispPath, aM.index, "achievementStyle() hides uncompleted achievements with visibility:hidden — players cannot see what achievements exist (stock engine default; caught in a real generated game)", "Replace that push with a dim style: {'filter': 'grayscale(0.7)', 'opacity': '0.55'} — done/not-done color distinction comes from the .locked/.bought classes.");
        else pass("N-ACHVIS", "uncompleted achievements are visible (dimmed, not hidden)");
    }
}

// N-UNLOCKDEAD — layerShown() gating on player[X].unlocked with NO onPurchase writer anywhere
// dead-ends the tree after the first layer (The Yeast Tree: 9 "Unlock X" upgrades, 0 hooks).
{
    let onPurchaseCount = 0;
    for (const f of allModderCandidates) {
        const rec = loadRec(f);
        onPurchaseCount += codeMatches(rec.clean, rec.mask, /\bonPurchase\s*\(/g).length;
    }
    const bareGated = layers.filter((L) => !L.isSide && !L.isUtility &&
        /layerShown\s*\(\s*\)\s*\{\s*return\s+player\s*\[\s*this\s*\.layer\s*\]\s*\.unlocked\s*;?\s*\}/.test(L.code));
    if (bareGated.length >= 2 && onPurchaseCount === 0)
        add(FAIL, "N-UNLOCKDEAD", bareGated[0].file, bareGated[0].start, `${bareGated.length} layers gate layerShown() on player[X].unlocked but no mod file defines onPurchase — nothing can ever set those flags, the tree dead-ends after layer 1 (caught in a real generated game)`, "Give every 'Unlock X' upgrade onPurchase() { player.X.unlocked = true }, and make layerShown() also accept || hasUpgrade(\"<parent>\", <id>) so already-broken saves heal on load.");
    else pass("N-UNLOCKDEAD", "unlocked-gated layers have onPurchase writers");
}

// N-UNLOCKTEXT — an upgrade promising "Unlock X" should carry onPurchase, or be referenced
// by some layerShown() hasUpgrade check (the Genome-layer pattern). Buyable/tab tickets exempt.
{
    const shownBodies = [];
    for (const L of layers) {
        const lm = L.code.match(/layerShown\s*\(/);
        if (lm) {
            const body = functionBody(L.code, lm.index);
            if (body) shownBodies.push(body);
        }
    }
    let unlockTickets = 0, wiredTickets = 0;
    for (const L of layers) {
        if (L.isUtility) continue;
        const rec = fileRecs.get(L.file);
        for (const s of layerUpgradeSpans(rec, L)) {
            if (!/\bunlock\b/i.test(s.text)) continue;
            if (/buyable|tab/i.test(s.text)) continue; // feature-unlock tickets (subtab/buyable), not layer unlocks
            if (/\bunlock\s+(a\s+)?new\b/i.test(s.text)) continue; // generic ticket phrasing ("Unlock a new layer.") names no target
            unlockTickets++;
            if (/\bonPurchase\s*\(/.test(s.text)) { wiredTickets++; continue; }
            const refRe = new RegExp("hasUpgrade\\s*\\(\\s*[\"']" + escapeRe(L.id) + "[\"']\\s*,\\s*[\"']?" + s.key + "[\"']?\\s*\\)");
            if (shownBodies.some((b) => refRe.test(b))) { wiredTickets++; continue; }
            add(WARN, "N-UNLOCKTEXT", L.file, s.start, `upgrade ${L.id}-${s.key} promises an unlock but has neither onPurchase nor a layerShown hasUpgrade reference — if it unlocks a LAYER the tree dead-ends, if it only unlocks a subtab/buyable note that in the brief`, 'Add onPurchase() { player.<target>.unlocked = true } (or extend a layerShown check).');
        }
    }
    if (unlockTickets > 0) pass("N-UNLOCKTEXT", `${wiredTickets}/${unlockTickets} unlock-promising upgrades wired`);
}

// N-CAPMULT — a cap-valued upgrade effect wired into getPointGen() multiplies the BASE
// currency by the cap itself (The Yeast Tree: y-22 "Selective Pressure" returned the new
// softcap 1e12–1e18 into pointGen → sugar ×1e12, game beatable in minutes).
// Signal: pointGen references upgradeEffect("L", N) whose entry mentions softcap/tolerance
// AND carries a big Decimal constant (≥1e6) or a "Softcap:/Tolerance:" effectDisplay.
{
    const pgM = modRec.clean.match(/function\s+getPointGen\s*\(/);
    if (pgM) {
        const pgBody = functionBody(modRec.clean, pgM.index);
        const refRe = /upgradeEffect\s*\(\s*["']([^"']+)["']\s*,\s*["']?(\w+)["']?\s*\)/g;
        let m;
        while ((m = refRe.exec(pgBody))) {
            const L = layers.find((x) => x.id === m[1]);
            if (!L) continue;
            const rec = fileRecs.get(L.file);
            const span = layerUpgradeSpans(rec, L).find((s) => s.key === m[2]);
            if (!span) continue;
            const capFlavored = /\b(softcap|tolerance)\b|starts\s+\d+\s*×\s*later/i.test(span.text);
            if (!capFlavored) continue;
            let bigConst = false;
            const cRe = /new\s+Decimal\s*\(\s*["']1e(\d+)["']/g;
            let cm;
            while ((cm = cRe.exec(span.text))) { if (parseInt(cm[1], 10) >= 6) { bigConst = true; break; } }
            if (bigConst || /Softcap\s*[×:×]|Tolerance\s*:/.test(span.text))
                add(FAIL, "N-CAPMULT", L.file, span.start, `getPointGen() multiplies by upgradeEffect("${m[1]}", ${m[2]}) but that upgrade's effect returns a CAP value (softcap/tolerance), not a gain multiplier — base currency explodes by its magnitude (caught in a real generated game)`, "Remove the pointGen line; cap-raising upgrades only shift softcap thresholds (read via hasUpgrade inside the cap function), they never multiply gains.");
        }
    }
}

// N-SELFTOTAL — Σ self-scaling exponents a layer wires into its OWN gainMult. Every upgrade
// effect reading player[this.layer].points and raising to power p is an independent
// self-loop multiplicative zone; the zones SUM, and Σp ≥ 1 makes prestige gains compound
// superlinearly per reset — numbers explode within the layer (The Yeast Tree y: 0.5+0.25+0.5).
{
    for (const L of layers) {
        if (L.isSide || L.isUtility) continue;
        const rec = fileRecs.get(L.file);
        const gmM = L.code.match(/\bgainMult\s*\(/);
        const gmBody = gmM ? functionBody(L.code, gmM.index) : "";
        if (!gmBody) continue;
        let sum = 0;
        const parts = [];
        const idEsc = escapeRe(L.id);
        const selfRe = new RegExp("player\\s*\\[\\s*this\\s*\\.layer\\s*\\]\\s*\\.\\s*points|player\\s*\\.\\s*" + idEsc + "\\s*\\.\\s*points");
        for (const s of layerUpgradeSpans(rec, L)) {
            const selfIdx = s.text.search(selfRe);
            if (selfIdx < 0) continue;
            const wireRe = new RegExp("upgradeEffect\\s*\\(\\s*[\"']" + escapeRe(L.id) + "[\"']\\s*,\\s*['\"]?" + s.key + "[\"']?\\s*\\)");
            if (!wireRe.test(gmBody)) continue;
            const rest = s.text.slice(selfIdx);
            const pm = rest.match(/\.pow\s*\(\s*([\d.]+)\s*\)/);
            if (!pm) continue;
            if (/\.log\s*\(/.test(rest.slice(0, rest.indexOf(".pow(")))) continue; // log-shaped → sublinear, not a self-loop zone
            const p = parseFloat(pm[1]);
            if (p > 0) { sum += p; parts.push(s.key + ":^" + pm[1]); }
        }
        if (sum >= 1)
            add(FAIL, "N-SELFTOTAL", L.file, L.start, `layer "${L.id}" wires ${sum.toFixed(2)} total self-scaling exponent into its own gainMult (${parts.join(", ")}) — Σp ≥ 1 compounds superlinearly per prestige and explodes within the layer (caught in a real generated game)`, "Keep ONE self-scaling upgrade per layer at ≤^0.5 softcapped (Σ ≤ 0.6); convert the extra self-mults to cross-resource (K3) or capped shapes.");
        else if (sum >= 0.75)
            add(WARN, "N-SELFTOTAL", L.file, L.start, `layer "${L.id}" wires ${sum.toFixed(2)} total self-scaling exponent into its own gainMult (${parts.join(", ")}) — close to the compounding threshold`, "Prefer Σ ≤ 0.6: soften one zone (lower exponent, tighter softcap) or make it cross-resource.");
        else if (sum > 0)
            pass("N-SELFTOTAL", `layer "${L.id}" self-scaling Σ${sum.toFixed(2)} ok`);
    }
}

// N-PGBOOL — passiveGeneration() must return a plain NUMBER (1 / 0 / 0.5). Bare booleans only
// work because stock v2.7 normalizes true→1 in temp.js (new Decimal(true) is ZERO), and a
// Decimal return NaNs in game.js's `diff * passiveGeneration` multiply. Found via a player
// report on a generated game.
{
    let boolPg = 0;
    for (const L of layers) {
        const pgM = L.code.match(/passiveGeneration\s*\(/);
        if (!pgM) continue;
        const body = functionBody(L.code, pgM.index);
        const retM = body && body.match(/return\s+([^;}]+)/);
        if (!retM) continue;
        const ret = retM[1].trim();
        const booleanish = /\b(hasMilestone|hasAchievement|hasChallenge|hasUpgrade|true|false)\b/.test(ret);
        // strip the has*() calls (their milestone-index args contain digits!) and see if an
        // actual amount remains: "hasMilestone("c", 0) ? 1 : 0" -> " ? 1 : 0" (explicit),
        // "hasMilestone("c", 0)" -> "" (a bare boolean), "hasMilestone(...) || hasAchievement(...)" -> " || "
        const stripped = ret.replace(/has(?:Milestone|Achievement|Challenge|Upgrade)\s*\((?:[^()]|\([^()]*\))*\)/g, "");
        if (booleanish && !/\d/.test(stripped) && !/new\s+Decimal/.test(stripped)) {
            boolPg++;
            add(WARN, "N-PGBOOL", L.file, L.start, `layer "${L.id}" passiveGeneration() returns a bare boolean (${ret.slice(0, 70)}) — the docs promise a plain number; stock v2.7 coerces true to 1 only via a temp.js normalization line, new Decimal(true) is ZERO (any Decimal context silently disables it), and a Decimal return would NaN in the engine's diff multiply`, 'Return an amount: passiveGeneration() { if (hasMilestone("x", 0)) return 1 } — fractional rates like 0.5 are valid; return 0 or omit the function to disable.');
        }
    }
    if (boolPg === 0) pass("N-PGBOOL", "passiveGeneration returns plain numbers");
}

// ===========================================================================
// Phase-⑧ corpus rules (2026-10-03). Grounded in the full numeric archive of
// 329 real TMT games / 1,156 layers / 13,746 upgrades
// (E:\Idle-Skill\archive\TMT_生成式AI增量游戏数值设计指南.md).
// ===========================================================================

// N-UNWIRED — the headline defect this whole corpus study surfaced.
//
// 7,472 of 13,746 real upgrades (54.4%) carry NO effect() of their own: their power
// lives in the layer's gainMult()/gainExp()/passiveGeneration(), which branch on the
// upgrade being present. An AI that writes 40 upgrades each with a self-contained
// effect() but never references one id from any formula produces a game that RUNS,
// BUYS, DISPLAYS — and changes nothing, with no error anywhere.
//
// Precision matters more than recall here: we only FAIL when the id is mentioned NOWHERE
// else in any modder-scope file, so a game using a custom helper (getUpgEff(11)) still
// passes. The softer "is this layer wired to itself" steer is D-LOCALWIRE (WARN).
{
    const modderRecs = allModderCandidates.map((f) => ({ f, rec: loadRec(f) }));
    const deadUpgrades = [];
    for (const L of layers) {
        if (L.isUtility) continue;
        const rec = fileRecs.get(L.file);
        if (!rec) continue;
        for (const s of layerUpgradeSpans(rec, L, "upgrades")) {
            if (!/(^|[{,])\s*effect\s*\(/.test(s.text)) continue; // no effect of its own
            const id = String(s.key);
            const tok = isNaN(Number(id))
                ? "[\"']" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\"']"
                : "\\b" + id + "\\b";
            // (1) anywhere else INSIDE this layer's own code range — the classic wiring shape
            //     is gainMult(){ if (hasUpgrade("<this layer>", 31)) ... }; also covers a
            //     layer-local helper like getUpgEff(31). Scoped to the layer because numeric
            //     ids collide across layers (other layers also own an upgrade "31").
            const layerSeg = rec.clean.slice(L.start, L.end);
            // the span starts at the entry's `{`, so the `id:` key itself sits just before
            // it — strip that too or every upgrade "mentions" itself
            const relStart = s.start - L.start;
            const head = layerSeg.slice(0, relStart);
            const mKey = /(["']?[A-Za-z0-9_$-]+["']?)\s*:\s*$/.exec(head);
            const cutFrom = mKey ? head.length - mKey[0].length + mKey[0].indexOf(mKey[1]) : relStart;
            const layerHay = layerSeg.slice(0, cutFrom) + layerSeg.slice(s.end - L.start);
            if (new RegExp("(?<![\\w$])" + tok + "(?![\\w$])").test(layerHay)) continue;
            // (2) anywhere else, but only in a recognised CONSUMPTION context
            const consumer = new RegExp(
                "(?:hasUpgrade|upgradeEffect|hasSEendlessUpgrade|hasUpgradeEffect)\\s*\\([^)]*?" + tok +
                "|\\.upgrades\\s*\\.\\s*(?:includes|indexOf)\\s*\\(\\s*" + tok +
                "|\\.upgrades\\s*\\[\\s*" + tok);
            let mentioned = false;
            for (const { f, rec: r } of modderRecs) {
                const hay = f === L.file ? layerHay : r.clean;
                if (consumer.test(hay)) { mentioned = true; break; }
            }
            if (!mentioned) deadUpgrades.push({ L, id, idx: s.start });
        }
    }
    if (deadUpgrades.length) {
        const ids = deadUpgrades.slice(0, 12).map((d) => `"${d.id}"`).join(", ");
        add(FAIL, "N-UNWIRED", deadUpgrades[0].L.file, deadUpgrades[0].idx,
            `${deadUpgrades.length} upgrade(s) define effect() but their id is never referenced anywhere in the mod files (${ids}${deadUpgrades.length > 12 ? " …" : ""}) — the effect is never read, so buying them changes nothing. This is the single most common way a generated TMT game silently does nothing (54.4% of real upgrades have NO effect() precisely because their power is wired into gainMult/gainExp/passiveGeneration instead)`,
            "Either (a) wire the id into the consumer: `if (hasUpgrade(\"" + deadUpgrades[0].L.id + "\", " + deadUpgrades[0].id + ")) ret = ret.times(2)` inside the relevant gainMult()/gainExp()/passiveGeneration()/getPointGen(), or (b) if it is a flag ticket, drop the effect() and put the consequence in onPurchase(). An effect() that is only read by effectDisplay() is a lie: it shows a number that never applies.");
    } else {
        pass("N-UNWIRED", "every effect()-bearing upgrade is referenced somewhere in the mod files");
    }
}

// D-LOCALWIRE — a main layer whose own upgrades never touch its own production.
// Real games usually DO wire at least one (cost ≤0 guidance: the layer's upgrades are
// the player's main lever on that layer). WARN only — cross-layer-only boosts are a
// legitimate (if unusual) design.
{
    let flagged = 0;
    for (const L of layers) {
        if (L.isSide || L.isUtility) continue;
        const rec = fileRecs.get(L.file);
        if (!rec) continue;
        const ups = layerUpgradeSpans(rec, L, "upgrades");
        const withEffect = ups.filter((s) => /(^|[{,])\s*effect\s*\(/.test(s.text));
        if (withEffect.length < 3) continue;
        const hookSrc = ["gainMult", "gainExp", "passiveGeneration", "update"]
            .map((kw) => { const m = L.code.match(new RegExp("\\b" + kw + "\\s*\\(")); return m ? functionBody(L.code, m.index) || "" : ""; })
            .join("\n");
        const wired = withEffect.filter((s) => new RegExp("(?<![\\w$])" + String(s.key) + "(?![\\w$])").test(hookSrc));
        if (wired.length === 0) {
            flagged++;
            add(WARN, "D-LOCALWIRE", L.file, L.start,
                `layer "${L.id}" has ${withEffect.length} effect()-bearing upgrades but its gainMult/gainExp/passiveGeneration/update reference NONE of them — the layer's upgrades do nothing for the layer they live in`,
                "Wire at least one: `if (hasUpgrade(\"" + L.id + "\", 11)) ret = ret.times(2)` in gainMult(). If the boosts are deliberately all cross-layer, note that in the brief.");
        }
    }
    if (flagged === 0) pass("D-LOCALWIRE", "main layers wire at least one of their own upgrades into production");
}

// N-GHOSTFIELD — component keys the ENGINE DOES NOT READ. Every entry below was checked
// against references/core/04 field tables AND the bundled engine source, not inferred
// from corpus absence:
//   js/components.js:148 renders `challenges[data].rewardDescription` — NOT `reward`
//   js/technical/layerSupport.js:109-110 defaults `completionLimit` to 1 (so challenges
//     ARE repeatable; do not flag completionLimit)
// Corpus counts for orientation: reward 212 (all render a BLANK reward line),
// canBypass/repeatable/countTowardsCompletion 0, persistent 0, condition() 0, grids 0.
{
    const GHOSTS = {
        challenges: [["reward", "use rewardDescription (text) + rewardEffect() (value) — the engine renders rewardDescription (js/components.js:148), so `reward:` shows nothing"],
            ["repeatable", "not a TMT field — use completionLimit (a number; engine defaults it to 1, js/technical/layerSupport.js:109)"],
            ["canBypass", "not a TMT field — a bypassable challenge needs an onExit()-driven flag of your own"],
            ["countTowardsCompletion", "not a TMT field — use countsAs: [id, …] to have one challenge count for another"]],
        milestones: [["persistent", "milestones are always persistent in TMT v2.7 — delete the key"]],
        achievements: [["condition", "layer achievements use done(), not condition() (0 of 3,032 real achievements use condition(); global addAchievement is also 0)"],
            ["secret", "TMT achievements are always listed (uncompleted ones render dimmed) — hide nothing"]],
    };
    let ghostHits = 0;
    for (const L of layers) {
        const rec = fileRecs.get(L.file);
        if (!rec) continue;
        for (const coll of Object.keys(GHOSTS)) {
            for (const s of layerUpgradeSpans(rec, L, coll)) {
                for (const [k, why] of GHOSTS[coll]) {
                    const km = new RegExp("(^|[{,])\\s*" + k + "\\s*[:(]").exec(s.text);
                    if (!km) continue;
                    ghostHits++;
                    add(WARN, "N-GHOSTFIELD", L.file, s.start + km.index + km[1].length,
                        `layer "${L.id}" ${coll}."${s.key}" defines \`${k}\` — ${why}`,
                        "Rewrite it with the field the engine actually reads; a ghost key is silently dropped at runtime.");
                }
            }
        }
        // layer-level: `grids` is not a TMT collection (it is `grid`, singular), and corpus = 0
        if (/(^|[{,])\s*grids\s*:/.test(L.code))
            add(WARN, "N-GHOSTFIELD", L.file, L.start, `layer "${L.id}" defines \`grids:\` — the TMT grid component is \`grid\` (singular); \`grids\` is silently ignored (0 of 1,156 real layers use it)`, "Rename to grid: { … }.");
    }
    if (ghostHits === 0) pass("N-GHOSTFIELD", "no ghost component fields");
}

// D-EFFECTSHAPE — corpus effect-op frequencies across 6,274 effect-bearing upgrades:
//   .pow 4,830 · .add 3,364 · .log10 3,350 · .mul/.times 1,652 · .sqrt 61 · softcap 39
// i.e. power/log shapes outnumber plain multiplies ~3:1. A layer whose every effect is a
// flat ×2 has the shape of an unfinished draft. (D-EFFECTMONO measures the same axis from
// the share side; this one fires when the layer has NO non-linear effect at all.)
{
    let flagged = 0;
    for (const L of layers) {
        if (L.isSide || L.isUtility) continue;
        const rec = fileRecs.get(L.file);
        if (!rec) continue;
        const withEffect = layerUpgradeSpans(rec, L, "upgrades").filter((s) => /(^|[{,])\s*effect\s*\(/.test(s.text));
        if (withEffect.length < 5) continue;
        const shaped = withEffect.filter((s) => /\.(pow|log10?|log)\s*\(|\bsqrt\s*\(|\bsoftcap\s*\(|\.sqrt\s*\(/.test(s.text));
        if (shaped.length === 0) {
            flagged++;
            add(WARN, "D-EFFECTSHAPE", L.file, L.start,
                `layer "${L.id}": all ${withEffect.length} effect()-bearing upgrades are flat multipliers — no .pow()/.log()/.sqrt()/softcap() anywhere. Real TMT layers use power/log shapes ~3:1 against plain .times() (corpus: pow 4,830 vs multiply 1,652)`,
                "Give at least one upgrade a shaped effect so the layer's growth is not purely linear: `return player.this.points.add(2).pow(0.5)` or `.log10().add(1).pow(0.2)`.");
        }
    }
    if (flagged === 0) pass("D-EFFECTSHAPE", "main layers include at least one power/log-shaped effect");
}

// D-COSTSPAN — corpus cost-ladder shape. Of 5,038 literal upgrade costs, 38.7% are ≥1e10
// and the ladder spans many orders; the worked example (c0v1d layer "s") runs 5e3 →
// Decimal.pow(10, 545766). A layer whose literal costs all sit within one order of
// magnitude has a flat ladder: no sense of escalating stakes, and no room for the
// exponential tail that late-game layers need. (D-REQRATIO covers the LAYER ladder;
// this covers the COST ladder INSIDE a layer.)
//
// The 3-order bar is only meaningful for NORMAL layers. A static layer's currency is a
// floor COUNT, and the count grows as log2(stardust) (getResetGain, game.js:22) — a real
// game tops out around 50-70 floors, so 6 orders would mean 2^1e6 stardust, unreachable at
// any stage. Measured on that game's 34 static layers: every cost ladder was 11 entries
// spanning 1 → 64, i.e. 1.80 orders — the deliberate shape 1,2,4,8,16,2,8,16,32,48,64,
// with a key upgrade dropping back to 2. The 3-order bar fired on all 34 and meant
// nothing. Static layers therefore get a 1-order bar, which still catches a truly flat
// ladder (every cost identical) without condemning the correct shape.
{
    const SPAN_BAR = 3;      // normal layers: corpus ladders span 6+ orders
    const SPAN_BAR_STATIC = 1; // static layers: floors grow as log2(stardust), ~50-70 real range
    let flagged = 0;
    for (const L of layers) {
        if (L.isSide || L.isUtility) continue;
        const rec = fileRecs.get(L.file);
        if (!rec) continue;
        const ups = layerUpgradeSpans(rec, L, "upgrades");
        if (ups.length < 8) continue;
        const logs = [];
        for (const s of ups) {
            const cm = s.text.match(/(^|[{,])\s*cost\s*:\s*new\s+Decimal\s*\(\s*("?[\d.]+(e[+-]?\d+)?)\s*\)/i);
            if (!cm) continue;
            const v = Number(cm[2].replace(/"/g, ""));
            if (isFinite(v) && v > 0) logs.push(Math.log10(v));
        }
        if (logs.length < 8) continue;
        const span = Math.max(...logs) - Math.min(...logs);
        const isStatic = L.type === "static";
        const bar = isStatic ? SPAN_BAR_STATIC : SPAN_BAR;
        if (span < bar) {
            flagged++;
            add(WARN, "D-COSTSPAN", L.file, L.start,
                `layer "${L.id}": ${logs.length} literal upgrade costs span only ${span.toFixed(1)} orders of magnitude (${Math.pow(10, Math.min(...logs)).toExponential(1)} → ${Math.pow(10, Math.max(...logs)).toExponential(1)}) — a flat ladder with no escalating stakes.${isStatic ? " This is a STATIC layer, so its currency is a floor COUNT growing as log2(stardust) and the bar is 1 order, not 3 — but a ladder that does not move at all still buys nothing with escalation" : " Real layers span 6+ orders (corpus: 38.7% of literal costs are ≥1e10)"}`,
                "Spread the ladder across orders — first upgrade ~1, last a hard ticket (`Decimal.pow(10, n)` with a hand-picked exponent). Non-monotonic drops are fine and are a real rhythm device (a cheap key upgrade amid an expensive chain). A static layer's reference ladder is 1,2,4,8,16,2,8,16,32,48,64 (1.8 orders).");
        }
    }
    if (flagged === 0) pass("D-COSTSPAN", "layer cost ladders span escalating orders of magnitude");
}

// ===========================================================================
// Handbook-12 rules (2026-10-03) — design notes by Acamaeda, the author of TMT.
// Source: references/design/12-Author-Design-Wisdom.md (dated 2020-10 .. 2023-04).
// ===========================================================================

// N-ARROWTHIS — "Don't use the () => notation because you can't use the 'this' keyword in
// them." (2020-10-07). The engine invokes layer/component hooks with the component as `this`,
// and nearly every useful one reads this.layer / this.id / this.points. An arrow function has
// no own `this`, so those resolve to undefined and the game misbehaves silently.
{
    const ARROW_FIELDS = ["gainMult", "gainExp", "passiveGeneration", "softcap", "canReset", "startData",
        "baseAmount", "layerShown", "update", "effect", "effectDisplay", "unlocked", "done", "unlock",
        "cost", "canComplete", "rewardEffect", "rewardDisplay", "onPurchase", "onComplete", "onEnter", "onExit",
        "getStyle", "getTitle", "getDisplay", "getCanClick", "onClick", "onHold", "buttonStyle"];
    let arrowHits = 0;
    for (const L of layers) {
        const rec = fileRecs.get(L.file);
        if (!rec) continue;
        const mask = rec.mask.slice(L.start, L.end + 1);
        const re = /(?:^|[{,;]\s*)([A-Za-z_$][\w$]*)\s*:\s*(?:async\s*)?\([^)]*\)\s*=>/g;
        for (const m of codeMatches(L.code, mask, re)) {
            if (!ARROW_FIELDS.includes(m[1])) continue;
            arrowHits++;
            const arrowAt = m.index + m[0].length - 2;
            let end = arrowAt, depth = 0;
            for (let i = arrowAt; i < L.code.length; i++) {
                const ch = L.code[i];
                if (ch === "(" || ch === "[" || ch === "{") depth++;
                else if (ch === ")" || ch === "]" || ch === "}") { if (depth === 0) break; depth--; }
                else if (ch === "," && depth === 0) break;
                end = i;
            }
            if (!/\bthis\b/.test(L.code.slice(arrowAt, end))) continue; // harmless arrow, style only
            add(FAIL, "N-ARROWTHIS", L.file, L.start + m.index,
                `layer "${L.id}" defines \`${m[1]}\` as an arrow function but its body uses \`this\` — arrow functions have no own \`this\`, so this.layer / this.id / this.points are undefined and the engine's component context is lost (TMT author, 2020-10-07)`,
                `Write it as a normal function: ${m[1]}() { ... }. Every layer/component hook the engine calls takes its context from \`this\`.`);
        }
    }
    if (arrowHits === 0) pass("N-ARROWTHIS", "no layer/component hook uses an arrow function with `this`");
}

// N-CONTRAST — "Make sure that your layer colors don't make the text too hard to read. Don't
// choose a dark color unless you plan to change the background of the main display and the
// color of the text on upgrades, buyables, etc." (2023-04-17)
//
// Verified in the bundled engine, and the two uses pull AGAINST each other:
//   js/components.js:239  the layer's currency amount is rendered AS TEXT in this color
//                         (plus a glow of the same color) on the page background #0f0f0f
//   css/tree-node.css:7   the tree node paints the color as a background under DARK text
//                         (rgba(0,0,0,0.5)), so the node wants a LIGHT color
// No single value satisfies both with the stock theme — which is exactly what the author is
// warning about. So this rule checks only the direction with no counter-pressure: a color too
// dark to read as TEXT on the page background, which silently hides the player's own balance.
// The opposite tension is design guidance, not a defect (handbook 12 §6-34).
{
    const PAGE_BG = "#0f0f0f";
    const relLum = (r, g, b) => {
        const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const lumOf = (hex) => {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
        if (!m) return null;
        const n = parseInt(m[1], 16);
        return relLum((n >> 16) & 255, (n >> 8) & 255, n & 255);
    };
    const ratio = (a, b) => { const hi = Math.max(a, b), lo = Math.min(a, b); return (hi + 0.05) / (lo + 0.05); };
    const bgLum = lumOf(PAGE_BG);
    let contrastHits = [];
    for (const L of layers) {
        if (!L.color) continue;
        const lum = lumOf(L.color);
        if (lum === null) continue;
        const cr = ratio(lum, bgLum);
        if (cr < 4.5) contrastHits.push({ id: L.id, color: L.color, cr, file: L.file, at: L.start });
    }
    if (contrastHits.length === 0) pass("N-CONTRAST", "layer colors are readable as text on the page background");
    else {
        contrastHits.sort((a, b) => a.cr - b.cr);
        const ex = contrastHits.slice(0, 4).map((c) => `${c.id} ${c.color} (${c.cr.toFixed(1)}:1)`).join("; ");
        add(WARN, "N-CONTRAST", contrastHits[0].file, contrastHits[0].at,
            `${contrastHits.length}/${layers.length} layer color(s) too dark to read as text on the page background ${PAGE_BG} (worst: ${ex}${contrastHits.length > 4 ? "; …" : ""}). The engine renders the layer's currency amount in this color (js/components.js:239), so the player's own balance disappears (TMT author, 2023-04-17)`,
            "Brighten those colors, or override the amount's style yourself. Note the opposite tension: the tree node paints this color behind DARK text (css/tree-node.css:7), so erring bright is the safe side.");
    }
}

// N-UNLOCKPAYGATE — "It's usually not good to have to buy an upgrade to unlock something that
// you also have to pay to use after (like a buyable or prestige layer). You don't get a
// benefit from buying the upgrade, it just takes your currency. And you don't know how much
// the thing it unlocks will cost, so you can't plan ahead for it either. Usually you should
// use a threshold of some kind." (2022-06-26)
//
// Complements N-UNLOCKDEAD (FAIL — nothing can ever set the flag) by catching the design smell:
// an upgrade whose only job is to admit the player to a layer that still charges a toll.
{
    const layerById = new Map(layers.map((L) => [L.id, L]));
    const hasRequires = (L) => {
        const rec = fileRecs.get(L.file);
        if (!rec) return false;
        return /\brequires\s*:/.test(L.code);
    };
    const titleOf = (txt) => {
        const m = /(?:title|description)\s*:\s*(["'])([^"']*)\1/.exec(txt);
        return m ? m[2] : "";
    };
    // Only the PLAYER-FACING text can promise an unlock. Every component carries an
    // `unlocked()` gate field, and /unlock/i matches "unlocked" — so testing the whole
    // entry flagged `unlocked() { return hasUpgrade("ps", 12) }` as an unlock promise and
    // then read the entry's `player.fu.points` as "unlocking fu". On a real generated game
    // that produced 97 phantom pairs (0 genuine: the flagged upgrade's own title and
    // description never mentioned unlocking anything). Restrict to title/description/name
    // literals — the same trap classifyUpgrade() already sidesteps for D-EFFECTMONO.
    const promoText = (entryText) => {
        const out = [];
        const re = /(?:^|[,{]\s*|\n\s*)(?:title|description|name)\s*:\s*(["'`])([\s\S]*?)\1/g;
        let m;
        while ((m = re.exec(entryText))) out.push(m[2]);
        return out.join(" \n ");
    };
    // A layer id like "wall", "n" or "gh" also occurs as an ordinary English word, so a bare
    // \bid\b test produces garbage. Require an actual REFERENCE: quoted, dotted (player.x),
    // parenthesised in the description, or written next to the noun that names it — in
    // either order, because upgrade text says both "the n wing" and "unlocks layer n".
    const referencesLayer = (txt, id) => {
        const e = escapeRe(id);
        return new RegExp(
            "[\"'`]" + e + "[\"'`]" +              // "x" / 'x' / `x`
            "|\\bplayer\\." + e + "\\b" +           // player.x
            "|\\blayers\\." + e + "\\b" +           // layers.x
            "|\\(\\s*" + e + "\\s*\\)" +            // "... wing (x)"
            "|\\b" + e + "\\s+(?:wing|layer|tree|tab)\\b" +   // "the n wing"
            "|\\b(?:wing|layer|tree|tab)\\s+" + e + "\\b",     // "unlocks layer n"
            "i").test(txt);
    };
    let gateHits = [];
    for (const L of layers) {
        if (L.isUtility) continue;
        const rec = fileRecs.get(L.file);
        if (!rec) continue;
        for (const s of layerUpgradeSpans(rec, L, "upgrades")) {
            const promo = promoText(s.text);
            if (!promo || !/\bunlock/i.test(promo)) continue;
            for (const t of layers) {
                if (t.id === L.id) continue;
                if (!referencesLayer(promo, t.id)) continue;
                if (!hasRequires(t)) continue;   // free to enter -> onPurchase is fine
                gateHits.push({ file: L.file, at: s.start, from: L.id, key: s.key, to: t.id, title: titleOf(s.text) });
            }
        }
    }
    if (gateHits.length === 0) pass("N-UNLOCKPAYGATE", "no upgrade gates a layer the player must also pay to enter");
    else {
        // Reported once per game: this is a systemic design pattern, and one WARN per
        // occurrence buries the signal. Count + examples is what a reviewer can act on.
        const ex = gateHits.slice(0, 4).map((g) => `${g.from}-${g.key}${g.title ? ` (“${g.title}”)` : ""} → "${g.to}"`).join("; ");
        add(WARN, "N-UNLOCKPAYGATE", gateHits[0].file, gateHits[0].at,
            `${gateHits.length} upgrade/layer pair(s) gate a paid layer behind a purchase — the player pays once for the upgrade and again for the layer's \`requires\`, with no warning of the second price (e.g. ${ex}${gateHits.length > 4 ? "; …" : ""}). TMT author, 2022-06-26`,
            "Unlock those layers by threshold instead: a milestone, the previous layer's `requires`, or a [\"display-text\", …] line announcing when it unlocks. Keep `onPurchase()` for things that are free to use afterwards (subtabs, shops, mechanics). Note this WARN is systemic by design — either fix the pattern or record why this game wants pay-to-enter (it is a legitimate choice, it just needs to be a deliberate one).");
    }
}

// N-HOTKEYDESC — "Don't forget to add hotkeys! You need to have the key in the description,
// like 'p: reset for prestige points'" (2020-10-07). The key is what TMT renders on the
// button; without it in the text the player never learns the binding.
{
    let hotkeys = 0, labelled = 0;
    for (const L of layers) {
        const rec = fileRecs.get(L.file);
        if (!rec) continue;
        const hm = L.code.match(/\bhotkeys\s*:\s*\[/);
        if (!hm) continue;
        const open = hm.index + hm[0].length - 1;
        // stay inside L.code: its indices are layer-relative, not file-relative
        const layerMask = rec.mask.slice(L.start, L.end + 1);
        const close = matchBracket(L.code, layerMask, open);
        if (close < 0) continue;
        const seg = L.code.slice(open, close + 1);
        const segMask = layerMask.slice(open, close + 1);
        const re = /\bkey\s*:\s*(["'])([^"']+)\1\s*,\s*description\s*:\s*(["'])([^"']*)\3/g;
        for (const h of codeMatches(seg, segMask, re)) {
            hotkeys++;
            if (new RegExp("(?:^|\\W)" + escapeRe(h[2]) + "\\s*:", "i").test(h[4])) { labelled++; continue; }
            add(WARN, "N-HOTKEYDESC", L.file, L.start + hm.index,
                `layer "${L.id}" hotkey "${h[2]}" has description "${h[4]}" without the key in it — the player never sees which key to press (TMT author, 2020-10-07)`,
                `Put the key in the text, e.g. "${h[2]}: reset for ${(L.config && L.config.resource) || "prestige points"}".`);
        }
    }
    if (hotkeys === 0) pass("N-HOTKEYDESC", "no hotkeys declared");
    else pass("N-HOTKEYDESC", `${labelled}/${hotkeys} hotkeys name their key in the description`);
}

// ===========================================================================
// Lifecycle rules (2026-10-04) — from the The Galaxy Nebula postmortem
// (E:\Idle-Skill\The-Galaxy-Nebula\FINDINGS.md).
//
// Every defect below passed the ENTIRE existing rule set with 0 FAIL. They share one
// shape: each part is individually reasonable, and the COMBINATION produces an
// unrecoverable save. The older rules check wiring and magnitude; these check what
// SURVIVES a reset. All three player reports in that postmortem were of this shape,
// and all three predated any automated check.
// ===========================================================================

const maskOf = (L) => {
    const rec = fileRecs.get(L.file);
    return rec ? rec.mask.slice(L.start, L.end + 1) : null;
};

// Body of a layer-level hook in any of the spellings the engine accepts:
// `foo() {}`, `foo: function() {}`, `foo: () => {}`. "" when the hook is absent.
// (A bare `doReset(this.layer)` call inside a hotkey is not a definition: it is not
// preceded by a key position, so the defRe below does not match it.)
function layerHookBody(L, name) {
    const mask = maskOf(L);
    if (!mask) return "";
    // the `g` flag is REQUIRED: codeMatches() drives lastIndex itself, and a non-global
    // exec() restarts at 0 forever.
    const defs = codeMatches(L.code, mask, new RegExp("(?:^|[,{\\n])\\s*" + name + "\\s*[(:]", "g"));
    if (!defs.length) return "";
    const open = L.code.indexOf("(", defs[0].index);
    if (open < 0) return "";
    let i = open, d = 0;
    for (; i < L.code.length; i++) {
        const c = L.code[i];
        if (c === "(") d++;
        else if (c === ")") { d--; if (d === 0) { i++; break; } }
    }
    while (i < L.code.length && /\s/.test(L.code[i])) i++;
    if (L.code[i] !== "{") return ""; // expression-bodied arrow or a variable ref
    const end = matchBracketFrom(L.code, i);
    return end < 0 ? L.code.slice(i) : L.code.slice(i, end + 1);
}

// The set of milestones a hook demands, as "layerId:n". `hasMilestone(this.layer, n)`
// resolves to the layer that owns the hook — which is how most layers gate their own
// automation. Compare these as SETS: milestone NUMBERS only approximate an ordering,
// so "autoPrestige needs a higher number" is not the same claim as "autoPrestige
// implies resetsNothing".
function milestoneSetFrom(body, selfId) {
    const s = new Set();
    const re = /hasMilestone\s*\(\s*(?:"([^"]+)"|'([^']+)'|this\s*\.\s*layer)\s*,\s*(\d+)\s*\)/g;
    let m;
    while ((m = re.exec(body))) s.add((m[1] || m[2] || selfId) + ":" + m[3]);
    return s;
}

// Fields layerDataReset() preserves with no argument (game.js:141).
const ALWAYS_KEPT = new Set(["unlocked", "forceTooltip", "noRespecConfirm", "prevTab"]);

// Resolve the keep list a doReset() hands to layerDataReset(). Handles the two shapes
// real code uses: an inline array, and `let kept = [...]` plus later `kept.push(...)`.
function resolveKeepList(doResetBody) {
    const call = /layerDataReset\s*\(/.exec(doResetBody);
    if (!call) return { calls: false, known: true, names: new Set() };
    const open = doResetBody.indexOf("(", call.index);
    const close = matchBracketFrom(doResetBody, open);
    if (close < 0) return { calls: true, known: false, names: new Set() };
    const args = doResetBody.slice(open + 1, close);
    const parts = [];
    let d = 0, cur = "";
    for (const ch of args) {
        if (ch === "(" || ch === "[" || ch === "{") d++;
        else if (ch === ")" || ch === "]" || ch === "}") d--;
        if (ch === "," && d === 0) { parts.push(cur); cur = ""; } else cur += ch;
    }
    if (cur.trim()) parts.push(cur);
    const keepArg = (parts[1] || "").trim();
    const names = new Set();
    const quoted = (txt) => { for (const mm of txt.matchAll(/["']([^"']+)["']/g)) names.add(mm[1]); };
    if (!keepArg) return { calls: true, known: true, names };
    if (keepArg.startsWith("[")) { quoted(keepArg); return { calls: true, known: true, names }; }
    if (/^[A-Za-z_$][\w$]*$/.test(keepArg)) {
        const init = new RegExp("\\b" + keepArg + "\\s*=\\s*\\[([\\s\\S]*?)\\]").exec(doResetBody);
        if (!init) return { calls: true, known: false, names };
        quoted(init[1]);
        const pushRe = new RegExp("\\b" + keepArg + "\\s*\\.\\s*push\\s*\\(([^)]*)\\)", "g");
        let pm;
        while ((pm = pushRe.exec(doResetBody))) quoted(pm[1]);
        return { calls: true, known: true, names };
    }
    return { calls: true, known: false, names };
}

// N-MSDESTROY — a milestone whose condition reads a field that an upper-row reset erases.
// layerDataReset() (game.js:140-161) rebuilds the layer from startData() and keeps ONLY
// {unlocked, forceTooltip, noRespecConfirm, prevTab} plus whatever keep list it is given.
// rowReset() (game.js:129-138) fires it for every lower-row layer that has NO doReset hook
// of its own, and for those that do, the hook decides. So the lifetime record a late
// milestone is supposed to read back is destroyed by the very act of progressing — the
// milestone demands 1e8 layers, and the resets it needs to reach there are what erase it.
// The only way to find this by hand is to play far enough to hit it.
{
    const rowNums = mainLayers.filter((L) => L.row != null).map((L) => L.row);
    let hits = 0, unknownKeep = 0;
    for (const L of layers) {
        if (L.isSide || L.isUtility || L.row == null) continue;
        if (!rowNums.some((r) => r > L.row)) continue; // nothing above it: safe by position
        const mask = maskOf(L);
        if (!mask) continue;
        let kept;
        const definesDoReset = codeMatches(L.code, mask, /(?:^|[,{\n])\s*doReset\s*[(:]/g).length > 0;
        if (!definesDoReset) {
            // rowReset() takes the else-branch: the engine wipes this layer itself, and it
            // passes no keep list at all.
            kept = new Set();
        } else {
            const r = resolveKeepList(layerHookBody(L, "doReset"));
            if (!r.calls) continue; // its own doReset wipes nothing of itself
            kept = r.names;
            if (!r.known) unknownKeep++;
        }
        const rec = fileRecs.get(L.file);
        if (!rec) continue;
        const fieldRe = new RegExp(
            "player\\s*(?:\\[\\s*this\\s*\\.\\s*layer\\s*\\]|\\.\\s*" + escapeRe(L.id) + ")\\s*\\.\\s*(points|best|total)\\b", "g");
        const liveHits = [], recordHits = [];
        for (const ms of layerUpgradeSpans(rec, L, "milestones")) {
            const dm = /(?:^|[,{]\s*|\n\s*)done\s*\(/.exec(ms.text);
            if (!dm) continue;
            const body = functionBody(ms.text, dm.index);
            if (!body) continue;
            for (const fm of body.matchAll(fieldRe)) {
                const field = fm[1];
                const survives = ALWAYS_KEPT.has(field) || kept.has(field);
                if (survives) continue;
                (field === "points" ? liveHits : recordHits).push(`M${ms.key} reads .${field}`);
            }
        }
        if (!liveHits.length && !recordHits.length) continue;
        hits++;
        const keptDesc = definesDoReset
            ? `its doReset() keeps [${[...kept].join(", ") || "nothing"}]`
            : "it defines no doReset(), so rowReset() calls layerDataReset() with the default keep list";
        const detail = [...liveHits, ...recordHits].slice(0, 5).join("; ");
        const why = liveHits.length
            ? `A milestone reading the LIVE counter is checked against a number an upper reset zeroes — in a real game a milestone demanding 1e8 floors could never fire, because the resets needed to reach it wiped the counter every time.`
            : `The lifetime record is exactly what the reset destroys: layerDataReset() rebuilds the layer from startData(), so the threshold the milestone is scored against is erased by the progression that is supposed to earn it.`;
        add(FAIL, "N-MSDESTROY", L.file, L.start,
            `layer "${L.id}" (row ${L.row}) has ${liveHits.length + recordHits.length} milestone condition(s) reading a field that a higher-row reset erases — ${keptDesc} (${detail}). ${why}`,
            `Keep the lifetime fields: give the layer \`doReset() { layerDataReset(this.layer, ["unlocked", "best", "total"]) }\`, and score milestones on \`.best\` / \`.total\`, never the live \`.points\`. (TMT author wisdom: milestones are persistent — engine/game.js:140. Found via player reports on a generated game, invisible to every wiring/magnitude rule.)`);
    }
    if (hits === 0) pass("N-MSDESTROY", "no milestone reads a field that an upper-row reset erases");
    else if (unknownKeep) add(WARN, "N-MSDESTROY", modJsPath, null, `${unknownKeep} layer(s) pass a keep list this scanner could not resolve statically — their milestone/reset interaction is unverified`, "Build the keep list from a literal array, or `const kept = [...]` plus `kept.push(...)`, so the preserved set is readable.");
}

// N-AUTOWIPE — an automation hook that can fire while the reset is still destructive.
// The engine calls doReset() straight from the game loop with NO player toggle in the
// path: `if (tmp[layer].autoPrestige && tmp[layer].canReset) doReset(layer)` (game.js:369
// and :378). Inside, `if (run(layers[layer].resetsNothing, layers[layer])) return`
// (game.js:211) is the only thing standing between the player and a wipe. So the invariant
// is a set relation: autoPrestige's condition must IMPLY resetsNothing's. Compare the
// milestone sets, not the numbers — a layer that automatises before its own safety
// milestone is a currency wipe the player can neither stop nor outrun. In a real game 52
// of 98 automated layers were in this state, wiping their own food supply every frame.
{
    let violations = 0, okAuto = 0;
    const falseToggleLayers = [];
    const anyAutoRead = allModderCandidates.some((f) => {
        const rec = loadRec(f);
        return codeMatches(rec.clean, rec.mask,
            /player\s*(?:\[\s*this\s*\.\s*layer\s*\]|\.\s*[A-Za-z_$][\w$]*)\s*\.\s*auto\b/g).length > 0;
    });
    for (const L of layers) {
        if (L.isUtility) continue;
        const autoBody = layerHookBody(L, "autoPrestige");
        if (!autoBody) continue;
        const auto = milestoneSetFrom(autoBody, L.id);
        const fmt = (s) => [...s].map((k) => { const [id, n] = k.split(":"); return `${id} M${n}`; }).join(" + ") || "(no milestone gate)";
        if (auto.size === 0) {
            violations++;
            add(FAIL, "N-AUTOWIPE", L.file, L.start,
                `layer "${L.id}" autoPrestige() is not gated by any milestone — as soon as canReset() is true the engine calls doReset() every frame (game.js:369), and nothing in that path consults the player`,
                "Gate it: `autoPrestige() { if (hasMilestone(this.layer, 2)) return true }` — and read N-AUTOWIPE's other half below: the gate must also imply resetsNothing().");
            continue;
        }
        const rnBody = layerHookBody(L, "resetsNothing");
        if (!rnBody) {
            violations++;
            add(FAIL, "N-AUTOWIPE", L.file, L.start,
                `layer "${L.id}" auto-prestiges at ${fmt(auto)} but defines NO resetsNothing() — doReset() therefore zeroes its own baseAmount and sweeps every lower row (game.js:211-224), automatically and irreversibly`,
                "Add `resetsNothing() { if (<the milestone that makes this reset safe>) return true }`, and make autoPrestige() require that same milestone (see the invariant below).");
            continue;
        }
        const safe = milestoneSetFrom(rnBody, L.id);
        if (safe.size === 0) {
            add(WARN, "N-AUTOWIPE", L.file, L.start,
                `layer "${L.id}" resetsNothing() has no hasMilestone() gate, so its condition cannot be compared against autoPrestige()'s (${fmt(auto)})`,
                "Express resetsNothing() as milestone checks so the two can be compared as sets — an automation you cannot prove safe is an automation you cannot ship.");
            continue;
        }
        const missing = [...safe].filter((k) => !auto.has(k));
        const fmtMissing = missing.map((k) => { const [id, n] = k.split(":"); return `${id} M${n}`; }).join(", ");
        if (missing.length) {
            violations++;
            add(FAIL, "N-AUTOWIPE", L.file, L.start,
                `layer "${L.id}" auto-prestiges at ${fmt(auto)} but the reset only becomes non-destructive at ${fmt(safe)} — so the automation runs ${missing.length} milestone(s) early (${fmtMissing}). Every one of those frames wipes what the safety milestone is priced in, so the milestone can never be bought and the wipe never stops. THE INVARIANT: autoPrestige's condition must be at least as strict as resetsNothing's.`,
                `Widen the auto gate: \`autoPrestige() { if (${[...auto, ...missing].map((k) => { const [id, n] = k.split(":"); return `hasMilestone(${JSON.stringify(id)}, ${n})`; }).join(" && ")}) return true }\`. Automation that eats its own supply is not automation — accept that it arrives later.`);
        } else okAuto++;
        // the empty promise: a keep list that preserves "auto" which nothing ever reads
        const kr = resolveKeepList(layerHookBody(L, "doReset"));
        if (kr.calls && kr.names.has("auto") && !anyAutoRead) falseToggleLayers.push(L);
    }
    if (violations === 0) pass("N-AUTOWIPE", `autoPrestige implies resetsNothing on every automated layer (${okAuto} checked)`);
    // Reported once for the whole game: this is a systemic wording/state problem, and one
    // WARN per layer buries the FAILs above. (A real game preserved "auto" on all 98 layers.)
    if (falseToggleLayers.length && !anyAutoRead) {
        const ex = falseToggleLayers.slice(0, 4).map((L) => `"${L.id}"`).join(", ");
        add(WARN, "N-AUTOWIPE", falseToggleLayers[0].file, falseToggleLayers[0].start,
            `${falseToggleLayers.length} layer(s) preserve an "auto" flag across resets (${ex}${falseToggleLayers.length > 4 ? "; …" : ""}), but NO code anywhere in the mod files ever reads player[layer].auto — the engine calls doReset() from the game loop with no toggle in the path (game.js:369). The flag is dead state, and any milestone text calling this automation "toggleable" promises a switch the player does not have.`,
            "Either implement the toggle (a hasMilestone/achievement gate the player controls, checked in autoPrestige()) or stop describing it as toggleable and tell the player plainly that it is always on. Note this WARN is systemic by design — record the decision in the brief if the game means it to be always-on.");
    }
}

// N-POINTSWRITE — update() writing a layer's own points directly instead of through
// addPoints(). addPoints() (game.js:165-169) is the only thing that maintains `best` and
// `total`, so a direct assignment leaves every milestone scored on those two reading a
// stale number. On a STATIC layer it is far worse: the reset gain is
// `…floor().sub(player[layer].points).add(1)` (game.js:24) — every floor trickled in is a
// floor the next prestige cannot bank. A real game trickled 0.02 floors/sec into a static
// layer, and one hour of idling silently ate ~72 floors of income, decaying to the engine's
// floor of 1. (Only ASSIGNMENT is a defect: TMT's Decimal is immutable, so
// `player.x.points.add(1).pow(0.5)` is a read, and is the single most common gain shape.)
{
    const PTS_ASSIGN = (id) => new RegExp(
        "player\\s*(?:\\[\\s*this\\s*\\.\\s*layer\\s*\\]|\\.\\s*" + escapeRe(id) + ")\\s*\\.\\s*points\\s*(?:[-+*/%]?=)(?!=)");
    let staticHits = [], normalHits = [];
    for (const L of layers) {
        if (L.isUtility) continue;
        const um = /(?:^|[,{\n])\s*update\s*\(/.exec(L.code);
        const body = um ? functionBody(L.code, um.index) : "";
        if (!body) continue;
        const re = PTS_ASSIGN(L.id);
        if (!re.exec(body)) continue;
        (L.type === "static" ? staticHits : normalHits).push(L);
    }
    // Aggregated: a game that trickles everywhere would otherwise bury the static
    // (fatal) half under dozens of normal-layer WARNs.
    if (staticHits.length) {
        const ex = staticHits.slice(0, 4).map((L) => `"${L.id}"`).join(", ");
        add(FAIL, "N-POINTSWRITE", staticHits[0].file, staticHits[0].start,
            `${staticHits.length} STATIC layer(s) assign player[layer].points inside update() (${ex}${staticHits.length > 4 ? "; …" : ""}) — the static reset gain is \`gain.floor().sub(player[layer].points).add(1)\` (game.js:24), so every floor added by hand is a floor the next prestige cannot bank. The layer fills itself while producing less and less, decaying to the engine's floor of 1. In a real game this idled away ~72 floors of income per hour with no error anywhere.`,
            "Do not trickle a static layer's counter — for a static layer the counter IS the banked total. Move the reward to the production side: a `directMult` upgrade (the engine divides it back out in getNextAt, so the displayed next-floor price stays honest) or a multiplier on the dig itself.");
    }
    if (normalHits.length) {
        const ex = normalHits.slice(0, 4).map((L) => `"${L.id}"`).join(", ");
        add(WARN, "N-POINTSWRITE", normalHits[0].file, normalHits[0].start,
            `${normalHits.length} layer(s) assign player[layer].points inside update() (${ex}${normalHits.length > 4 ? "; …" : ""}), bypassing addPoints() (game.js:165) — the only writer of \`best\` and \`total\`. Milestones and achievements scored on those two read a stale number, so unspent trickle income never counts toward a lifetime threshold.`,
            "Award through the engine: `addPoints(this.layer, amount)` inside update(), or express the trickle as a gain multiplier. Keep direct assignment for genuine state changes (resets, refunds, unlocking) only.");
    }
    if (!staticHits.length && !normalHits.length) pass("N-POINTSWRITE", "no update() writes a layer's points directly");
}

// N-STATICMAX — a static layer with no canBuyMax(). getResetGain() short-circuits to
// `decimalOne` when `!tmp[layer].canBuyMax` (game.js:21) and doReset() clamps the payout
// the same way (game.js:186), so such a layer banks EXACTLY ONE floor per prestige, no
// matter how much is banked — and getNextAt() disables its max-buy too (game.js:54), so
// the prestige button's "Next:" hint quietly reverts to "Req:". Every upgrade priced in
// those floors becomes unreachable. 34 layers / 340 upgrades were dead this way in a real
// generated game.
{
    let hits = 0;
    for (const L of layers) {
        if (L.isUtility || L.type !== "static") continue;
        const mask = maskOf(L);
        if (!mask) continue;
        if (codeMatches(L.code, mask, /(?:^|[,{\n])\s*canBuyMax\s*[(:]/g).length) continue;
        hits++;
        add(FAIL, "N-STATICMAX", L.file, L.start,
            `STATIC layer "${L.id}" has no canBuyMax() — getResetGain() returns 1 whenever tmp[layer].canBuyMax is falsy (game.js:21) and doReset() clamps the payout to 1 (game.js:186), so every prestige banks exactly ONE floor no matter how deep the player goes. getNextAt() drops max-buy too (game.js:54), so the button stops even hinting "Next:".`,
            "Add `canBuyMax() { return player[this.layer].unlocked }` (or any condition you like). Until it exists the layer's whole upgrade ladder is unreachable, because the floors it prices them in never accumulate.");
    }
    if (hits === 0) pass("N-STATICMAX", "every static layer can bank more than one floor per prestige");
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
const counts = { PASS: 0, WARN: 0, FAIL: 0 };
for (const f of findings) counts[f.level]++;

if (asJson) {
    console.log(JSON.stringify({ game: path.resolve(gameDir), findings, counts, exitCode: counts.FAIL > 0 ? 1 : 0 }, null, 2));
} else {
    console.log(`== static_checks: ${path.resolve(gameDir)} ==`);
    for (const f of findings) {
        const loc = f.file ? ` ${f.file}${f.line ? ":" + f.line : ""}` : "";
        console.log(`[${f.level}] ${f.rule}${loc} — ${f.msg}`);
        if (f.fix) console.log(`         fix: ${f.fix}`);
    }
    console.log(`--`);
    console.log(`Summary: ${counts.PASS} PASS, ${counts.WARN} WARN, ${counts.FAIL} FAIL`);
    if (counts.WARN > 0) console.log("Every WARN needs a written acceptance reason in the design brief (SKILL.md Stage 5).");
    if (counts.FAIL > 0) console.log("FAILs block manual testing — fix all of them first (SKILL.md Stage 5).");
}

process.exit(counts.FAIL > 0 ? 1 : 0);
