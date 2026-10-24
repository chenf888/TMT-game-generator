#!/usr/bin/env node
/*
 * run_tests.js — smoke tests for the tmt-game-generator toolchain.
 *
 *   1. fixture-good : static_checks.js must report 0 FAIL and 0 WARN.
 *   2. fixture-bad  : every injected defect must be caught by its tagged rule.
 *   3. scaffold     : scaffold.js must produce a fresh game that passes static_checks
 *                     with 0 FAIL (the template placeholder endgame WARN is allowed).
 *   4. fixture-ghost: unread engine fields must be flagged, valid ones must not.
 *   5. types.test.js: the game-type layer — classify.js routing, the registry contract,
 *                     and the T-* type rules (run as a child process so its assertions
 *                     stay independent of this file's).
 *
 * Usage: node tests/run_tests.js
 */
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CHECKS = path.join(ROOT, "scripts", "static_checks.js");
const SCAFFOLD = path.join(ROOT, "scripts", "scaffold.js");

let failures = 0;
function ok(cond, label, detail) {
    if (cond) console.log(`  ok  - ${label}`);
    else { failures++; console.error(`  FAIL- ${label}${detail ? "\n        " + detail : ""}`); }
}

function runChecks(gameDir) {
    const r = spawnSync(process.execPath, [CHECKS, gameDir, "--json"], { encoding: "utf8" });
    let parsed = null;
    try { parsed = JSON.parse(r.stdout); } catch (_) { /* parse error handled by caller */ }
    return { status: r.status, parsed, stderr: r.stderr };
}

// ---------------------------------------------------------------------------
console.log("== test 1: fixture-good must pass clean ==");
{
    const dir = path.join(ROOT, "tests", "fixture-good");
    const { status, parsed, stderr } = runChecks(dir);
    if (!parsed) { ok(false, "static_checks produced JSON", stderr || "(no stdout)"); }
    else {
        const fails = parsed.findings.filter((f) => f.level === "FAIL");
        const warns = parsed.findings.filter((f) => f.level === "WARN");
        ok(status === 0, "exit code 0", `status=${status}`);
        ok(fails.length === 0, "0 FAIL findings", JSON.stringify(fails, null, 2));
        ok(warns.length === 0, "0 WARN findings", JSON.stringify(warns, null, 2));
    }
}

// ---------------------------------------------------------------------------
console.log("== test 2: fixture-bad must report every injected defect ==");
{
    const dir = path.join(ROOT, "tests", "fixture-bad");
    const { status, parsed, stderr } = runChecks(dir);
    if (!parsed) { ok(false, "static_checks produced JSON", stderr || ""); }
    else {
        const failRules = new Set(parsed.findings.filter((f) => f.level === "FAIL").map((f) => f.rule));
        const warnRules = new Set(parsed.findings.filter((f) => f.level === "WARN").map((f) => f.rule));
        const expectedFails = [
            "M-ID",            // no modInfo.id
            "C-RAWNUM",        // initialStartPoints: 10 AND cost: 100
            "D-STARTDATA",     // layer a missing unlocked
            "D-PRESTIGE",      // layer a missing baseResource
            "D-ROWMISSING",    // row 1 skipped (A2)
            "D-REQLADDER",     // backwards requires ladder (A1)
            "D-BRANCH",        // branch to "zzz"
            "D-DUPKEY",        // gainMult twice
            "C-MOD",           // .mod(
            "C-EXPANTA",       // ExpantaNum in extra.js
            "M-UNREG",         // extra.js not in modFiles
            "D-MICROTABS",     // layer m: 20 content items, no tabFormat (10 §3)
            "C-CONTENT1ELEM",  // layer c: ["upgrades"] renders as nothing (phase-⑥ incident)
            "N-UNWIRED",       // layers n/z: upgrades define effect() whose id nothing ever
                               // reads — the phase-⑧ headline defect (54.4% of real upgrades
                               // have no effect() because their power lives in gainMult)
            "N-ARROWTHIS",     // layer w: gainMult is an arrow function using `this`
            // lifecycle rules (2026-10-04, the The Galaxy Nebula postmortem):
            "N-MSDESTROY",     // layer c: milestones read .best, but with no doReset() the
                               // engine wipes the layer with its DEFAULT keep list
            "N-AUTOWIPE",      // layer v: autoPrestige at M1 implies nothing about
                               // resetsNothing at M2, so the automation wipes its own food
            "N-STATICMAX",     // layer f: static with no canBuyMax() — banks exactly 1 floor
                               // per prestige (game.js:21/:186)
            // phase-⑨ structural rules (2026-10-17, from three generated games):
            "N-FACTORY",       // defects.js: addLayer("q", shimLayerDef()) — the body is passed
                               // by reference, so the layer is invisible to every rule
            "N-COMPID",        // defects.js: layer k declares upgrades id 12 twice — object
                               // keys are last-wins, so the first definition is unreachable
            "N-COMPSTYLETHIS", // defects.js: layer k reads this.id inside componentStyles,
                               // which runs once per LAYER and so has no component id
            "N-SELFTOTAL",     // defects.js: layer k buyable 11 has feedback exponent
                               // ln(2)/ln(2) = 1 — it funds its own next purchase
            "N-AUTOFLAG",      // layers.js layer c promises autoUpgrade and defects.js layer k
                               // promises autoPrestige; no code grants either
            // phase-⑪ browser-verified rules (2026-10-24, from three generated games):
            "C-CONTENTSTR",    // layers.js layer z: a microtab's content: property is the bare
                               // string "upgrades" — the engine iterates it per character
            // D-STARTDATA appears twice on purpose — layers.js layer "a" lacks `unlocked`, and
            // defects.js layer "q" has no startData AT ALL because it lives inside the factory.
            // That second instance is N-FACTORY's cascade, and the cascade is the point: one
            // opaque layer blinds every other rule, which is why N-FACTORY is a hard FAIL.
        ];
        const expectedWarns = [
            "M-END-PLACEHOLDER",
            "D-REQRATIO",
            "D-AUTOCOLLIDE",
            "D-PUSHGUARD",
            "D-EFFECTMONO",    // layers m (12/16 flat) and n (8/8 constants) (10 §2)
            "D-MECHQUOTA",     // 4 main layers, zero interactive components (10 §5)
            "M-CHARSET",       // fixture-bad index.html has no charset meta (phase-⑥ incident)
            "N-PGBOOL",        // layer a: passiveGeneration returns a boolean, not a number
            // phase-⑧ corpus rules (numeric archive guide):
            "D-LOCALWIRE",     // layers n/z: effect-bearing upgrades wired to nothing local
            "D-EFFECTSHAPE",   // layers n/z: all effects flat multiplies, no pow/log/softcap
            "D-COSTSPAN",      // layer z: 9 literal costs inside a 3-order band
            // handbook-12 rules (TMT author's own notes, 2020-10 .. 2023-04):
            "N-CONTRAST",      // layer w: #141414 unreadable as text on the page background
            "N-UNLOCKPAYGATE", // layer w upgrade 12 unlocks layer "n", which still has requires
            "N-HOTKEYDESC",    // layer w hotkey "w" whose description omits the key
            // lifecycle rules (2026-10-04):
            "M-VERCMP",        // VERSION.num "0.10" — the engine compares versions as TEXT
                               // (utils/save.js:301), so "0.10" sorts below "0.1"
            "N-AUTOWIPE",      // layer v keeps an "auto" flag no code ever reads, so the
                               // "toggleable" wording promises a switch that does not exist
            "N-POINTSWRITE",   // layer c assigns player.c.points in update(), bypassing
                               // addPoints() — the only writer of best/total
            // phase-⑨ structural rules (2026-10-17):
            "N-ALLOWSMALL",    // defects.js: layer k prices upgrade 11 at 1e-30 with
                               // modInfo.allowSmall unset, so format() prints "0.00"
            "N-EFFECTHONEST",  // defects.js: layer k upgrade 13 displays ×1.5 while its
                               // effect() applies ×2 — the readout lies
            "N-MAINSTR",       // defects.js declares window.chinesemode, but five layers
                               // still render the stock English-only "main-display"
            "D-ROW-UNSET",     // CASCADE from N-FACTORY: layer q's `row: 4` is inside the
                               // factory's return value, so the layer source has no row
            // phase-⑪ browser-verified rules (2026-10-24, from three generated games):
            "D-UPDATELOCK",    // layers.js layer c: update() calls addPoints with no
                               // unlocked guard — locked layers run update() too
        ];
        ok(status === 1, "exit code 1 (FAILs present)", `status=${status}`);
        for (const rule of expectedFails)
            ok(failRules.has(rule), `FAIL ${rule} reported`);
        for (const rule of expectedWarns)
            ok(warnRules.has(rule), `WARN ${rule} reported`);
        const unexpectedFails = [...failRules].filter((r) => !expectedFails.includes(r));
        ok(unexpectedFails.length === 0, "no unexpected FAIL rules (false positives)", unexpectedFails.join(", ") || "");
        const unexpectedWarns = [...warnRules].filter((r) => !expectedWarns.includes(r));
        ok(unexpectedWarns.length === 0, "no unexpected WARN rules (false positives)", unexpectedWarns.join(", ") || "");
        const rawnNum = parsed.findings.filter((f) => f.rule === "C-RAWNUM" && f.level === "FAIL").length;
        ok(rawnNum >= 2, "both C-RAWNUM injections caught", `count=${rawnNum}`);
    }
}

// ---------------------------------------------------------------------------
console.log("== test 3: scaffold output passes static checks ==");
{
    const out = path.join(ROOT, "tests", ".tmp-scaffold");
    fs.rmSync(out, { recursive: true, force: true });
    const s = spawnSync(process.execPath, [SCAFFOLD, "Smoke Test Game", out], { encoding: "utf8" });
    ok(s.status === 0, "scaffold exits 0", (s.stderr || s.stdout || "").slice(-800));
    if (s.status === 0) {
        ok(fs.existsSync(path.join(out, "index.html")), "index.html copied");
        const patched = fs.readFileSync(path.join(out, "js", "mod.js"), "utf8");
        ok(/id:\s*"[^"]+"/.test(patched), "modInfo.id patched in");
        ok(/name:\s*"Smoke Test Game"/.test(patched), "modInfo.name patched");
        ok(!/The \?\?\? Tree/.test(patched), "template name replaced");
        const { status, parsed, stderr } = runChecks(out);
        if (!parsed) ok(false, "static_checks produced JSON on scaffold", stderr || "");
        else {
            const fails = parsed.findings.filter((f) => f.level === "FAIL");
            ok(status === 0, "scaffolded game exits 0 (only the expected placeholder WARN allowed)", JSON.stringify(fails, null, 2));
            ok(parsed.findings.some((f) => f.rule === "M-END-PLACEHOLDER" && f.level === "WARN"), "placeholder-endgame WARN present as expected pre-generation");
        }
        // the load-time harness (stage 5.5) must run clean on real scaffold output:
        // this is what keeps assets/harness/smoke.js from rotting as the template moves
        const h = spawnSync(process.execPath, [path.join(ROOT, "assets", "harness", "smoke.js"), out], { encoding: "utf8" });
        ok(h.status === 0, "harness smoke.js reports 0 FAIL on scaffold output", (h.stdout || h.stderr || "").slice(-600));
        // the folder must never ship with the engine's README (The Double Ninth Tree did;
        // scaffold.js now writes a game-first skeleton with the engine text kept below)
        const rm = fs.readFileSync(path.join(out, "README.md"), "utf8");
        ok(rm.startsWith("# Smoke Test Game"), "scaffold wrote a game-first README (not the engine's)");
        ok(/## The Modding Tree \(engine\)/.test(rm), "engine attribution kept below the game README");
        ok(/TODO\(Stage 3\)/.test(rm) && /TODO\(Stage 6\)/.test(rm), "README placeholders present for Stage 3/6");
    }
    fs.rmSync(out, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
console.log("== test 3b: template boot regression ==");
{
    // The Double Ninth Tree (D25): setAttribute("async", "false") creates the boolean
    // attribute, i.e. async=true — mod files race and layers.js can run before tuning.js.
    const loader = fs.readFileSync(path.join(ROOT, "template", "js", "technical", "loader.js"), "utf8");
    ok(!/setAttribute\(\s*["']async["']/.test(loader),
        "template loader never setAttribute(\"async\") — any string value makes async=true");
    ok(/script\.async\s*=\s*false/.test(loader), "template loader sets script.async = false (IDL property, in-order execution)");
    // The Braille Tree §12.1: <body onload="load()"> reads a half-built `layers` object,
    // because dynamically inserted scripts do not reliably delay window.onload.
    ok(/oneDone[\s\S]*readyState[\s\S]*start\(\)/.test(loader), "template loader starts load() only after every mod script reports back");
    const html = fs.readFileSync(path.join(ROOT, "template", "index.html"), "utf8");
    ok(!/<body[^>]*onload/.test(html), "template index.html does not boot from <body onload>");
    ok(/js\/technical\/loader\.js/.test(html), "template index.html still boots through js/technical/loader.js");
}

// ---------------------------------------------------------------------------
console.log("== test 4: fixture-ghost flags every unread component key ==");
{
    const dir = path.join(ROOT, "tests", "fixture-ghost");
    const { parsed, stderr } = runChecks(dir);
    if (!parsed) ok(false, "static_checks produced JSON", stderr || "");
    else {
        const warnRules = new Set(parsed.findings.filter((f) => f.level === "WARN").map((f) => f.rule));
        ok(warnRules.has("N-GHOSTFIELD"), "WARN N-GHOSTFIELD reported");
        const keys = parsed.findings.filter((f) => f.rule === "N-GHOSTFIELD")
            .map((f) => (f.msg.match(/defines `([^`]+)`/) || [])[1]).filter(Boolean);
        for (const k of ["reward", "repeatable", "canBypass", "countTowardsCompletion", "persistent", "condition", "secret"])
            ok(keys.includes(k), `ghost key flagged: ${k}`, "got: " + [...new Set(keys)].join(", "));
        // the two fields an earlier corpus-only guess would have wrongly flagged:
        // completionLimit makes a challenge repeatable (js/technical/layerSupport.js:109-110)
        // and canComplete() is the modern win-condition hook.
        ok(!keys.includes("completionLimit"), "completionLimit NOT flagged (challenges ARE repeatable)");
        ok(!keys.includes("canComplete"), "canComplete NOT flagged (valid field)");
        ok(!warnRules.has("D-DUPKEY"), "ghost fixture has no accidental D-DUPKEY");
        ok(!parsed.findings.some((f) => f.rule === "N-UNWIRED" && f.level !== "PASS"), "the properly wired upgrade is not flagged unwired");
    }
}

// ---------------------------------------------------------------------------
console.log("\n== test 5: the game-type layer (types.test.js) ==");
{
    const r = spawnSync(process.execPath, [path.join(ROOT, "tests", "types.test.js")], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    // types.test.js prints its own ok/FAIL lines; echo them so one command shows everything.
    for (const line of r.stdout.split(/\r?\n/)) if (/^\s+(ok|FAIL)|^(ALL|\d+ TYPE)/.test(line)) console.log("  " + line.trim().replace(/^ok\s*-\s*/, "ok  - ").replace(/^FAIL-\s*/, "FAIL- "));
    ok(r.status === 0, "types.test.js passed", r.stderr);
}

// ---------------------------------------------------------------------------
console.log(failures === 0 ? "\nALL SMOKE TESTS PASSED" : `\n${failures} SMOKE TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
