#!/usr/bin/env node
/*
 * pack.js — build the conformant skill package.
 *
 * WHY THIS EXISTS
 *   The WorkBuddy spec requires a skill's `name` (SKILL.md frontmatter) to equal the
 *   SHIPPED DIRECTORY name. A development tree is usually named something else — this
 *   one lives in a workspace where a rename is not always possible — so the requirement
 *   is discharged here, mechanically, instead of being documented and forgotten.
 *
 * Usage:
 *   node scripts/pack.js [--out <dir>] [--force]
 *
 * Output:
 *   <out>/tmt-game-generator/          default <out> = <parent of this skill>/dist
 *
 * The script:
 *   1. copies the skill, excluding development-only paths (dist/, tests/.tmp-*)
 *   2. fails if SKILL.md's `name` does not equal the target directory name
 *   3. fails if any required frontmatter field is missing
 *   4. reports the package size against the 3 MB platform limit
 *   5. prints the exact install target for each agent tool
 *
 * Exit code 0 = package built and conformant, 1 = a conformance check failed.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SKILL_ROOT = path.resolve(__dirname, "..");
const EXCLUDE = new Set(["dist", ".git", "node_modules", ".workbuddy"]);
const isScratch = (name) => name.startsWith(".tmp-");

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outRoot = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : path.join(path.dirname(SKILL_ROOT), "dist");
const force = args.includes("--force");

// --- read the frontmatter the way a platform parser would --------------------
const skillMd = fs.readFileSync(path.join(SKILL_ROOT, "SKILL.md"), "utf8");
const fm = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!fm) { console.error("FAIL: SKILL.md has no --- delimited frontmatter block"); process.exit(1); }

const meta = {};
for (const line of fm[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
}

const name = meta.name || "";
const problems = [];
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) problems.push(`name "${name}" is not kebab-case`);
if (!/^\d+\.\d+\.\d+$/.test(meta.version || "")) problems.push(`version "${meta.version || ""}" is not a three-part SemVer`);
for (const field of ["description", "description_zh", "description_en", "version", "author"])
    if (!meta[field]) problems.push(`required frontmatter field "${field}" is missing`);
if ((meta.description || "").length > 1024) problems.push(`description is ${meta.description.length} characters (limit 1024)`);

const target = path.join(outRoot, name || "unnamed-skill");
if (!problems.length && path.basename(target) !== name)
    problems.push(`package directory "${path.basename(target)}" does not equal name "${name}"`);

if (problems.length) {
    console.error("pack: refusing to build an unconformant package");
    for (const p of problems) console.error("  FAIL " + p);
    process.exit(1);
}

// --- copy ---------------------------------------------------------------------
fs.mkdirSync(outRoot, { recursive: true });
if (fs.existsSync(target)) {
    if (!force) { console.error(`pack: ${target} already exists — pass --force to replace it`); process.exit(1); }
    fs.rmSync(target, { recursive: true, force: true });
}
fs.cpSync(SKILL_ROOT, target, {
    recursive: true,
    filter: (src) => {
        const rel = path.relative(SKILL_ROOT, src);
        if (!rel) return true;
        const parts = rel.split(path.sep);
        if (parts.some((p) => EXCLUDE.has(p))) return false;
        if (parts.some(isScratch)) return false;
        return true;
    },
});

// --- verify the copy, not the source -----------------------------------------
const copiedMd = fs.readFileSync(path.join(target, "SKILL.md"), "utf8");
if (!/^---\r?\n/.test(copiedMd)) { console.error("FAIL: packaged SKILL.md lost its frontmatter"); process.exit(1); }
if (path.basename(target) !== name) { console.error("FAIL: packaged directory name drifted from `name`"); process.exit(1); }

let bytes = 0, files = 0;
const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else { bytes += fs.statSync(p).size; files++; }
    }
};
walk(target);
const mb = bytes / 1024 / 1024;

const bodyBytes = Buffer.byteLength(copiedMd, "utf8");
const overBody = bodyBytes > 64 * 1024;
const overPack = mb > 3;

console.log(`pack: ${target}`);
console.log(`      ${files} file(s), ${mb.toFixed(2)} MB  ${overPack ? "FAIL (>3 MB limit)" : "ok (≤3 MB)"}`);
console.log(`      SKILL.md ${(bodyBytes / 1024).toFixed(1)} KB  ${overBody ? "FAIL (>64 KB limit)" : "ok (≤64 KB)"}`);
console.log(`      name="${name}" version=${meta.version} author="${meta.author}"`);
console.log("");
console.log("install by copying the PACKAGE (not the development tree) into your tool's skills dir:");
console.log("      ZCode / Claude Code / Codex / Cursor:  <skills-dir>/" + name + "/");
console.log("      then run:  node tests/run_tests.js   inside the installed copy");
if (overBody || overPack) process.exit(1);
