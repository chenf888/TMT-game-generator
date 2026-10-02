// fixture-good — minimal viable game per references/core/06 §1, plus a row-1 layer
// and a guarded achievement backfill. Expected static_checks result: 0 FAIL, 0 WARN.
let modInfo = {
    name: "Fixture Good",
    id: "fixture-good-test-aaaaaa",
    author: "TMT-Skill",
    pointsName: "points",
    modFiles: ["layers.js", "tree.js"],
    discordName: "",
    discordLink: "",
    initialStartPoints: new Decimal(10),
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
    if (hasUpgrade("p", 11)) gain = gain.times(2)
    if (hasUpgrade("p", 12)) gain = gain.times(upgradeEffect("p", 12))
    if (hasUpgrade("b", 11)) gain = gain.times(upgradeEffect("b", 11))
    return gain
}

function addedPlayerData() { return {} }

var displayThings = []

function isEndgame() { return player.points.gte(new Decimal("1e20")) }

var backgroundStyle = {}

function maxTickLength() { return 3600 }

function fixOldSave(oldVersion) {}
