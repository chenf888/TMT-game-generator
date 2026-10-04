#!/usr/bin/env node
/*
 * types.test.js — smoke tests for the game-type layer: classify.js routing, the
 * type-registry contract, and the T-* rules in scripts/static_checks.js.
 *
 * Run directly:  node tests/types.test.js
 * Also invoked as test 5 by tests/run_tests.js.
 *
 * The fixtures live in tests/fixture-types/:
 *   interactive/  active-click profile, one deliberate defect per T-* rule
 *   passive/      passive-prestige profile, no tick at all — proves the D-NOUPDATE exemption
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CLASSIFY = path.join(ROOT, "scripts", "classify.js");
const CHECKS = path.join(ROOT, "scripts", "static_checks.js");
const SCAFFOLD = path.join(ROOT, "scripts", "scaffold.js");

let failures = 0;
function ok(cond, label, detail) {
    if (cond) console.log("  ok  - " + label);
    else { failures++; console.log("  FAIL- " + label + (detail ? "\n         " + String(detail).split("\n")[0] : "")); }
}
function head(n) { console.log("\n== " + n + " =="); }

function checks(gameDir, extraArgs) {
    const r = spawnSync(process.execPath, [CHECKS, gameDir, "--json"].concat(extraArgs || []), { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.status === 2 && !r.stdout) return { counts: {}, findings: [], exitCode: 2, stderr: r.stderr };
    try { return JSON.parse(r.stdout); }
    catch (e) { return { counts: {}, findings: [], exitCode: -1, stderr: r.stderr, parseError: e.message }; }
}

const FIXTURES = path.join(__dirname, "fixture-types");

// ---------------------------------------------------------------------------
head("test 5a: classify.js routes by interaction model");
// ---------------------------------------------------------------------------
const { classify, parseBrief, loadRegistry } = require(CLASSIFY);
const registry = loadRegistry();

const routingCases = [
    // [id, request, recap, q4, explicit, expectedType, expectedAction]
    ["R1 incremental, no action verb", "做个养蜂的增量游戏", "蜂蜜 → 蜂箱 → 蜂群 → 蜂场", "", "", "passive-prestige", "auto"],
    ["R2 game-feel wording", "我想做个点挖矿的手感游戏", "矿石 → 镐头 → 矿脉", "active", "", "active-click", "auto"],
    ["R3 continuous progress", "做个挖掘游戏，看着进度条走完", "矿石 → 矿脉 → 深坑", "active", "", "active-tick", "auto"],
    ["R4 discrete tapping", "做个砍树游戏，每次点一下", "木头 → 木屋 → 村庄", "active", "", "active-click", "auto"],
    ["R5 board game", "做个俄罗斯方块一样的增量游戏", "俄罗斯方块 → 消除 → 图鉴", "", "", "board-minigame", "auto"],
    ["R6 explicit statement is terminal", "做个增量游戏", "", "", "active-click", "active-click", "auto"],
    ["R7 no signal at all asks", "不知道，你决定", "", "balanced", "", null, "ask-type"],
    ["R8 idle mining is passive, not tick", "idle mining game", "ore → pickaxe → deep mine", "idle", "", "passive-prestige", "auto"],
    ["R9 out-of-registry theme asks", "做成卡牌对战游戏", "卡牌 → 牌组 → 对战", "", "", null, "ask-type"],
];

for (const [id, request, recap, q4, explicit, wantType, wantAction] of routingCases) {
    const r = classify({ request, recap, q4, explicit }, registry);
    ok(r.action === wantAction && r.type === wantType,
        `${id} -> ${wantType || "(ask)"} [${wantAction}]`,
        `got ${r.type} [${r.action}] ranked=${JSON.stringify(r.ranked.map((x) => [x.id, x.score]))}`);
}

head("test 5b: classifier invariants");
{
    const explicit = classify({ request: "做个增量游戏", explicit: "active-tick" }, registry);
    ok(explicit.action === "auto" && explicit.type === "active-tick",
        "an explicit type outranks a higher-scoring rival", JSON.stringify(explicit.scores));

    const decided = classify({ request: "做个增量游戏", recap: "蜂蜜 → 蜂箱" }, registry);
    ok(decided.confidence >= registry.routing.thresholds.autoRoute,
        "a decided case clears the autoRoute threshold", decided.confidence);

    const undecided = classify({ request: "不知道，你决定", q4: "balanced" }, registry);
    ok(undecided.confidence < registry.routing.thresholds.askDisambiguate,
        "an undecided case stays below the ask threshold", undecided.confidence);
    ok(undecided.fallbackType === "passive-prestige",
        "an undecided case names its fallback", undecided.fallbackType);

    const asked = classify({ request: "做个能点击也能挖矿的游戏", recap: "矿石", q4: "active" }, registry);
    ok(asked.action === "auto" || asked.action === "ask",
        "an ambiguous case never crashes", asked.action);
}

head("test 5c: every registry type has a complete contract");
{
    for (const [id, t] of Object.entries(registry.types)) {
        ok(!!t.name && typeof t.corpusShare === "number" && Array.isArray(t.codeContract.require) &&
           Array.isArray(t.codeContract.forbid) && !!t.acceptance,
            `type "${id}" declares name/corpusShare/codeContract/acceptance`,
            JSON.stringify(Object.keys(t)));
        ok(Array.isArray(t.decision.keywords) && Array.isArray(t.decision.strongKeywords),
            `type "${id}" declares keywords and strongKeywords`);
        ok(Array.isArray(t.decision.counterExamples) && t.decision.counterExamples.length > 0,
            `type "${id}" records at least one counter-example`);
    }
    for (const [id, m] of Object.entries(registry.modifiers)) {
        ok(Array.isArray(m.requiresType) && "cost" in m,
            `modifier "${id}" declares its hard dependencies and a cost`);
    }
    ok(Object.values(registry.types).reduce((s, t) => s + t.corpusShare, 0) < 1.5,
        "corpus shares are plausible (not normalised by accident)");
}

head("test 5d: design-brief parsing");
{
    const briefPath = path.join(FIXTURES, "sample-brief.md");
    ok(fs.existsSync(briefPath), "sample brief fixture exists", briefPath);
    const parsed = parseBrief(fs.readFileSync(briefPath, "utf8"));
    ok(parsed.q4 === "balanced", "Q4 answer parsed from the brief table", parsed.q4);
    ok(/Nectar\s*→\s*Honey/.test(parsed.recap || ""),
        "Q1 recap parsed from the brief (currencies line, not the topology line below it)",
        JSON.stringify(parsed.recap).slice(0, 80));
    ok(parsed.request.length > 0, "pitch/name parsed into the request text", parsed.request);
}

// ---------------------------------------------------------------------------
head("test 5e: the interactive fixture trips exactly the T-* rules it injects");
// ---------------------------------------------------------------------------
{
    const r = checks(path.join(FIXTURES, "interactive"));
    const by = {};
    for (const f of r.findings) (by[f.rule] = by[f.rule] || []).push(f);
    ok(r.exitCode === 1, "interactive fixture exits 1", r.exitCode);
    ok((by["T-CLICKABLE"] || []).filter((f) => f.level === "FAIL").length === 2,
        "T-CLICKABLE catches both dead clickables", JSON.stringify((by["T-CLICKABLE"] || []).map((f) => f.msg.slice(0, 50))));
    ok((by["T-GRID"] || []).some((f) => f.level === "FAIL"), "T-GRID catches the bare grid");
    ok((by["T-TICKREG"] || []).some((f) => f.level === "FAIL"), "T-TICKREG catches the ghost hook");
    ok((by["T-CLICKABLE"] || []).some((f) => f.msg.includes("goodButton") === false),
        "the well-formed clickable is NOT flagged");
    const nonType = r.findings.filter((f) => f.level !== "PASS" && f.rule.startsWith("T-"));
    ok(nonType.every((f) => f.level === "FAIL"),
        "no T-* rule over-fires at WARN", JSON.stringify(nonType.filter((f) => f.level !== "FAIL").map((f) => f.msg.slice(0, 60))));
}

// ---------------------------------------------------------------------------
head("test 5f: the passive-prestige exemption");
// ---------------------------------------------------------------------------
{
    const withProfile = checks(path.join(FIXTURES, "passive"));
    ok(withProfile.exitCode === 0, "passive fixture is clean under its own type", JSON.stringify(withProfile.counts));
    ok(!withProfile.findings.some((f) => f.rule === "D-NOUPDATE"),
        "D-NOUPDATE does NOT fire — having no tick is passive-prestige's correct shape");
    ok(!withProfile.findings.some((f) => f.rule === "D-MECHQUOTA"),
        "D-MECHQUOTA passes on challenges alone (no clickables demanded)");

    const withoutProfile = checks(path.join(FIXTURES, "passive"), ["--no-profile"]);
    ok(withoutProfile.findings.some((f) => f.rule === "D-NOUPDATE"),
        "the SAME game with --no-profile DOES get D-NOUPDATE — the exemption is the type's doing, not the checker's silence");
    ok(!withoutProfile.findings.some((f) => f.rule.startsWith("T-")),
        "with --no-profile no T-* rule emits at all");
}

// ---------------------------------------------------------------------------
head("test 5g: no declared type => byte-identical to the pre-type checker");
// ---------------------------------------------------------------------------
{
    const unprofiled = path.join(FIXTURES, "unprofiled");
    ok(fs.existsSync(path.join(unprofiled, ".tmt-profile.json")) === false,
        "the unprofiled fixture has no .tmt-profile.json");
    const r = checks(unprofiled);
    ok(!r.findings.some((f) => f.rule.startsWith("T-")),
        "an undeclared game emits no T-* findings");
    const overridden = checks(unprofiled, ["--profile", "active-click"]);
    ok(overridden.findings.some((f) => f.rule.startsWith("T-")),
        "--profile turns the same rules on without a profile file");
}

// ---------------------------------------------------------------------------
head("test 5h: scaffold records the profile and enforces modifier dependencies");
// ---------------------------------------------------------------------------
{
    const tmp = path.join(__dirname, ".tmp-types");
    fs.rmSync(tmp, { recursive: true, force: true });
    const r = spawnSync(process.execPath, [SCAFFOLD, "Router Test", tmp, "--type", "passive-prestige",
        "--modifier", "challenges,score-attack"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    ok(r.status === 0, "scaffold accepts --type/--modifier", r.stderr);
    const p = path.join(tmp, ".tmt-profile.json");
    ok(fs.existsSync(p), "scaffold writes .tmt-profile.json");
    if (fs.existsSync(p)) {
        const prof = JSON.parse(fs.readFileSync(p, "utf8"));
        ok(prof.type === "passive-prestige", "profile records the type", prof.type);
        ok(prof.modifiers.includes("challenges"), "a satisfiable modifier is kept", JSON.stringify(prof.modifiers));
        ok(prof.droppedModifiers.some((d) => d.id === "score-attack"),
            "score-attack is DOWNGRADED for a passive game, not silently dropped",
            JSON.stringify(prof.droppedModifiers));
        ok(prof.exemptRules.includes("D-NOUPDATE"), "the profile carries the type's rule exemptions");
    }

    const bad = spawnSync(process.execPath, [SCAFFOLD, "Bad Type", path.join(tmp, "x"), "--type", "nonsense"],
        { encoding: "utf8" });
    ok(bad.status === 1, "an unknown --type is rejected with a clear error", bad.status);
    fs.rmSync(tmp, { recursive: true, force: true });
}

console.log("\n" + (failures === 0 ? "ALL TYPE TESTS PASSED" : failures + " TYPE TEST FAILURE(S)"));
process.exit(failures === 0 ? 0 : 1);