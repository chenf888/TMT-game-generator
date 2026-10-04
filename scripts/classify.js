#!/usr/bin/env node
/*
 * classify.js — game-type recognition for the TMT game generator.
 *
 * Usage:
 *   node classify.js --request "做个养蜂的增量游戏" --recap "蜂蜜→蜂箱→蜂群" --q4 idle
 *   node classify.js --from-brief path/to/design-brief.md
 *   node classify.js --request "..." --json
 *
 * The type axis (interaction model) is ORTHOGONAL to the blueprint axis (Q2 scale).
 * This script only decides the TYPE. It never touches blueprints.json and never
 * overrides a stated user intent.
 *
 * Output: the winning type, its confidence, and an action —
 *   auto      — route to this type without asking
 *   ask       — ask the user one disambiguating question (see registry.routing.questions)
 *   ask-type  — no usable signal; ask which type they want
 *
 * Exit codes: 0 auto-routed, 3 a question must be asked, 1 usage/registry error.
 *
 * All thresholds, weights, verbs and keywords live in assets/type-registry.json.
 * Adding a type is an edit to that file, never to this script.
 *
 * No third-party dependencies. Node >= 18.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const REGISTRY_PATH = path.resolve(__dirname, "..", "assets", "type-registry.json");

function loadRegistry() {
    try {
        return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
    } catch (e) {
        console.error(`ERROR: cannot read the type registry at ${REGISTRY_PATH}\n  ${e.message}`);
        process.exit(1);
    }
}

// ---------------------------------------------------------------------------
// matching
// ---------------------------------------------------------------------------
function haystack(answers) {
    return `${answers.recap || ""}\n${answers.request || ""}`.toLowerCase();
}

function matchAny(text, list) {
    if (!list) return false;
    for (const term of list) {
        if (!term) continue;
        if (text.includes(String(term).toLowerCase())) return true;
    }
    return false;
}

function matchTerm(text, term) {
    return !!term && text.includes(String(term).toLowerCase());
}

// ---------------------------------------------------------------------------
// the classifier — pure function, no I/O, no side effects
// ---------------------------------------------------------------------------
function classify(answers, registry) {
    const reg = registry || loadRegistry();
    const W = reg.routing.weights;
    const th = reg.routing.thresholds;
    const text = haystack(answers);

    const ids = Object.keys(reg.types);
    const scores = {};
    const detail = {};

    for (const id of ids) {
        const t = reg.types[id];
        const prior = W.prior * (t.corpusShare || 0);
        scores[id] = prior;
        detail[id] = { prior, verb: 0, keyword: 0, q4: 0, synergy: 0, floor: false };

        detail[id].verbHit = matchAny(text, t.decision.verbs);
        detail[id].keywordHit = matchAny(text, t.decision.keywords) || matchAny(text, t.decision.keywordsEn);
        detail[id].strongHit = matchAny(text, t.decision.strongKeywords) || matchAny(text, t.decision.strongKeywordsEn);
    }

    // --- Q4 pacing. "idle" actively penalises interaction types, so that
    //     'idle mining' resolves to passive rather than tick.
    const q4 = (answers.q4 || "").toLowerCase();
    if (q4 === "idle" || q4 === "mostly idle" || q4 === "mostly-idle") {
        scores["passive-prestige"] += W.q4Idle;
        detail["passive-prestige"].q4 += W.q4Idle;
        for (const id of ids) {
            if (!reg.types[id].actionBearing) continue;
            scores[id] -= W.q4IdlePenalty;
            detail[id].q4 -= W.q4IdlePenalty;
        }
    } else if (q4 === "active" || q4 === "mostly active" || q4 === "mostly-active") {
        // Q4 only splits idle/active — it cannot tell clicking from a tick. That
        // is the gap this classifier exists to close, so give both a nudge and
        // let the recap verb break the tie.
        for (const id of ["active-click", "active-tick"]) {
            if (!(id in scores)) continue;
            scores[id] += W.q4ActiveEach;
            detail[id].q4 += W.q4ActiveEach;
        }
        const hit = ["active-click", "active-tick"].filter((id) => detail[id] && detail[id].verbHit);
        if (hit.length === 1) {
            scores[hit[0]] += W.q4ActiveTiebreak;
            detail[hit[0]].q4 += W.q4ActiveTiebreak;
        }
    }

    // --- verbs (action-bearing types only)
    for (const id of ids) {
        if (!detail[id].verbHit) continue;
        scores[id] += W.verb;
        detail[id].verb += W.verb;
    }

    // --- passive-prestige is signalled by ABSENCE: no action verb anywhere and
    //     no competing keyword. Any action hit or competing keyword suppresses it,
    //     otherwise 'idle mining' would be misread as an active tick game.
    const anyActionVerb = ids.some((id) => reg.types[id].actionBearing && detail[id].verbHit);
    const competingKeyword = ids.some(
        (id) => id !== "passive-prestige" && (detail[id].keywordHit || detail[id].strongHit)
    );
    if (!anyActionVerb && !competingKeyword) {
        scores["passive-prestige"] += W.verb;
        detail["passive-prestige"].verb += W.verb;
    }

    // --- keywords + verb/keyword synergy
    for (const id of ids) {
        if (detail[id].keywordHit) {
            scores[id] += W.keyword;
            detail[id].keyword += W.keyword;
        }
        if (detail[id].verbHit && detail[id].keywordHit) {
            scores[id] += W.synergy;
            detail[id].synergy += W.synergy;
        }
    }

    // --- a decisive keyword ("俄罗斯方块") alone clears the auto-route bar, as long
    //     as no action verb contradicts it.
    for (const id of ids) {
        if (!detail[id].strongHit) continue;
        const floor = th.strongKeywordFloor;
        if (scores[id] < floor && !anyActionVerb) {
            scores[id] = floor;
            detail[id].floor = true;
        }
    }

    // --- an explicit statement from the user is a FLOOR, not an addition.
    //     No other signal can lower it, and the classifier stops here.
    let explicitApplied = null;
    if (answers.explicit && answers.explicit in scores) {
        explicitApplied = answers.explicit;
        if (scores[explicitApplied] < W.explicit) {
            scores[explicitApplied] = W.explicit;
            detail[explicitApplied].floor = true;
        }
    }

    const ranked = ids
        .map((id) => ({ id, score: scores[id], name: reg.types[id].name, nameEn: reg.types[id].nameEn }))
        .sort((a, b) => b.score - a.score);

    const top = ranked[0];
    const second = ranked[1] || { id: null, score: 0 };
    const margin = top.score - second.score;

    let action, question = null;
    if (explicitApplied) {
        // An explicit statement from the user is terminal: it decides the type and
        // no margin test can overrule it. Otherwise a keyword-scored rival could
        // turn "make me a clicker" into a question about something else.
        action = "auto";
    } else if (top.score >= th.autoRoute && margin >= th.minMargin) {
        action = "auto";
    } else if (top.score >= th.askDisambiguate) {
        action = "ask";
        const key = `${top.id}|${second.id}`;
        const reverse = `${second.id}|${top.id}`;
        const table = reg.routing.questions;
        question = table[key] || table[reverse] || table[`${top.id}|*`] || table["*|passive-prestige"] || null;
    } else {
        action = "ask-type";
        question = reg.routing.questions["*|passive-prestige"] || null;
    }

    return {
        type: action === "ask-type" ? null : (explicitApplied || top.id),
        fallbackType: reg.fallback.id,
        confidence: round(top.score),
        margin: round(margin),
        action,
        question,
        explicitApplied,
        ranked: ranked.map((r) => ({ id: r.id, score: round(r.score), name: r.name, nameEn: r.nameEn })),
        scores: Object.fromEntries(ranked.map((r) => [r.id, round(r.score)])),
        signals: detail,
    };
}

// Clamp at zero for reporting: a penalised score is meaningful in the ranking but
// a negative confidence reads as a bug in the report.
function round(n) { return Math.max(0, Math.round(n * 1000) / 1000); }

// ---------------------------------------------------------------------------
// brief parsing — lets the classifier be run against an existing design brief
// ---------------------------------------------------------------------------
function parseBrief(text) {
    const answers = { request: "", recap: "", q4: "", explicit: "" };

    // Q4 answer: a markdown table row like  | Q4 | Pacing | **Balanced** | ...
    const q4row = text.match(/^\|\s*Q4\s*\|[^\n]*$/im);
    if (q4row) {
        const cells = q4row[0].split("|").map((c) => c.trim());
        const answerCell = cells[3] || "";
        const m = answerCell.match(/\b(idle|active|balanced)\b/i);
        if (m) answers.q4 = m[1].toLowerCase();
    }

    // Q1 recap: the three structural lines the interview forces. The label sits mid-line
    // (e.g. "- **Currencies (in order):** nectar → honey"), so capture forward from the label
    // itself rather than from the start of the next line.
    const recapBlock = text.match(/(?:Currencies\s*\(in order\)|货币)([\s\S]{0,800}?)(?=\n\s*[-*]\s*\*\*|\n##|\n---)/i);
    if (recapBlock) answers.recap = recapBlock[1].replace(/[*_`#]/g, " ");
    else {
        const topic = text.match(/(?:Layer topology|层拓扑)[^\n]*\n([^\n]{0,300})/i);
        if (topic) answers.recap = topic[1];
    }

    // The one-line pitch and theme lines act as the request text.
    const pitch = text.match(/\|\s*One-line pitch\s*\|([^|]*)\|/i);
    const theme = text.match(/\|\s*Game name\s*\|([^|]*)\|/i);
    answers.request = [pitch && pitch[1], theme && theme[1]].filter(Boolean).join(" ");

    // An already-declared type short-circuits everything (re-running on a brief). Accepts both
    // the §2 interview row (Q4b) and the §2b profile table row (Type).
    const declared = text.match(/\|\s*Q4b\s*\|[^|]*\|\s*([a-z][a-z-]*)\s*\|/i)
        || text.match(/\|\s*Game type[^|]*\|[^|]*\|\s*([a-z][a-z-]*)\s*\|/i)
        || text.match(/\|\s*Type\s*\|[^|]*\|\s*([a-z][a-z-]*)\s*\|/i)
        || text.match(/^\*\*Type\*\*:\s*`?([a-z][a-z-]*)`?/im);
    if (declared) answers.explicit = declared[1].trim();

    return answers;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function printHelp() {
    console.log(`Usage: node classify.js [options]

Options:
  --request <text>     What the user asked for (free text).
  --recap <text>       The Q1 structure recap (currencies / topology / ceilings).
  --q4 <idle|active|balanced>
  --explicit <typeId>  The user named a type outright. Terminal signal.
  --from-brief <path>  Read a design-brief markdown and derive the above.
  --json               Emit machine-readable JSON.
  -h, --help`);
}

function main() {
    const argv = process.argv.slice(2);
    if (argv.includes("-h") || argv.includes("--help")) { printHelp(); process.exit(0); }

    const answers = { request: "", recap: "", q4: "", explicit: "" };
    let usedBrief = false;

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--json") continue;
        if (a === "--request") answers.request = argv[++i] || "";
        else if (a === "--recap") answers.recap = argv[++i] || "";
        else if (a === "--q4") answers.q4 = argv[++i] || "";
        else if (a === "--explicit") answers.explicit = argv[++i] || "";
        else if (a === "--from-brief") {
            const p = argv[++i];
            if (!p) { console.error("ERROR: --from-brief needs a path"); process.exit(1); }
            const brief = fs.readFileSync(path.resolve(p), "utf8");
            Object.assign(answers, parseBrief(brief));
            usedBrief = true;
        } else { console.error(`Unknown option: ${a}`); process.exit(1); }
    }

    const registry = loadRegistry();
    if (answers.explicit && !(answers.explicit in registry.types)) {
        console.error(`ERROR: unknown type id "${answers.explicit}". Known: ${Object.keys(registry.types).join(", ")}`);
        process.exit(1);
    }

    const result = classify(answers, registry);
    result.parsedFrom = usedBrief ? "brief" : "arguments";
    result.answers = answers;

    if (argv.includes("--json")) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log(`Type      : ${result.type || "(undecided)"}`);
        console.log(`Confidence: ${result.confidence}   margin ${result.margin}`);
        console.log(`Action    : ${result.action}`);
        if (result.question) console.log(`Ask       : ${result.question.zh}\n            ${result.question.en}`);
        console.log("Ranking   : " + result.ranked.map((r) => `${r.id}=${r.score}`).join("  "));
        if (result.action !== "auto") console.log(`Fallback  : ${result.fallbackType}`);
    }
    process.exit(result.action === "auto" ? 0 : 3);
}

module.exports = { classify, parseBrief, loadRegistry, REGISTRY_PATH };

if (require.main === module) main();