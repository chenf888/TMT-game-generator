// fixture-bad — deliberately broken game. Every injected defect below is tagged with
// [RULE] and must be reported by static_checks.js with the matching rule id.
//
// Injected defects:
//   [M-ID]            modInfo has no id
//   [C-RAWNUM-1]      initialStartPoints: 10 (raw number)
//   [M-END-PLACEHOLDER][WARN] template placeholder endgame target kept
//   [D-STARTDATA]     layer "a" startData lacks unlocked
//   [D-PRESTIGE]      layer "a" (normal) lacks baseResource
//   [D-ROWMISSING]    rows 0 and 2 exist, row 1 missing (A2)
//   [D-REQLADDER]     row 2 requires 50 < row 0 requires 100000 (A1 backwards ladder)
//   [D-REQRATIO]      [WARN] ratio far outside x10..x100
//   [D-AUTOCOLLIDE]   [WARN] two milestones both claim autoUpgrade (Mario Maker conflict-point incident)
//   [C-RAWNUM-2]      cost: 100 (raw number)
//   [D-PUSHGUARD]     [WARN] milestone push without !has guard
//   [D-BRANCH]        branch edge to nonexistent layer "zzz"
//   [C-MOD]           .mod( call (no such Decimal method)
//   [C-EXPANTA]       ExpantaNum reference (framework-swapped mod code)
//   [D-DUPKEY]        gainMult defined twice in layer "c"
//   [M-UNREG]         js/extra.js defines addLayer("e") but is not in modFiles
//   [D-MICROTABS]     [FAIL] layer "m": 20 content items, no tabFormat/microtabs (handbook 10 §3)
//   [D-EFFECTMONO]    [WARN] layers "m" (12/16 flat) and "n" (8/8 inline constants) — 10 §2
//   [D-MECHQUOTA]     [WARN] 4 main layers, zero challenges/clickables/bars/grids — 10 §5
let modInfo = {
    name: "Fixture Bad",
    author: "TMT-Skill",
    pointsName: "points",
    modFiles: ["layers.js", "tree.js"],
    discordName: "",
    discordLink: "",
    initialStartPoints: 10,
    offlineLimit: 1,
}

let VERSION = { num: "0.1", name: "First Steps" }

let changelog = `<h1>Changelog:</h1><br><h3>v0.1</h3><br>- Initial release.`

let winText = `Congratulations! You have beaten the fixture game!`

var doNotCallTheseFunctionsEveryTick = []

function getStartPoints() { return new Decimal(modInfo.initialStartPoints) }

function canGenPoints() { return true }

function getPointGen() {
    if (!canGenPoints()) return new Decimal(0)
    let gain = new Decimal(1)
    return gain
}

function addedPlayerData() { return {} }

var displayThings = []

function isEndgame() { return player.points.gte(new Decimal("e280000000")) }

var backgroundStyle = {}

function maxTickLength() { return 3600 }

function fixOldSave(oldVersion) {}
