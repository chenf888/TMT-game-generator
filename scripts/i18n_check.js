#!/usr/bin/env node
/*
 * i18n_check.js — text-layer integrity for a TMT game (handbook 15 §3).
 *
 * Usage:
 *   node i18n_check.js <game-folder> [--json]
 *
 * Exit code: 1 if any FAIL finding, else 0.
 *
 * A game with no js/lang/ directory has no text layer: the script says so and exits 0,
 * so it is safe to run unconditionally on every build.
 *
 * Rules (the seven defect classes from handbook 15 §3, each one seen in a real build):
 *   I-MISSING    (FAIL) a key used by t("…") that no pool row and no pack provides —
 *                the string silently falls back to its English literal and is NEVER
 *                translated, with no visible symptom
 *   I-EXTRA      (WARN) a pool key no code ever asks for — dead text, and it inflates
 *                the advertised language count
 *   I-DUPKEY     (FAIL) two pool rows share a key — last-wins, one sentence lost
 *   I-DUPCODE    (FAIL) two pool rows share a language code — the picker offers the
 *                same language twice and one entry is unreachable
 *   I-DUPNATIVE  (WARN) two languages share an endonym — the reader cannot tell them apart
 *   I-PARITY     (WARN) a complete pack is missing keys the reference pack has (or vice
 *                versa) — switching to that mode leaves strings in the other language
 *   I-CJK        (WARN) CJK characters inside a language that is not a CJK language —
 *                copy-paste contamination
 *   I-TOKEN      (FAIL) a placeholder or mojibake token reached the text ('Required',
 *                '填充', '**', U+FFFD, an untranslated key name)
 *
 * The convention it reads is the one in references/design/15:
 *   js/lang/index.js   the t() accessor + LANG_MODES
 *   js/lang/pool_*.js  LANG_PHRASES rows: [key, code, text, native]
 *   js/lang/packs_*.js LANG_PACKS: { <code>: { <key>: <text> } }
 * Scanned for t("…") calls: js/mod.js, every modFiles entry, js/lang/index.js, and —
 * for a build that localized the engine's chrome (handbook 15 §4) — the six engine
 * chrome files and index.html. Both double- and single-quoted calls are accepted.
 * No third-party dependencies. Node >= 18.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const game = path.resolve(args.filter((a) => !a.startsWith("--"))[0] || ".");
const langDir = path.join(game, "js", "lang");
if (!fs.existsSync(langDir)) {
    if (asJson) console.log(JSON.stringify({ game, textLayer: false, findings: [] }, null, 2));
    else console.log("i18n: no js/lang/ directory — single-language game, nothing to check");
    process.exit(0);
}

const findings = [];
const add = (level, rule, msg) => findings.push({ level, rule, msg, file: null, line: null });
const files = fs.readdirSync(langDir).filter((f) => f.endsWith(".js")).sort();

// ---- load the text layer ---------------------------------------------------
const ctx = { LANG_PHRASES: [], LANG_PACKS: {}, LANG_MODES: [], console: { log() {}, warn() {}, error() {} } };
vm.createContext(ctx);
for (const f of files) {
    try { vm.runInContext(fs.readFileSync(path.join(langDir, f), "utf8"), ctx, { filename: f }); }
    catch (e) { add("FAIL", "I-LOAD", f + " threw while loading: " + e.message); }
}
const rows = Array.isArray(ctx.LANG_PHRASES) ? ctx.LANG_PHRASES : [];
const packs = ctx.LANG_PACKS || {};
const packCodes = Object.keys(packs);

// ---- which keys does the game actually ask for? ----------------------------
const modDir = path.join(game, "js");
const modFiles = ["mod.js"];
try {
    const mf = fs.readFileSync(path.join(modDir, "mod.js"), "utf8").match(/modFiles\s*:\s*\[([\s\S]*?)\]/);
    if (mf) for (const m of mf[1].matchAll(/["']([^"']+)["']/g)) modFiles.push(m[1]);
} catch (e) { add("FAIL", "I-LOAD", "js/mod.js unreadable: " + e.message); }

const keyRe = /(?<![A-Za-z0-9_$.])t\(\s*"([^"]+)"/g;
const keyReSq = /(?<![A-Za-z0-9_$.])t\(\s*'([^']+)'/g;   // single-quoted calls: Vue attribute contexts force them
const dynRe = /(?<![A-Za-z0-9_$.])t\(\s*"([^"]+)"\s*\+/g;   // t("diary.s" + i) — a key FAMILY
const dynReSq = /(?<![A-Za-z0-9_$.])t\(\s*'([^']+)'\s*\+/g;
const used = new Map(); // key -> source file
const dynamicPrefixes = new Set();
// the text layer's own index.js calls t() too (dropdown labels, mode names);
// a T3+ build that localized the ENGINE's chrome (handbook 15 §4) has t("ui.*")
// calls inside engine files — every one must be backed by a pack key like any other,
// so those files are scanned as well (a stock engine file has no t() calls: no-op).
const ENGINE_CHROME = ["components.js", "technical/systemComponents.js", "utils/NumberFormating.js", "utils/save.js", "utils.js", "game.js"];
const scanFiles = modFiles
    .concat(fs.existsSync(path.join(langDir, "index.js")) ? ["lang/index.js"] : [])
    .concat(ENGINE_CHROME.filter((f) => fs.existsSync(path.join(modDir, f))));
const scanSources = scanFiles.map((f) => [f, path.join(modDir, f)]);
const htmlPath = path.join(game, "index.html");
if (fs.existsSync(htmlPath)) scanSources.push(["index.html", htmlPath]); // the end screen lives here
for (const [f, p] of scanSources) {
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, "utf8");
    for (const m of src.matchAll(keyRe)) if (!used.has(m[1])) used.set(m[1], f);
    for (const m of src.matchAll(keyReSq)) if (!used.has(m[1])) used.set(m[1], f);
    for (const m of src.matchAll(dynRe)) dynamicPrefixes.add(m[1]);
    for (const m of src.matchAll(dynReSq)) dynamicPrefixes.add(m[1]);
}
for (const pre of dynamicPrefixes) for (const k of used.keys()) if (k.startsWith(pre) && k !== pre) used.delete(k);
const usedKeys = new Set(used.keys());
const isDynFamily = (k) => [...dynamicPrefixes].some((pre) => k.startsWith(pre));
const isDynPrefix = (k) => dynamicPrefixes.has(k) && rows.some((r) => r[0] && r[0].startsWith(k) && r[0] !== k);

// ---- pool rows -------------------------------------------------------------
// every Chinese variety (ISO 639-3) plus the other CJK languages — a code NOT in this set
// is expected to hold non-CJK text, and vice versa
const CJK_RE = /^(cmn|cjy|czh|cdo|cpx|cnp|mnp|lzh|zh|yue|hak|nan|wuu|gan|xiang|hsn|ja|ko|och|ltc|jsl)([-_].*)?$/i;
const isCjkCode = (code) => CJK_RE.test(String(code));
const byKey = new Map(), byCode = new Map(), byNative = new Map();
for (const r of rows) {
    if (!Array.isArray(r) || r.length < 4) { add("FAIL", "I-TOKEN", "malformed pool row (expected [key, code, text, native]): " + JSON.stringify(r).slice(0, 80)); continue; }
    const [k, code, text, native] = r;
    if (byKey.has(k)) add("FAIL", "I-DUPKEY", `pool key "${k}" is defined twice (${byKey.get(k)} and ${code}) — last-wins, one sentence is lost`);
    else byKey.set(k, code);
    (byCode.get(code) || byCode.set(code, []).get(code)).push(k);
    (byNative.get(native) || byNative.set(native, []).get(native)).push(k);
    if (!usedKeys.has(k) && !isDynFamily(k)) add("WARN", "I-EXTRA", `pool key "${k}" is never requested by any t("…") call — dead text`);
    if (isCjkCode(code)) {
        if (!/[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/.test(text))
            add("WARN", "I-CJK", `"${k}" is declared ${code} but contains no CJK characters — wrong language code?`);
    } else if (/[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/.test(text)) {
        add("WARN", "I-CJK", `"${k}" (${code}) contains CJK characters — copy-paste contamination`);
    }
    if (/Required|填充|定向|\*\*|\uFFFD|undefined|\[object/.test(text))
        add("FAIL", "I-TOKEN", `"${k}" (${code}) contains a placeholder / mojibake token: ${JSON.stringify(text).slice(0, 60)}`);
}
for (const [code, ks] of byCode) if (ks.length > 1)
    add("FAIL", "I-DUPCODE", `language code "${code}" is used by ${ks.length} rows (${ks.slice(0, 4).join(", ")}${ks.length > 4 ? ", …" : ""}) — the picker offers it twice and one entry is unreachable`);
for (const [native, ks] of byNative) if (ks.length > 1)
    add("WARN", "I-DUPNATIVE", `endonym "${native}" is claimed by ${ks.length} languages (${ks.slice(0, 4).join(", ")}${ks.length > 4 ? ", …" : ""}) — the reader cannot tell them apart`);

// ---- pack parity and coverage ---------------------------------------------
const ref = packCodes[0];
if (packCodes.length > 1) {
    for (const code of packCodes.slice(1)) {
        const missing = Object.keys(packs[ref]).filter((k) => !(k in packs[code]));
        const extra = Object.keys(packs[code]).filter((k) => !(k in packs[ref]));
        if (missing.length) add("WARN", "I-PARITY", `pack "${code}" is missing ${missing.length} key(s) that pack "${ref}" has: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ", …" : ""}`);
        if (extra.length) add("WARN", "I-PARITY", `pack "${code}" has ${extra.length} key(s) that pack "${ref}" lacks: ${extra.slice(0, 5).join(", ")}${extra.length > 5 ? ", …" : ""}`);
    }
}
// a key the game asks for must exist in the pool OR in every pack
for (const [k, src] of used) {
    const inPool = byKey.has(k);
    const inPacks = packCodes.filter((c) => k in packs[c]);
    if (isDynPrefix(k)) continue;   // t("prefix" + i) — the family's rows are checked below
    if (!inPool && inPacks.length === 0)
        add("FAIL", "I-MISSING", `t("${k}") in ${src} has no pool row and no pack entry — it silently renders its English literal in every language mode`);
    else if (!inPool && inPacks.length < packCodes.length)
        add("WARN", "I-PARITY", `t("${k}") in ${src} exists in only ${inPacks.length}/${packCodes.length} pack(s)`);
}
for (const k of usedKeys) if (!byKey.has(k) && !packCodes.length && !isDynPrefix(k))
    add("WARN", "I-MISSING", `t("${k}") is used but no pool row exists and there are no packs`);
for (const pre of dynamicPrefixes) {
    const family = rows.filter((r) => r[0] && r[0].startsWith(pre));
    if (family.length === 0)
        add("WARN", "I-MISSING", `t("${pre}" + …) builds a key family, but no pool row starts with "${pre}"`);
}

// ---- report ---------------------------------------------------------------
const fails = findings.filter((f) => f.level === "FAIL");
const warns = findings.filter((f) => f.level === "WARN");
if (asJson) console.log(JSON.stringify({ game, textLayer: true, keysUsed: usedKeys.size, poolRows: rows.length, languages: new Set(rows.map((r) => r[1])).size, packs: packCodes, findings }, null, 2));
else {
    console.log("i18n: " + files.length + " file(s) — " + rows.length + " pool row(s), " +
        new Set(rows.map((r) => r[1])).size + " language(s), packs: " + (packCodes.join(", ") || "none"));
    console.log("      " + usedKeys.size + " key(s) requested by the game");
    for (const f of findings) console.log("  [" + f.level + "] " + f.rule + " — " + f.msg);
    console.log("summary: " + fails.length + " FAIL, " + warns.length + " WARN");
}
process.exit(fails.length ? 1 : 0);
