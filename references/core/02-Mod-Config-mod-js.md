# 02 — Mod Configuration (`js/mod.js`)

`js/mod.js` is the first modder file loaded. It holds game-wide identity, the economy's root, and the endgame. Engine updates never overwrite its contents. Everything below lives in this one file.

## `modInfo` object

| Field | Type | Notes |
|---|---|---|
| `name` | string | Game name, shown in the title/info tab. |
| `id` | string | **Critical.** Unique string determining the savefile location in localStorage. Set it when you start and **never change it afterward** — changing it wipes every existing save. (If absent, the engine falls back to `name-author` with spaces replaced by dashes; always set an explicit `id`.) |
| `author` | string | Displayed in the info tab. |
| `pointsName` | string | Display name of the main currency. The code still calls it `player.points`. |
| `modFiles` | array of strings | Files to load, **paths relative to `js/`** (e.g. `["layers.js", "tree.js"]`). Every layer file you create MUST be listed here or it silently never loads. Split layers across small files for maintainability. |
| `discordName`, `discordLink` | string | Optional community link shown in the info tab. |
| `offlineLimit` | number | Maximum offline time that can accumulate, **in hours**. Extra time is lost. Small values (0–2) protect balance; the demo template uses 1. |
| `initialStartPoints` | Decimal | Starting points for new players and after hard resets. |

## `VERSION`

```js
let VERSION = {
    num: "0.1",      // version number, shown top-right of the tree tab
    name: "First Steps", // version name, shown in the info tab
}
```

`VERSION.num` also drives save migration: when a save's stored version is older, `fixOldSave(oldVersion)` is called. Bump `num` with every content update.

## `changelog`

An HTML string displayed in the in-game changelog tab (rendered via `raw-html`). Keep it updated as content is added:

```js
let changelog = `<h1>Changelog:</h1><br>
    <h3>v0.1</h3><br>
        - Added the Prestige layer.<br>
        - Added first 6 upgrades.`
```

If it becomes very long, it can be moved to a separate file added to `index.html`.

## `winText`

A string shown on the endgame screen (after `isEndgame()` returns true). The player can then "keep going" or play again.

## `doNotCallTheseFunctionsEveryTick` — mandatory for custom functions

TMT calls **every function anywhere in `layers`** every tick, to cache results in `tmp`. This is fine for value-returning functions, but any custom function that *performs an action* must be listed here or it will fire ~20×/second:

```js
var doNotCallTheseFunctionsEveryTick = ["blowUpEverything", "claimReward"]
```

All official documented functions (`doReset`, `buy`, `onPurchase`, `onEnter`, `onExit`, `onClick`, `onComplete`, …) are already excluded — only your own invented function names go here.

## Core game-wide functions

### `getStartPoints()`
Returns a **Decimal**: starting points after a full reset. Default implementation returns `modInfo.initialStartPoints`.

### `canGenPoints()`
Returns a bool: whether the main currency generates at all. Use it to gate point production behind an upgrade/milestone (e.g. `return hasUpgrade("p", 11)`). The game only shows points/sec when this is true.

### `getPointGen()`
**The heart of the economy.** Returns a Decimal: points gained per second. Every bonus to point production must be applied here:

```js
function getPointGen() {
    if (!canGenPoints()) return new Decimal(0)
    let gain = new Decimal(1)
    if (hasUpgrade("p", 11)) gain = gain.times(2)
    if (hasUpgrade("p", 12)) gain = gain.times(upgradeEffect("p", 12))
    if (hasMilestone("p", 0)) gain = gain.times(3)
    return gain
}
```

### `addedPlayerData()`
Returns an object of extra **non-layer** values to save in `player` (with defaults for new games):

```js
function addedPlayerData() { return {
    weather: "Yes",
    happiness: new Decimal(72),
}}
```

Per-layer custom state belongs in `startData()` instead. Every value here must be a primitive or Decimal (it gets JSON-serialized).

### `displayThings`
Array of functions; each returns an optional string (basic HTML allowed) rendered as a line at the top of the tree tab. Returning nothing (`undefined`) hides the line:

```js
var displayThings = [
    function() {if (player.points.eq(69)) return "Tee hee!"},
    function() {if (inChallenge("c", 11)) return "The game is currently <h1>0%</h1> harder."},
]
```

### `isEndgame()`
Returns a bool: has the player beaten the game? When true, the win screen appears (`winText`), particles clear, and ticking stops unless the player keeps going. Set a realistic target, e.g.:

```js
function isEndgame() {
    return player.points.gte(new Decimal("1e400"))
}
```

## Less-important mod.js features

| Feature | Notes |
|---|---|
| `backgroundStyle` | CSS object (or function returning one) styling the whole game background. |
| `maxTickLength()` | Caps the game-tick length used for catch-up (default 3600). Useful when long offline ticks would break time-decay mechanics (usually in challenges). |
| `fixOldSave(oldVersion)` | Migration hook run when loading a save older than `VERSION.num`. Use it to adjust/cap resources for balance changes — **never force-reset players' saves from here.** |

## Reference template (complete minimal mod.js)

```js
let modInfo = {
    name: "My Incremental Tree",
    id: "my-incremental-tree-unique-id",   // set once, never change
    author: "YourName",
    pointsName: "points",
    modFiles: ["layers.js", "tree.js"],    // add every new layer file here
    discordName: "",
    discordLink: "",
    initialStartPoints: new Decimal(10),
    offlineLimit: 1,   // hours
}

let VERSION = { num: "0.1", name: "First Steps" }

let changelog = `<h1>Changelog:</h1><br><h3>v0.1</h3><br>- Initial release.`

let winText = `Congratulations! You have beaten the game!`

var doNotCallTheseFunctionsEveryTick = []   // add custom action-functions here

function getStartPoints() { return new Decimal(modInfo.initialStartPoints) }

function canGenPoints() { return true }

function getPointGen() {
    if (!canGenPoints()) return new Decimal(0)
    let gain = new Decimal(1)
    // apply upgrades / milestones / layer effects here
    return gain
}

function addedPlayerData() { return {} }

var displayThings = []

function isEndgame() { return player.points.gte(new Decimal("1e400")) }

var backgroundStyle = {}

function maxTickLength() { return 3600 }

function fixOldSave(oldVersion) {}
```
