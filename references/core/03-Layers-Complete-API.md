# 03 — Layers: The Complete API

A **layer** is one prestige level of the game (a tree node with its own tab). Layers are created with:

```js
addLayer("p", {
    // ... all features below ...
})
```

The layer id (`"p"`) is used everywhere: `player.p.points`, `hasUpgrade("p", 11)`, branch targets, etc. Ids are short strings (typically 1–2 lowercase letters). Non-clickable decorative/interactive tree nodes use `addNode(id, {...})` instead (see §9).

Label key: *(no label)* = required · **sometimes required** · **optional** · **assigned automagically** · **OVERRIDE** · **deprecated**.

---

## 1. Save data — `startData()` *(no label — effectively required)*

Returns the layer's initial saved state. Must include at least the two required fields, and use Decimals:

```js
startData() { return {
    unlocked: true,                  // Required. Is this layer unlocked?
    points: new Decimal(0),          // Required. The layer's main prestige currency ("points" internal name)
    // Optional standard fields:
    total: new Decimal(0),           // lifetime sum of prestige currency (only DISPLAYED if present here)
    best: new Decimal(0),            // highest prestige currency ever (only DISPLAYED if present here)
    unlockOrder: 0,                  // how many other layers were unlocked first (used by requires)
    resetTime: 0,                    // seconds since last prestige (maintained by engine)
    // Any custom variables your layer needs (booleans, Decimals, strings):
    beep: false,
    otherThingy: 10,
}}
```

- Presence of `total`/`best` in `startData()` makes the engine show them in the default resource display (`showTotal`/`showBest`).
- The engine always also maintains: `buyables`, `clickables`, `challenges`, `grid`, `upgrades` (array), `milestones` (array), `achievements` (array), `activeChallenge`, `spentOnBuyables`, `forceTooltip`, `noRespecConfirm`, `prevTab`.
- Custom variables here are saved and can be toggled by milestone `toggles` and modified in `update()`.

## 2. Identity and display features

| Feature | Label | Meaning |
|---|---|---|
| `layer` | **assigned automagically** | The layer's own id, also set on every upgrade/buyable/etc. in the layer. Use `this.layer` / `player[this.layer]` for copy-paste-friendly code. |
| `name` | optional | Used in reset confirmations and default infobox titles. Defaults to the layer id. |
| `color` | optional | The layer's theme color (hex string with `#`). Used across node, button, glow. |
| `resource` | optional | Display name of the layer's main currency (e.g. `"prestige points"`). |
| `row` | optional (practically required) | Row in the tree, starting at 0. Determines node position on the default tree AND which resets affect the layer. `"side"` makes it a small side node (achievements/statistics) that is **never auto-reset**. |
| `displayRow` | **OVERRIDE** | Moves the node on the tree without changing reset order. |
| `symbol` | optional | Text on the tree node. Defaults to the capitalized layer id. |
| `image` | **OVERRIDE** | URL of an image on the node instead of the symbol. |
| `position` | optional | Horizontal position within the row (default: alphabetical by id). |
| `layerShown()` | optional | Returns true/false (or `"ghost"` = hidden but still occupying tree space). Defaults to true. |
| `effect()` | optional | Computes the layer's passive bonus(es) from its currency. Returns a value or an object of values. **You must implement the effect where it applies** (e.g. in `getPointGen`). |
| `effectDescription` | optional | Text (string or function) describing `effect()`. |
| `style` | optional | CSS object for the layer's whole tab (can be a function). |
| `nodeStyle` | optional | CSS object for the tree node. |
| `tabFormat` | optional | Custom tab layout (see [05](05-UI-Layouts-and-Visuals.md)). |
| `midsection` | optional | Alternative to tabFormat: components inserted between Milestones and Buyables in the default layout. Cannot contain subtabs. |
| `hotkeys` | optional | Array of hotkey objects (below). |
| `tooltip()` / `tooltipLocked()` | optional | Node tooltips when unlocked/locked. `""` disables. |
| `marked` | optional | Star (`true`) or image URL badge on the node corner. |
| `glowColor` | optional | Highlight color when the layer should notify (default red). |
| `componentStyles` | optional | Object of functions returning CSS per component type, e.g. `{"prestige-button"() { return {"color": "#AA66AA"} }}`. |

### Hotkeys

```js
hotkeys: [
    {
        key: "p",                    // lowercase key; "ctrl+x" combos work; use uppercase for shift
        description: "p: reset your points for prestige points",  // shown in How To Play
        onPress() { if (player.p.unlocked) doReset("p") },
        unlocked() { return hasMilestone('p', 3) },   // optional; defaults to true
    }
]
```

## 3. Prestige formula — `type` and friends

`type` **optional, defaults to `"none"`** (a non-prestige layer):

| Type | Formula (before bonuses) | Behavior |
|---|---|---|
| `"normal"` | gain = `(baseAmount / requires) ^ exponent` | Gain independent of current currency (like classic Prestige). |
| `"static"` | cost of next = `requires × base^(x^exponent)` | Cost depends on how much currency you already have; usually gain 1 per reset. |
| `"custom"` | You define `getResetGain()`, `getNextAt()`, `canReset()`, button text. | Fully manual. |
| `"none"` | — | No prestige; omit the rest of this section. |

Required/related features:

| Feature | Label | Meaning |
|---|---|---|
| `baseResource` | optional | Display name of the resource prestige gain is based on. |
| `baseAmount()` | optional (required for normal/static) | Function returning the current amount of `baseResource` (e.g. `() { return player.points }`). |
| `requires` | optional (practically required) | Decimal: amount of base needed for 1 prestige currency; **also the layer's unlock requirement**. May be a **function** — typically scaling with `unlockOrder` to make parallel layers harder. |
| `exponent` | optional | As in the formulas above (normal: 0.5 is classic). |
| `base` | **sometimes required** | Base of the static formula. Must be > 1, defaults to 2 (engine forces ≤1 up to 2). |
| `roundUpCost` | optional | Bool; round costs up (use when the base resource itself is an integer currency). |
| `gainMult()` | optional | **normal:** multiplies prestige gain. **static:** multiplies the COST — to make a static layer *easier*, make this *smaller*. |
| `gainExp()` | optional | **normal:** exponent on gain. **static:** roots the cost — to make a static layer *easier*, make this *larger*. |
| `directMult()` | optional | Multiplies gain after exponents and softcaps (normal); on static actually multiplies gain. |
| `softcap` / `softcapPower` | optional | **normal only:** gain beyond `softcap` is raised to `softcapPower` (with the standard softcap curve). Defaults `e1e7` and `0.5`. Prevents runaway gain. |

### Exact engine formulas (verified from `js/game.js`)

**Normal layer gain:**
```
gain = (baseAmount / requires) ^ exponent × gainMult, all ^ gainExp
if gain ≥ softcap: gain = gain^softcapPower × softcap^(1 − softcapPower)
gain = gain × directMult
resetGain = floor(gain), min 0
```

**Static layer gain (buy max):**
```
if !canBuyMax or baseAmount < requires → gain = 1
raw = ((baseAmount / requires / gainMult), max 1) → log(base) → × gainExp → ^(1/exponent)
gain = floor(raw × directMult) − currentPoints + 1, min 1
```

**Static next cost (`nextAt`):**
```
amt = (points [+ pending resetGain if buying max]) / directMult
cost = requires × base^(amt^exponent / gainExp), at least `requires`, ceil if roundUpCost
```

**Normal next cost:** the inverse of the normal gain formula (including softcap inversion).

### Other prestige features

| Feature | Label | Meaning |
|---|---|---|
| `canBuyMax()` | **sometimes required** | Static layers: whether buying max is allowed. |
| `onPrestige(gain)` | optional | Runs right before currency is granted on prestige (secondary resources, recalculation). |
| `resetDescription` | optional | Replaces `"Reset for "` on the prestige button. |
| `prestigeButtonText()` | **sometimes required** | Full custom prestige-button text (HTML allowed). Required for custom-type layers. `tmp[layer].resetGain` and `tmp[layer].nextAt` are available. |
| `passiveGeneration()` | optional | Number n: the layer auto-generates `resetGain × n` per second. Best for automating **normal** layers. |
| `autoPrestige()` | optional | Bool: automatically prestige whenever possible. Best for **static** layers. |
| `resetsNothing()` | optional | Bool: prestiging this layer triggers no other resets. |
| `increaseUnlockOrder` | optional | Array of layer ids; when this layer is first unlocked, `unlockOrder` of listed un-unlocked layers increments (use with function-`requires` to raise their cost). |

### Custom prestige type

For `type: "custom"` (usable by any type as overrides):

| Feature | Meaning |
|---|---|
| `getResetGain()` | Returns the gain if you reset now. Can call the engine's `getResetGain(this.layer, useType = "static")` to reuse a standard formula. |
| `getNextAt(canMax = false)` | Returns base-currency needed for the next gain. Support both `canMax` cases if possible. Can delegate: `getNextAt(this.layer, canMax, useType = "static")`. |
| `canReset()` | Return true when a prestige is possible. |
| `prestigeNotify()` | Return true when the node should subtly highlight (meaningful gain available). |

## 4. Resets — `doReset` and `layerDataReset`

### Default reset behavior (no `doReset` defined)

When layer **L** is prestiged (`doReset("L")` runs):

1. All layers in rows **≥ L.row** have challenges exited/completed.
2. Main `points` → 0 if L.row == 0, else `getStartPoints()`.
3. For each row x from L.row down to 0 (and all side layers): every layer in that row either runs its own `doReset(L)` if defined, or — if the layer's row is strictly **lower** than L's — gets a full `layerDataReset` (everything wiped except engine-kept fields).
4. Same-row layers **without** `doReset` are NOT reset by a same-row prestige.

### `doReset(resettingLayer)` — optional OVERRIDE

Called on this layer whenever a layer of **equal or greater row** resets (always called for side layers too, which reset nothing by default). **Defining `doReset` replaces the default behavior for this layer entirely** — you must call `layerDataReset` yourself when appropriate:

```js
doReset(resettingLayer) {
    if (layers[resettingLayer].row > this.row)
        layerDataReset(this.layer, ["points", "upgrades", "milestones"])
}
```

### `layerDataReset(layer, keep = [])`

Resets the layer: buyables/clickables/challenges/grid restored to start values, `upgrades`/`milestones`/`achievements` emptied, then the fields named in `keep` restored. Always kept regardless: `unlocked`, `forceTooltip`, `noRespecConfirm`, `prevTab`. Common keep entries: `"points"`, `"best"`, `"total"`, `"upgrades"`, `"milestones"`, `"achievements"`, or custom variable names. To keep only specific upgrades, save them aside, call `layerDataReset`, then reassign `player[layer].upgrades`.

## 5. Automation and per-tick behavior

| Feature | Label | Meaning |
|---|---|---|
| `update(diff)` | optional | Called every tick with `diff` = seconds since last tick. Use for passive production, timers, decay. |
| `automate()` | optional | Called every tick after production — for custom automation not covered by the built-ins. |
| `autoUpgrade` | optional | Bool: attempt to buy all affordable upgrades in this layer every tick. |
| `deactivated` | optional | Bool (engine/you may set): disables has* helpers, purchases, clicks, milestone/achievement gains in this layer. You must disable your own effects manually. |
| `shouldNotify()` | optional | Highlights the node when true. (The node auto-highlights when an upgrade is affordable anyway.) |
| `leftTab` | optional | Bool: display this layer in the left tab. |
| `previousTab` | optional | Layer id: always show a back arrow leading to that layer. |

## 6. Side layers

`row: "side"` places a small node beside the tree. Side layers:

- Are **never reset** by any prestige (unless you add a `doReset`).
- Typically hold **achievements** or statistics (see [04](04-Game-Components.md)).
- Their node is smaller and positioned by the engine's side strip.

## 7. Engine defaults (from `setupLayer` in layerSupport.js)

If omitted, every layer gets: `gainMult = 1`, `gainExp = 1`, `directMult = 1`, `type = "none"`, `base = 2`, `softcap = e1e7`, `softcapPower = 0.5`, `displayRow = row`, `name = id`, `layerShown = true`, `glowColor = "#ff0000"`, `symbol = capitalized id`, `unlockOrder = []`, `componentStyles = {}`. Every upgrade/milestone/achievement/challenge/buyable/clickable/bar/infobox gets `unlocked = true` unless defined. Buyables get `purchaseLimit = Infinity` and an auto `canBuy`; challenges get `completionLimit = 1` and auto-star at max completions.

## 8. Minimal complete layer (annotated)

```js
addLayer("p", {
    name: "prestige",                          // optional display name
    symbol: "P",                               // node text
    position: 0,                               // horizontal position in row 0
    startData() { return {
        unlocked: true,
        points: new Decimal(0),
    }},
    color: "#4BDC13",
    resource: "prestige points",
    row: 0,

    baseResource: "points",                    // what the gain is based on
    baseAmount() { return player.points },
    requires: new Decimal(10),                 // unlock threshold + cost of 1 point

    type: "normal",
    exponent: 0.5,

    gainMult() { return new Decimal(1) },      // wire boosts here
    gainExp() { return new Decimal(1) },

    layerShown() { return true },

    hotkeys: [
        {key: "p", description: "P: Reset for prestige points",
         onPress() { if (canReset(this.layer)) doReset(this.layer) }},
    ],

    upgrades: {},                              // see 04-Game-Components.md
})
```

## 9. Non-layer tree nodes (`addNode`)

```js
addNode("thanos", {
    symbol: "TH",
    color: '#6d3678',
    branches: [["c", "red", 4]],       // branch to layer "c", red, width 4
    layerShown: true,                  // or a function; "ghost" = spacer node
    row: 1,                            // for the default tree layout
    canClick() { return player.points.gte(10) },
    onClick() { player.points = player.points.div(2) },
    tooltip: "Thanos your points",
    tooltipLocked: "Thanos your points",
    nodeStyle: {},
})
```

Node features: `color`, `symbol`, `canClick()`, `onClick()`, `layerShown()` (bool or `"ghost"` — ghost nodes are invisible spacers that reserve layout room), `branches`, `nodeStyle`, `tooltip()/tooltipLocked()`, `row`, `position`. Nodes have **no saved state**; they're purely presentational/interactive. See [05](05-UI-Layouts-and-Visuals.md) for custom tree layouts.
