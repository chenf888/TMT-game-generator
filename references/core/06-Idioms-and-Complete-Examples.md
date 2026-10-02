# 06 — Idioms and Complete Examples

Battle-tested patterns distilled from the official tutorial and the demo mod (`js/Demo/`). Use them as templates when generating games.

## 1. The minimal viable game (complete walkthrough)

**Goal:** points generate → layer "p" at 10 points → upgrades that boost point gain → endgame.

### `js/mod.js`

```js
let modInfo = {
    name: "The Example Tree",
    id: "example-tree-2024-01",        // unique, set once
    author: "AI",
    pointsName: "points",
    modFiles: ["layers.js", "tree.js"],
    discordName: "",
    discordLink: "",
    initialStartPoints: new Decimal(10),
    offlineLimit: 1,
}

let VERSION = { num: "0.1", name: "Beginning" }

let changelog = `<h1>Changelog:</h1><br><h3>v0.1</h3><br>- Added the prestige layer and 3 upgrades.`

let winText = `Congratulations! You have beaten the example game!`

var doNotCallTheseFunctionsEveryTick = []

function getStartPoints() { return new Decimal(modInfo.initialStartPoints) }

function canGenPoints() { return true }

function getPointGen() {
    if (!canGenPoints()) return new Decimal(0)
    let gain = new Decimal(1)
    if (hasUpgrade("p", 11)) gain = gain.times(2)                          // static boost
    if (hasUpgrade("p", 12)) gain = gain.times(upgradeEffect("p", 12))     // scaling boost
    return gain
}

function addedPlayerData() { return {} }
var displayThings = []
function isEndgame() { return player.points.gte(new Decimal("1e20")) }
var backgroundStyle = {}
function maxTickLength() { return 3600 }
function fixOldSave(oldVersion) {}
```

### `js/layers.js` — the prestige layer

```js
addLayer("p", {
    name: "prestige",
    symbol: "P",
    position: 0,
    startData() { return { unlocked: true, points: new Decimal(0) } },
    color: "#4BDC13",
    resource: "prestige points",
    row: 0,
    baseResource: "points",
    baseAmount() { return player.points },
    requires: new Decimal(10),
    type: "normal",
    exponent: 0.5,
    gainMult() {
        let mult = new Decimal(1)
        if (hasUpgrade("p", 13)) mult = mult.times(upgradeEffect("p", 13))
        return mult
    },
    gainExp() { return new Decimal(1) },
    layerShown() { return true },
    hotkeys: [
        {key: "p", description: "P: Reset for prestige points",
         onPress() { if (canReset(this.layer)) doReset(this.layer) }},
    ],
    upgrades: {
        11: {
            title: "Point generation",
            description: "Double your point gain.",
            cost: new Decimal(1),
        },
        12: {
            title: "Compound interest",
            description: "Point gain is boosted by your unspent prestige points.",
            cost: new Decimal(2),
            unlocked() { return hasUpgrade(this.layer, 11) },
            effect() { return player[this.layer].points.add(1).pow(0.5) },
            effectDisplay() { return format(this.effect()) + "x" },
        },
        13: {
            title: "Feedback loop",
            description: "Prestige point gain is boosted by your points.",
            cost: new Decimal(5),
            unlocked() { return hasUpgrade(this.layer, 12) },
            effect() { return player.points.add(1).pow(0.15) },
            effectDisplay() { return format(this.effect()) + "x" },
        },
    },
})
```

`js/tree.js` needs no changes for a single layer. **This is a complete playable game.** Reload the page and play; `isEndgame()` at 1e20 points triggers the win screen.

---

## 2. Idioms from the official demo

### 2.1 Layer-wide passive effect (effect object pattern)

```js
// Layer "c" boosts waffles and raises an ice-cream cap just by holding currency:
effect() {
    return {
        waffleBoost: Decimal.pow(player[this.layer].points, 0.2),
        icecreamCap: player[this.layer].points.times(10),
    }
},
effectDescription() {
    let eff = this.effect()
    eff.waffleBoost = eff.waffleBoost.times(buyableEffect(this.layer, 11).first) // mix in a buyable
    return "which are boosting waffles by " + format(eff.waffleBoost)
         + " and increasing the Ice Cream cap by " + format(eff.icecreamCap)
},
```

Apply `eff.waffleBoost` where waffle gain is computed (another layer's `update()`, `getPointGen()`, etc.).

### 2.2 Milestone chain with toggles (automation unlocks)

```js
milestones: {
    0: { requirementDescription: "3 lollipops",
         done() { return player[this.layer].best.gte(3) },
         effectDescription: "Unlock the next milestone" },
    1: { requirementDescription: "4 lollipops",
         unlocked() { return hasMilestone(this.layer, 0) },
         done() { return player[this.layer].best.gte(4) },
         effectDescription: "You can toggle beep and boop",
         toggles: [["c", "beep"], ["f", "boop"]] },
}
```

Then in `automate()` or elsewhere: `if (player.c.beep && hasMilestone("c", 1)) doAutomation()` — **always re-check `hasMilestone`**, the toggle itself never turns off.

### 2.3 Buyable respec (with the engine-tracked spending record)

```js
buyables: {
    respec() {
        player[this.layer].points = player[this.layer].points.add(player[this.layer].spentOnBuyables)
        doReset(this.layer, true)      // respec includes a forced layer reset
    },
    respecText: "Respec Thingies",
    respecMessage: "Are you sure? Respeccing these doesn't accomplish much.",
    11: { /* cost(x)/effect(x)/display/canAfford/buy as in 04 §5 */ },
},
```

⚠ The demo's `respec()` also calls `resetBuyables(this.layer)` — **that function does not exist** in the engine. The `doReset(this.layer, true)` forced reset already restores buyables. Use `respecBuyables(layer)` if you want the confirm-button behavior from a hotkey.

### 2.4 Clickable state machine (+ master button)

See the full pattern in [04 §6](04-Game-Components.md). Idiom: a `switch` over `getClickableState` advancing a string state, a `masterButtonPress()` that repairs the terminal "Borkened..." state, and `style()` switching colors per state.

### 2.5 Static layer with custom identity (`f.js`)

```js
addLayer("f", {
    startData() { return { unlocked: false, points: new Decimal(0),
                           clickables: {[11]: "Start"} } },   // default clickable state
    color: "#FE0102",
    resource: "farm points",
    baseResource: "points",
    baseAmount() { return player.points },
    requires() { return new Decimal(10) },    // can be a function
    type: "static",
    exponent: 0.5,
    base: 3,
    roundUpCost: true,
    canBuyMax() { return false },             // one-at-a-time static layer
    row: 1,
    branches: ["c"],                          // draws a line from f to c
    layerShown() { return true },
    tooltipLocked() {                          // custom locked-node tooltip
        return "This weird farmer dinosaur will only see you if you have at least "
             + this.requires() + " points. You only have " + formatWhole(player.points)
    },
    // custom-type-style overrides while keeping static math:
    prestigeButtonText() { /* full custom HTML button text using tmp[this.layer].nextAt */ },
    getResetGain() { return getResetGain(this.layer, useType = "static") },
    getNextAt(canMax = false) { return getNextAt(this.layer, canMax, useType = "static") },
    canReset() { return tmp[this.layer].baseAmount.gte(tmp[this.layer].nextAt) },
})
```

Remember: for static layers, **`gainMult` smaller = cheaper** (boost), **`gainExp` larger = cheaper**.

### 2.6 Side achievements layer with a grid (`a.js`)

```js
addLayer("a", {
    startData() { return { unlocked: true, points: new Decimal(0) } },
    color: "yellow",
    resource: "achievement power",
    row: "side",                              // side layers are never reset
    tooltip() { return "Achievements" },
    achievementPopups: true,
    achievements: {
        11: { name: "Get me!", done() { return true },
              goalTooltip: "How did this happen?", doneTooltip: "You did it!" },
        13: { name: "EIEIO",
              done() { return player.f.points.gte(1) },
              tooltip: "Get a farm point.<br>Reward: you can max Farm Points." },
    },
    midsection: ["grid", "blank"],            // grid shown in the middle of the default layout
    grid: {
        rows: 2, cols: 2, maxRows: 3, maxCols: 3,
        getStartData(id) { return id },
        getCanClick(data, id) { return player.points.eq(10) },
        getStyle(data, id) { return {'background-color': '#' + (data * 1234 % 999999)} },
        onClick(data, id) { player[this.layer].grid[id]++ },
        getTitle(data, id) { return "Gridable #" + id },
        getDisplay(data, id) { return data },
    },
})
```

### 2.7 Decorative/interactive tree nodes (`demoTree.js`)

```js
addNode("g", {                        // "Thanos" button: halves your points
    symbol: "TH", color: '#6d3678',
    branches: [["c", "red", 4]],      // red width-4 line to layer c
    layerShown: true,
    canClick() { return player.points.gte(10) },
    tooltip: "Thanos your points",
    onClick() { player.points = player.points.div(2) },
})
addNode("spook", { row: 1, layerShown: "ghost" })   // invisible spacer
```

### 2.8 Progress display things (mod.js)

```js
var displayThings = [
    function() { if (player.points.eq(69)) return "Tee hee!" },
    function() { if (player.f.points.gt(1)) return `You have ${player.f.points} farm points.` },
    function() { if (inChallenge("c", 11)) return "The game is currently <h1>0%</h1> harder." },
]
```

### 2.9 Rich tab layout (c.js, condensed)

```js
tabFormat: {
    "main tab": {
        buttonStyle() { return {'color': 'orange'} },
        shouldNotify: true,
        glowColor: "blue",
        content: [
            "main-display", "prestige-button", "resource-display",
            ["blank", "5px"],
            ["raw-html", function() { return "<button onclick='makeParticles(textParticle)'>HI</button>" }],
            ["display-text", function() { return 'I have ' + format(player.points) + ' points!' },
             {"color": "red", "font-size": "32px"}],
            "h-line", "milestones", "blank", "upgrades", "challenges",
        ],
    },
    "thingies": {
        content: [
            "buyables", "blank",
            ["row", [
                ["toggle", ["c", "beep"]], ["blank", ["30px", "10px"]],
                ["display-text", "Beep"], "blank", ["v-line", "200px"],
                ["column", [
                    ["prestige-button", "", {'width': '150px', 'height': '80px'}],
                    ["prestige-button", "", {'width': '100px', 'height': '150px'}],
                ]],
            ], {'width': '600px', 'height': '350px', 'background-color': 'green'}],
            "blank", ["display-image", "discord.png"],
        ],
    },
    "jail": {
        content: [
            ["infobox", "coolInfo"], ["bar", "longBoi"], "blank",
            ["row", [
                ["column", [["display-text", "Sugar level:"], "blank", ["bar", "tallBoi"]]],
                "blank",
                ["column", [["display-text", "idk"], ["blank", ['0', '50px']], ["bar", "flatBoi"]]],
            ]],
            "blank", ["tree", testTree],
        ],
    },
    "illuminati": {
        unlocked() { return hasUpgrade("c", 13) },
        content: [
            ["raw-html", function() { return "<h1> C O N F I R M E D </h1>" }], "blank",
            ["microtabs", "stuff"], "blank",
            ["slider", ["otherThingy", 1, 30]], "blank",
            ["upgrade-tree", [[11], [12, 22, 22, 11]]],
        ],
    },
}
```

### 2.10 Bars with log-scale progress

```js
bars: {
    longBoi: {
        direction: RIGHT, width: 300, height: 30,
        progress() { return player.points.add(1).log(10).div(10).toNumber() },  // 0→1 over 1e10
        display() { return format(player.points) + " / 1e10 points" },
        fillStyle: {'background-color': "#FFFFFF"},
        baseStyle: {'background-color': "#696969"},
    },
    tallBoi: {
        direction: UP, width: 50, height: 200,
        progress() { return player.points.div(100) },
        display() { return formatWhole(player.points.min(100)) + "%" },
    },
}
```

## 3. Where effects get implemented (the wiring map)

| You promised in… | Implement in… |
|---|---|
| Upgrade "double point gain" | `getPointGen()` in mod.js (`gain = gain.times(2)` or `upgradeEffect`) |
| Upgrade "boost prestige gain" | Layer's `gainMult()` |
| Layer effect ("currency boosts X") | Wherever X is produced (another layer's `update()`, `getPointGen()`, `gainMult()`) |
| Milestone "automate prestige" | `automate()` on the layer or `autoPrestige()`/`passiveGeneration()` flags set by `hasMilestone` checks |
| Challenge handicap ("point gain /10") | `getPointGen()` gated by `inChallenge(layer, id)` |
| Challenge reward ("×2 point gain") | `getPointGen()` gated by `hasChallenge(layer, id)` |
| Achievement reward | Same pattern with `hasAchievement` |
| Buyable effect | Consumers read `buyableEffect(layer, id)` |

**Rule of thumb:** descriptions are marketing; the wiring map is the contract. Every generated game must implement every promise exactly once, in the place listed above.
