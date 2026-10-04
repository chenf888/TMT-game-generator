#!/usr/bin/env node
/*
 * scaffold.js — create a new TMT game folder from the engine template.
 *
 * Usage:
 *   node scaffold.js "Game Name" [output-dir] [--from <template-dir>] [--author <name>] [--points-name <name>] [--force] [--type <typeId>] [--modifier id,id]
 *
 * Template resolution order:
 *   1. --from flag
 *   2. TMT_TEMPLATE environment variable
 *   3. <skill-root>/template                     (bundled copy — ships with the skill)
 *   4. <skill-root>/../The-Modding-Tree-master   (sibling of the skill folder — dev layout)
 *   5. ./The-Modding-Tree-master                 (relative to the current working directory)
 *
 * What it does:
 *   - Copies the WHOLE template folder to the output directory.
 *   - Patches js/mod.js: modInfo.name / modInfo.id (slug + random suffix; the savefile key —
 *     set once, never change) / author / pointsName / modFiles, plus VERSION, changelog and
 *     winText placeholders. offlineLimit stays at the template default of 1 hour.
 *   - Verifies every patched field by re-parsing the result and runs `node --check` on it.
 *   - With --type/--modifier, writes .tmt-profile.json recording the game type profile.
 *     static_checks.js reads it and applies that type's gates and thresholds. Omitting
 *     the flags changes nothing — the file is simply not written.
 *
 * No third-party dependencies. Node >= 18 (uses fs.cpSync).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// ---------------------------------------------------------------------------
// arg parsing
// ---------------------------------------------------------------------------
function printHelp() {
    console.log(`Usage: node scaffold.js "Game Name" [output-dir] [options]

Creates a new playable TMT game folder from the engine template and patches js/mod.js.

Positional:
  "Game Name"        Required. Quoted if it contains spaces.
  [output-dir]       Optional. Defaults to "./<slug-of-name>" relative to the cwd.

Options:
  --from <dir>       Template folder (default: bundled template/, then fallbacks)
  --author <name>    modInfo.author (default: "AI")
  --points-name <n>  modInfo.pointsName (default: "points")
  --force            Overwrite the output directory if it exists (careful!)
  --type <typeId>    Game type from assets/type-registry.json (see classify.js).
                     Writes .tmt-profile.json so static_checks.js applies that
                     type's gates. Optional: omitting it changes nothing.
  --modifier <ids>   Comma-separated modifier ids from the registry's "modifiers".
  --blueprint <key>   small | medium | large (Q2). Lets static_checks.js apply the
                      per-blueprint thresholds in assets/fun-quota.json.
  -h, --help         Show this help`);
}

function parseArgs(argv) {
    const opts = { name: null, outDir: null, from: null, author: "AI", pointsName: "points", force: false, type: null, modifiers: [], blueprint: null };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "-h" || a === "--help") { printHelp(); process.exit(0); }
        else if (a === "--from") opts.from = argv[++i];
        else if (a === "--author") opts.author = argv[++i];
        else if (a === "--points-name") opts.pointsName = argv[++i];
        else if (a === "--type") opts.type = argv[++i];
        else if (a === "--blueprint") opts.blueprint = argv[++i];
        else if (a === "--modifier") opts.modifiers = String(argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
        else if (a === "--force") opts.force = true;
        else if (a.startsWith("--")) { console.error(`Unknown option: ${a}`); process.exit(2); }
        else if (opts.name === null) opts.name = a;
        else if (opts.outDir === null) opts.outDir = a;
        else { console.error(`Unexpected extra argument: ${a}`); process.exit(2); }
    }
    if (!opts.name) { printHelp(); process.exit(2); }
    return opts;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function slugify(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "tmt-game";
}

function randomSuffix(len) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

// Escape a string for safe insertion inside a JS template literal in the GENERATED file.
function escapeTemplateLiteral(s) {
    return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function resolveTemplate(explicit) {
    const candidates = [];
    if (explicit) candidates.push(explicit);
    if (process.env.TMT_TEMPLATE) candidates.push(process.env.TMT_TEMPLATE);
    candidates.push(path.resolve(__dirname, "..", "template"));                       // bundled with the skill
    candidates.push(path.resolve(__dirname, "..", "..", "The-Modding-Tree-master"));  // dev-workspace sibling
    candidates.push(path.resolve(process.cwd(), "The-Modding-Tree-master"));
    for (const c of candidates) {
        try {
            const p = path.resolve(c);
            if (fs.existsSync(path.join(p, "index.html")) && fs.existsSync(path.join(p, "js", "mod.js"))) return p;
        } catch (_) { /* unreadable candidate — try next */ }
    }
    console.error("ERROR: could not locate the TMT template folder (expected a folder containing index.html and js/mod.js).");
    console.error("Tried:");
    for (const c of candidates) console.error("  - " + path.resolve(c));
    console.error("Pass it explicitly: node scaffold.js \"Game Name\" out --from /path/to/The-Modding-Tree-master");
    process.exit(2);
}

function die(msg) {
    console.error("ERROR: " + msg);
    process.exit(1);
}

// Replace exactly once; remember whether it happened.
function replaceOnce(hay, needle, replacement, label, patches) {
    if (!hay.includes(needle)) return [hay, false];
    patches.push(label);
    return [hay.replace(needle, replacement), true];
}

// ---------------------------------------------------------------------------
// mod.js patching
// ---------------------------------------------------------------------------
function patchModJs(src, opts, modId) {
    const patches = [];
    let out = src;

    // --- modInfo block: operate only inside `let modInfo = { ... };` so that
    //     VERSION.name etc. are never touched by the same replacements.
    const blockStart = out.indexOf("modInfo");
    const objOpen = out.indexOf("{", blockStart);
    if (blockStart < 0 || objOpen < 0) die("js/mod.js: cannot find the modInfo object");
    let depth = 0, objClose = -1;
    for (let i = objOpen; i < out.length; i++) {
        const ch = out[i];
        if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) { objClose = i; break; } }
    }
    if (objClose < 0) die("js/mod.js: unbalanced braces in modInfo");

    let info = out.slice(objOpen, objClose + 1);

    // name
    const escapedName = opts.name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    [info,] = replaceOnce(info, 'name: "The ??? Tree"', `name: "${escapedName}"`, "modInfo.name", patches);
    if (!/name:\s*"[^"]*"/.test(info)) die("js/mod.js: could not patch modInfo.name");
    // generic fallback in case the template name line ever changes
    if (!info.includes(`name: "${escapedName}"`)) {
        info = info.replace(/name:\s*"[^"]*"/, `name: "${escapedName}"`);
        if (!patches.includes("modInfo.name")) patches.push("modInfo.name");
    }

    // id — the template ships WITHOUT an id; insert one right after the name line.
    // (id keys the localStorage savefile: set once, never change.)
    if (/^\s*id\s*:/m.test(info)) {
        // id already present (future template) — replace its value instead of adding a second key.
        info = info.replace(/^(\s*)id\s*:\s*"[^"]*"/m, `$1id: "${modId}"`);
    } else {
        info = info.replace(/(name:\s*"[^"]*",)/, `$1\n    id: "${modId}",  // savefile key — set once, NEVER change (changing it erases all saves)`);
    }
    patches.push("modInfo.id");

    // author
    const escapedAuthor = opts.author.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    [info,] = replaceOnce(info, 'author: "nobody"', `author: "${escapedAuthor}"`, "modInfo.author", patches);
    if (!info.includes(`author: "${escapedAuthor}"`)) {
        info = info.replace(/author:\s*"[^"]*"/, `author: "${escapedAuthor}"`);
        if (!patches.includes("modInfo.author")) patches.push("modInfo.author");
    }

    // pointsName
    const escapedPoints = opts.pointsName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    if (!/pointsName\s*:\s*"/.test(info)) die("js/mod.js: could not find modInfo.pointsName");
    info = info.replace(/pointsName:\s*"[^"]*"/, `pointsName: "${escapedPoints}"`);
    patches.push("modInfo.pointsName");

    // modFiles — normalized baseline; per-layer files must be appended during generation.
    if (!/modFiles\s*:\s*\[/.test(info)) die("js/mod.js: could not find modInfo.modFiles");
    info = info.replace(/modFiles\s*:\s*\[[^\]]*\](\s*,)?/, 'modFiles: ["layers.js", "tree.js"],  // TODO(generation): append every new layer file here');
    patches.push("modInfo.modFiles");

    // offlineLimit — keep small (07 hard rule 17: do not balance around offline progress).
    if (!/offlineLimit\s*:/.test(info)) {
        info = info.replace(/(discordLink\s*:\s*"[^"]*",)/, `$1\n    offlineLimit: 1,  // hours`);
        patches.push("modInfo.offlineLimit");
    }

    out = out.slice(0, objOpen) + info + out.slice(objClose + 1);

    // --- VERSION block. Templates differ: TMT-master ships num "0.0" / name
    //     "Literally nothing"; the Nebula re-skeleton ships num "1.0" / name
    //     "Nebula". Patch whatever version line exists inside `let VERSION = {...}`.
    const verStart = out.indexOf("let VERSION");
    if (verStart >= 0) {
        const verOpen = out.indexOf("{", verStart);
        const verEnd = out.indexOf("}", verOpen);
        if (verOpen > 0 && verEnd > verOpen) {
            let ver = out.slice(verStart, verEnd + 1);
            [ver,] = replaceOnce(ver, 'num: "0.0"', 'num: "0.1"', "VERSION.num", patches);
            if (!/num:\s*"0\.1"/.test(ver)) {
                ver = ver.replace(/num:\s*"[^"]*"/, 'num: "0.1"');
                if (!patches.includes("VERSION.num")) patches.push("VERSION.num");
            }
            [ver,] = replaceOnce(ver, 'name: "Literally nothing"', 'name: "Initial build"', "VERSION.name", patches);
            if (!/name:\s*"Initial build"/.test(ver)) {
                ver = ver.replace(/name:\s*"[^"]*"/, 'name: "Initial build"');
                if (!patches.includes("VERSION.name")) patches.push("VERSION.name");
            }
            out = out.slice(0, verStart) + ver + out.slice(verEnd + 1);
        }
    }
    if (!/VERSION\s*=\s*\{[\s\S]*?num:\s*"0\.1"/.test(out)) die("js/mod.js: could not patch VERSION.num");

    // --- changelog placeholder (replace the whole first template literal)
    const changelogRe = /let changelog = `[\s\S]*?`/;
    if (!changelogRe.test(out)) die("js/mod.js: could not find changelog");
    out = out.replace(changelogRe,
        "let changelog = `<h1>Changelog:</h1><br>\n\t<h3>v0.1</h3><br>\n\t\t- Initial scaffold of " + escapeTemplateLiteral(opts.name) + " (generated by the TMT Game Generator skill).`");
    patches.push("changelog");

    // --- winText placeholder
    const winTextRe = /let winText = `[\s\S]*?`/;
    if (!winTextRe.test(out)) die("js/mod.js: could not find winText");
    out = out.replace(winTextRe,
        "let winText = `Congratulations! You have beaten " + escapeTemplateLiteral(opts.name) + "!`");
    patches.push("winText");

    // --- sanity: the custom-action registry must survive patching
    if (!/doNotCallTheseFunctionsEveryTick/.test(out)) die("js/mod.js: doNotCallTheseFunctionsEveryTick disappeared during patching");

    return { out, patches };
}

function verifyPatchedModJs(content, opts, modId) {
    const problems = [];
    const mustHave = [
        [`id:\\s*"${modId}"`, `modInfo.id = ${modId}`],
        [`name:\\s*"${opts.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "modInfo.name"],
        [`author:\\s*"${opts.author.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "modInfo.author"],
        [`pointsName:\\s*"${opts.pointsName}"`, "modInfo.pointsName"],
        [/modFiles:\s*\[[^\]]*layers\.js[^\]]*tree\.js[^\]]*\]/.source, "modInfo.modFiles(layers.js+tree.js)"],
        [/offlineLimit\s*:\s*\d/.source, "modInfo.offlineLimit"],
        [/VERSION\s*=\s*\{[\s\S]*?num:\s*"0\.1"/.source, "VERSION.num"],
        [/let changelog\s*=/, "changelog"],
        [/let winText\s*=/, "winText"],
        [/function isEndgame\(\)/, "isEndgame"],
        [/function getPointGen\(\)/, "getPointGen"],
        [/doNotCallTheseFunctionsEveryTick/.source, "doNotCallTheseFunctionsEveryTick"],
    ];
    for (const [re, label] of mustHave) {
        if (!new RegExp(re).test(content)) problems.push("missing/incorrect: " + label);
    }
    return problems;
}

// ---------------------------------------------------------------------------
// game-type profile (.tmt-profile.json)
// ---------------------------------------------------------------------------
function writeProfile(outDir, opts) {
    const registryPath = path.resolve(__dirname, "..", "assets", "type-registry.json");
    if (!fs.existsSync(registryPath)) die("assets/type-registry.json is missing — cannot record a type profile");
    const reg = JSON.parse(fs.readFileSync(registryPath, "utf8"));

    const BLUEPRINTS = ["small", "medium", "large"];
    if (opts.blueprint && !BLUEPRINTS.includes(opts.blueprint)) {
        die(`unknown --blueprint "${opts.blueprint}". Expected one of: ${BLUEPRINTS.join(", ")} (SKILL.md Q2)`);
    }
    if (!opts.type) {
        // A profile with only a blueprint is still worth writing: it lets the checker apply
        // the per-blueprint thresholds in assets/fun-quota.json. No type => no T-* rules.
        if (!opts.blueprint) return null;
        const bpOnly = {
            $comment: "Written by scaffold.js. No --type was given, so no type gates apply.",
            blueprint: opts.blueprint,
            registryVersion: reg.version,
        };
        fs.writeFileSync(path.join(outDir, ".tmt-profile.json"), JSON.stringify(bpOnly, null, 2) + "\n", "utf8");
        return bpOnly;
    }

    if (!reg.types[opts.type]) {
        die(`unknown --type "${opts.type}". Known types: ${Object.keys(reg.types).join(", ")}\n` +
            `Run: node classify.js --request "..." --recap "..." --q4 <idle|active|balanced>`);
    }

    const kept = [];
    const dropped = [];
    for (const id of opts.modifiers) {
        const mod = reg.modifiers[id];
        if (!mod) { dropped.push({ id, reason: `unknown modifier (registry has: ${Object.keys(reg.modifiers).join(", ")})` }); continue; }
        // Hard dependencies: a modifier whose prerequisites are unmet is downgraded, never
        // silently dropped — it lands in the profile and the caller must log it in brief §10.
        const badType = (mod.requiresType || []).length && !(mod.requiresType || []).includes(opts.type);
        const missingMods = (mod.requiresModifier || []).filter((r) => !opts.modifiers.includes(r));
        if (badType) dropped.push({ id, reason: `requires type ${mod.requiresType.join(" or ")}, type is ${opts.type}` });
        else if (missingMods.length) dropped.push({ id, reason: `requires modifier ${missingMods.join(" + ")}` });
        else kept.push(id);
    }

    const profile = {
        $comment: "Written by scaffold.js. Read by static_checks.js to apply this type's gates. Safe to edit or delete.",
        type: opts.type,
        typeName: reg.types[opts.type].name,
        blueprint: opts.blueprint || null,
        modifiers: kept,
        droppedModifiers: dropped,
        exemptRules: reg.types[opts.type].acceptance.exemptRules || [],
        requiredModules: reg.types[opts.type].requiredModules || [],
        forbiddenModules: (reg.types[opts.type].codeContract || {}).forbid || [],
        requiredRules: (reg.types[opts.type].acceptance.requireRules || []),
        registryVersion: reg.version,
    };
    fs.writeFileSync(path.join(outDir, ".tmt-profile.json"), JSON.stringify(profile, null, 2) + "\n", "utf8");
    return profile;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function main() {
    const opts = parseArgs(process.argv.slice(2));
    const templateDir = resolveTemplate(opts.from);
    const slug = slugify(opts.name);
    const modId = `${slug}-${randomSuffix(6)}`;
    const outDir = path.resolve(opts.outDir || path.join(process.cwd(), slug));

    if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0 && !opts.force) {
        die(`output directory already exists and is not empty: ${outDir}\nChoose another output dir or pass --force.`);
    }

    console.log(`Template : ${templateDir}`);
    console.log(`Output   : ${outDir}`);
    console.log(`Copying template ...`);
    // Never carry the template's own .git (history bloat + locked pack files on Windows).
    fs.cpSync(templateDir, outDir, {
        recursive: true,
        verbatimSymlinks: false,
        filter: (src) => {
            const rel = path.relative(templateDir, src);
            return rel === "" || !rel.split(path.sep)[0].startsWith(".git");
        },
    });

    // Patch index.html: ensure a charset meta so theme glyphs (×, —, emoji) survive
    // any static server (M-CHARSET: without it some servers render them as mojibake).
    const indexPath = path.join(outDir, "index.html");
    if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, "utf8");
        if (!/charset/i.test(html)) {
            html = html.replace(/<head>/i, '<head>\n\t<meta charset="utf-8" />');
            fs.writeFileSync(indexPath, html, "utf8");
            console.log("Patched index.html: charset meta injected");
        }
    }

    // Patch js/mod.js
    const modJsPath = path.join(outDir, "js", "mod.js");
    if (!fs.existsSync(modJsPath)) die("template has no js/mod.js — not a TMT template?");
    const src = fs.readFileSync(modJsPath, "utf8");
    const { out, patches } = patchModJs(src, opts, modId);

    const problems = verifyPatchedModJs(out, opts, modId);
    if (problems.length) {
        console.error(out.slice(0, 400)); // context for debugging
        die("patched js/mod.js failed verification:\n  - " + problems.join("\n  - "));
    }
    fs.writeFileSync(modJsPath, out, "utf8");

    // Syntax check the patched file with the running node itself.
    const chk = spawnSync(process.execPath, ["--check", modJsPath], { stdio: "pipe" });
    if (chk.status !== 0) {
        console.error(chk.stderr && chk.stderr.toString());
        die("patched js/mod.js does not parse (node --check failed)");
    }

    console.log(`\nPatched js/mod.js: ${patches.join(", ")}`);

    let profile = null;
    if (opts.type || opts.blueprint) {
        profile = writeProfile(outDir, opts);
        console.log(`\nWrote .tmt-profile.json`);
        if (profile.type) {
            console.log(`  Type      : ${profile.type} (${profile.typeName})`);
            console.log(`  Modifiers : ${profile.modifiers.length ? profile.modifiers.join(", ") : "(none)"}`);
            console.log(`  Exempt    : ${profile.exemptRules.length ? profile.exemptRules.join(", ") : "(none)"}`);
            if (profile.droppedModifiers.length) {
                console.log(`  DROPPED   :`);
                for (const d of profile.droppedModifiers) console.log(`    - ${d.id}: ${d.reason}`);
                console.log(`  >>> Record each dropped modifier in the design brief §10 with this reason.`);
            }
        } else {
            console.log(`  Type      : (none declared — no type gates apply)`);
        }
        if (profile.blueprint) console.log(`  Blueprint : ${profile.blueprint}`);
    }

    console.log(`\n============================================================`);
    console.log(`  Game    : ${opts.name}`);
    console.log(`  modInfo.id = "${modId}"`);
    console.log(`  >>> Record this id. It keys the savefile; changing it later`);
    console.log(`  >>> erases every player save. (07 hard rule 3)`);
    console.log(`============================================================`);
    console.log(`
Next steps (full pipeline in SKILL.md):
  1. STAGE 2 — write the design brief (assets/design-brief-template.md) BEFORE any code.
  2. STAGE 4 — implement, in this order:
       js/mod.js      : getPointGen(), isEndgame(), displayThings (reference: references/core/02)
       layer files    : one addLayer per layer, bottom row first. EVERY new layer file
                        must be appended to modInfo.modFiles (paths relative to js/).
       js/tree.js     : usually no changes needed for the default tree.
  3. STAGE 5 — run static checks:
       node "${path.resolve(__dirname, "static_checks.js")}" "${outDir}"
     Fix every FAIL before manual testing.
  4. STAGE 7 — serve the folder with any static file server and open index.html.`);
}

main();
