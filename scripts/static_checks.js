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

        const info = { id: L.id, file: f, code: L.code, start: L.start, end: L.end, type: "none", row: null, rowDyn: false, isSide: false, isUtility: false, requiresNum: null, requiresDyn: false };

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
    const rowReq = [];
    for (const r of rows) {
        const reqs = rowSet.get(r).filter((L) => L.requiresNum != null).map((L) => L.requiresNum);
        rowReq.push({ row: r, req: reqs.length ? Math.min(...reqs) : null });
    }
    for (let i = 1; i < rowReq.length; i++) {
        const prev = rowReq[i - 1], cur = rowReq[i];
        if (prev.req == null || cur.req == null) continue;
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

// Shared: spans of one layer's upgrade entries ({key, start, end, text}), absolute indices.
function layerUpgradeSpans(rec, L) {
    const out = [];
    const objStart = rec.clean.indexOf("{", L.start);
    if (objStart < 0 || objStart >= L.end) return out;
    const keys = topLevelKeys(rec.clean, rec.mask, objStart, L.end);
    for (const k of keys) {
        if (k.key !== "upgrades") continue;
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
