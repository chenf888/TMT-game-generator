#!/usr/bin/env node
/*
 * run_tests.js — smoke tests for the TMT-Skill toolchain (phase ⑤ acceptance).
 *
 *   1. fixture-good : static_checks.js must report 0 FAIL and 0 WARN.
 *   2. fixture-bad  : every injected defect must be caught by its tagged rule.
 *   3. scaffold     : scaffold.js must produce a fresh game that passes static_checks
 *                     with 0 FAIL (the template placeholder endgame WARN is allowed).
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
    if (!parsed) { ok(false, "static_checks produced JSON", stderr || r.stdout || ""); }
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
    }
    fs.rmSync(out, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
console.log(failures === 0 ? "\nALL SMOKE TESTS PASSED" : `\n${failures} SMOKE TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
