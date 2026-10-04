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
//   [M-VERCMP]        [WARN] VERSION.num component "10" — the engine compares versions as
//                     TEXT (utils/save.js:301), so "0.10" sorts BELOW "0.1"
//   Lifecycle rules (2026-10-04, the The Galaxy Nebula postmortem):
//   [N-MSDESTROY]     [FAIL] layer "c" (row 2) has milestones reading .best but no
//                     doReset(), so rowReset() calls layerDataReset() with the DEFAULT
//                     keep list — the lifetime record the milestones score against is
//                     erased by the progression meant to earn it
//   [N-POINTSWRITE]   [WARN] layer "c" assigns player.c.points in update(), bypassing
//                     addPoints() — the only writer of best/total
//   [N-STATICMAX]     [FAIL] layer "f" is static with no canBuyMax(): getResetGain()
//                     returns 1 and doReset() clamps the payout to 1 (game.js:21/:186),
//                     so it banks exactly ONE floor per prestige
//   [N-AUTOWIPE]      [FAIL] layer "v" auto-prestiges at M1 but resetsNothing() only
//                     becomes true at M2 — the automation fires a milestone early and
//                     wipes the currency M2 is priced in (auto must IMPLY safe)
//   [N-AUTOWIPE]      [WARN] layer "v" keeps an "auto" flag that nothing ever reads
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

let VERSION = { num: "0.10", name: "First Steps" }   // [M-VERCMP] component "10"

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
