# 04 — Game Components (The 9 Big Features)

Every component lives inside a layer: `addLayer("p", { upgrades: {...}, milestones: {...}, ... })`. Each entry is keyed by an id and defined as an object of features. All display strings support basic HTML and can be functions returning updating text.

## Shared conventions (apply to most components)

- **Id conventions.** Upgrades, achievements, challenges, buyables, and clickables conventionally use **numeric ids where the first digit is the row and the second is the column** (`11`, `12`, `21`, …). The engine auto-computes `rows`/`cols` from these ids for the default grid layout (`setRowCol`). Milestones usually use sequential ids (0, 1, 2…). Bars, infoboxes use string ids.
- **`layer` and `id` are assigned automagically** on every entry. Inside feature functions, `this.layer` and `this.id` refer to them.
- **`unlocked()`** *(optional)* — bool controlling visibility; defaults to true.
- **`style`** *(optional)* — CSS object (keys = CSS attributes, values as strings); may be a function.
- **`tooltip`** *(optional)* — hover tooltip text (HTML); `""` disables.
- **`marked`** *(optional)* — star (`true`) or image URL in the corner (challenges, buyables, clickables).
- **`branches`** *(optional)* — array of sibling ids rendering connector lines (for upgrade/buyable/clickable trees). Entries may be `[id]`, `[id, color]` (hex string or 1–3 = theme colors), or `[id, color, width]`. Used with the `upgrade-tree`/`buyable-tree`/`clickable-tree` components.
- **Effects are never automatic.** `description`/`effectDescription`/`rewardDescription` are text; implement every promised bonus in the right place (usually `getPointGen()`, `gainMult()`, `update()`, or another layer's effects).

---

## 1. Upgrades — one-time purchases

Helpers: `hasUpgrade(layer, id)` · `upgradeEffect(layer, id)` · `buyUpgrade(layer, id)` · `canAffordUpgrade(layer, id)`.

```js
upgrades: {
    11: {
        title: "Generator of Genericness",
        description: "Gain 1 point every second.",
        cost: new Decimal(1),
        unlocked() { return player[this.layer].unlocked },
    },
    12: {
        description: "Point generation is boosted by your unspent prestige points.",
        cost: new Decimal(1),
        unlocked() { return hasUpgrade(this.layer, 11) },
        effect() { return player[this.layer].points.add(1).pow(0.5) },
        effectDisplay() { return format(this.effect()) + "x" },
        branches: [11],            // draws a line to upgrade 11
    },
}
```

| Feature | Label | Meaning |
|---|---|---|
| `title` | optional | Large-font header (string or function, HTML). |
| `description` | *(no label)* | What the upgrade does. Implement the effect elsewhere. |
| `effect()` | optional | Computes the bonus (value or object). |
| `effectDisplay()` | optional | Formats the current effect for display. |
| `fullDisplay()` | **OVERRIDE** | Replaces all other text with your own full display. Required when the upgrade has no `cost`. |
| `cost` | sort of optional | Decimal cost; defaults to the layer's prestige currency. Omit (with `fullDisplay`) for free/custom purchases. |
| `unlocked()` | optional | Visibility. Default visible. |
| `onPurchase()` | optional | Side effects at purchase (e.g. set flags). |
| `style`, `tooltip` | optional | As in shared conventions. |
| `currencyDisplayName`, `currencyInternalName`, `currencyLayer`, `currencyLocation()` | optional | Pay with a **different currency**. `currencyLocation()` returns the object holding the value (e.g. `() { return player[this.layer].buyables }`), used together with `currencyInternalName: 11` for a buyable's amount. Must be Decimal-valued. |
| `canAfford()` / `pay()` | **OVERRIDE** | Custom purchase logic (multi-currency, extra requirements). Use with `fullDisplay`. |
| `branches` | optional | Connector lines for upgrade trees. |

Engine purchase flow (verified): `buyUpg` checks layer unlocked/not deactivated/upgrade unlocked/not already owned/affordable (via `cost` against the chosen currency, or your `pay`), spends, pushes the id into `player[layer].upgrades`, runs `onPurchase()`.

## 2. Milestones — threshold rewards

Helpers: `hasMilestone(layer, id)`. Ids are typically sequential (0, 1, 2…). Usually gate on `best`/`total` so rewards survive resets.

```js
milestones: {
    0: {
        requirementDescription: "3 lollipops",
        effectDescription: "Unlock the next milestone",
        done() { return player[this.layer].best.gte(3) },
    },
    1: {
        requirementDescription: "4 lollipops",
        unlocked() { return hasMilestone(this.layer, 0) },
        done() { return player[this.layer].best.gte(4) },
        effectDescription: "You can toggle automation",
        toggles: [["p", "auto"], ["c", "beep"]],   // [layer, variableName] pairs
    },
}
```

| Feature | Label | Meaning |
|---|---|---|
| `requirementDescription` | *(no label)* | What is needed. Tip: use **total/best** rather than current points. |
| `effectDescription` | *(no label)* | The reward. Implement it elsewhere. |
| `done()` | *(no label)* | Bool: is the milestone achieved? |
| `onComplete()` | optional | Fires once when completed. |
| `toggles` | optional | Array of `[layer, variableName]` pairs → toggle buttons on the milestone that flip saved booleans (automation switches). **Caveat:** toggles are NOT un-set if the milestone would become locked — re-check `hasMilestone` in the automation logic. |
| `unlocked()`, `style`, `tooltip` | optional | As shared conventions (hide later milestones until earlier ones are done). |

Layer-level: `milestonePopups: false` disables the popup toast.

## 3. Achievements — goal badges

Helpers: `hasAchievement(layer, id)` · `achievementEffect(layer, id)`. Same row-column ids. For **global** achievements, put them on a **side layer** (`row: "side"`).

```js
achievements: {
    11: {
        name: "Get me!",
        done() { return player.points.gte(100) },
        tooltip: "Have 100 points.<br>Reward: point gain ×1.5",
        effect() { return new Decimal(1.5) },          // optional reward
        onComplete() { /* side effects */ },           // optional
        image: "discord.png",                          // optional icon URL
        textStyle: {'color': '#04e050'},               // optional
    },
}
```

| Feature | Label | Meaning |
|---|---|---|
| `name` | optional | The only visible text on the badge. |
| `done()` | *(no label)* | Bool: earned? |
| `tooltip` | *(no label)* | Hover text conveying goal + reward. `""` disables. |
| `effect()` | optional | Bonus value(s). |
| `unlocked()`, `onComplete()`, `image`, `style`, `textStyle` | optional | As above. |
| `goalTooltip` / `doneTooltip` | **deprecated** | Old split-tooltips. Use a dynamic `tooltip` function instead. |

Layer-level: `achievementPopups: false` disables popups.

## 4. Challenges — optional handicaps with rewards

Helpers: `inChallenge(layer, id)` · `hasChallenge(layer, id)` · `challengeCompletions(layer, id)` · `maxedChallenge(layer, id)` · `challengeEffect(layer, id)`. Entering a challenge **resets the layer** (and applies its handicaps — which you implement); reaching the win condition completes it.

```js
challenges: {
    11: {
        name: "Fun",
        challengeDescription() {
            return "Makes the game 0% harder<br>" + challengeCompletions(this.layer, this.id)
                 + "/" + this.completionLimit + " completions" },
        goalDescription: "Have 20 points",
        canComplete() { return player.points.gte(20) },   // truthy number = bulk complete
        rewardDescription: "Says hi",
        rewardEffect() { return player[this.layer].points.add(1).tetrate(0.02) },
        rewardDisplay() { return format(this.rewardEffect()) + "x" },
        completionLimit: 3,               // optional, default 1
        unlocked() { return player[this.layer].best.gt(0) },
        onEnter() {}, onExit() {}, onComplete() {},   // optional hooks
        countsAs: [12, 21],               // also counts as being in these challenges
    },
}
```

| Feature | Label | Meaning |
|---|---|---|
| `name` | *(no label)* | String or function. |
| `challengeDescription` | *(no label)* | What makes it hard. Implement handicaps (usually gated by `inChallenge`). |
| `goalDescription` | *(no label)* | The win condition text. |
| `canComplete()` | *(no label)* | Bool: is the win condition met right now? Returning a **number** bulk-completes that many times. |
| `rewardDescription` | *(no label)* | What you get. Implement it elsewhere. |
| `rewardEffect()` / `rewardDisplay()` | optional | Compute/show the reward. |
| `fullDisplay()` | **OVERRIDE** | Full custom challenge text. |
| `unlocked()` | optional | Visibility. |
| `onComplete()` / `onEnter()` / `onExit()` | optional | Lifecycle hooks. |
| `countsAs` | optional | Array of challenge ids this one includes the effects of. |
| `completionLimit` | optional | Max completions (default 1). Auto-stars the challenge at max. |
| `style`, `marked` | optional | Shared conventions. |
| `goal` + currency fields | **deprecated** | Old goal system — always use `canComplete()` in new games. |

## 5. Buyables — rebuyable upgrades with scaling costs

Helpers: `getBuyableAmount(layer, id)` · `setBuyableAmount(layer, id, amt)` · `addBuyables(layer, id, amt)` · `buyableEffect(layer, id)`. **Amounts are Decimals.**

```js
buyables: {
    respec() {                                   // on the buyables OBJECT (not a buyable): respec button
        player[this.layer].points = player[this.layer].points.add(player[this.layer].spentOnBuyables)
        doReset(this.layer, true)                // respec implies a forced layer reset
    },
    respecText: "Respec Thingies",
    respecMessage: "Are you sure?",
    11: {
        title: "Exhancers",
        cost(x) {                                // x = Decimal amount owned
            if (x.gte(25)) x = x.pow(2).div(25)  // cost-softcap
            return Decimal.pow(2, x.pow(1.5)).floor()
        },
        effect(x) {
            return { first: Decimal.pow(25, x.pow(1.1)), second: x.pow(0.8) }
        },
        display() {                              // everything under the title
            let data = tmp[this.layer].buyables[this.id]
            return "Cost: " + format(data.cost) + " lollipops<br>"
                 + "Adds +" + format(data.effect.first) + " things"
        },
        canAfford() { return player[this.layer].points.gte(tmp[this.layer].buyables[this.id].cost) },
        buy() {
            let cost = tmp[this.layer].buyables[this.id].cost
            player[this.layer].points = player[this.layer].points.sub(cost)
            player[this.layer].buyables[this.id] = player[this.layer].buyables[this.id].add(1)
            player[this.layer].spentOnBuyables = player[this.layer].spentOnBuyables.add(cost)
        },
        purchaseLimit: new Decimal(4),           // optional, default Infinity
        sellOne() { /* refund one */ },          // optional: adds Sell One button
        buyMax() { /* optional: bulk buy */ },
    },
}
```

| Feature | Label | Meaning |
|---|---|---|
| `title` | optional | Header text. |
| `cost(x)` | *(no label)* | Cost of the next purchase (x = current amount as Decimal). May return an object for multiple currencies. |
| `effect(x)` | optional | Bonus of owning x. |
| `display()` | *(no label)* | All body text (cost/amount/effect). |
| `canAfford()` | *(no label)* | Can the player buy right now? |
| `buy()` | *(no label)* | Spend currency + increment amount (you implement it). |
| `buyMax()` | optional | Buy as many as possible. |
| `unlocked()`, `style`, `tooltip`, `marked`, `branches` | optional | Shared conventions. |
| `purchaseLimit` | optional | Max purchases (Decimal; default Infinity). |
| `sellOne()` / `sellAll()` (+ `canSellOne()` / `canSellAll()`) | optional | Render Sell One / Sell All buttons beneath the buyable. |
| `respec()` / `respecText` / `showRespec()` / `respecMessage` | optional | **On the buyables object**, not individual buyables: adds a respec button. `player[layer].spentOnBuyables` is engine-tracked spending you can refund. |

## 6. Clickables — general-purpose buttons

Helpers: `getClickableState(layer, id)` · `setClickableState(layer, id, state)` · `clickableEffect(layer, id)`.

⚠ **Design rule from the docs: do not make "click repeatedly for bonus" buttons — they are bad design.** Clickables are for state machines, one-off interactions, buy/sell panels, etc. State is a **number or string** (not Decimal/array/object). Default size is smaller than buyables.

```js
clickables: {
    masterButtonPress() { /* e.g. fix a borkened state */ },   // on the clickables object: button above all
    masterButtonText() { return "Fix the clickable!" },
    11: {
        title: "Clicky clicky!",
        display() { return "Current state:<br>" + getClickableState(this.layer, this.id) },
        canClick() { return getClickableState(this.layer, this.id) !== "Borkened..." },
        onClick() {
            switch (getClickableState(this.layer, this.id)) {
                case "Start": player[this.layer].clickables[this.id] = "A new state!"; break
                default: player[this.layer].clickables[this.id] = "Start"; break
            }
        },
        onHold() { /* called 20x/sec while held (after 0.25s) — e.g. for buy loops */ },
        style() { return getClickableState(this.layer, this.id) === "Start"
            ? {'background-color': 'green'} : {} },
    },
}
```

| Feature | Label | Meaning |
|---|---|---|
| `title`, `effect()`, `display()`, `unlocked()`, `style`, `tooltip`, `marked`, `branches` | as elsewhere | Shared conventions. |
| `canClick()` | *(no label)* | Bool: clickable right now? |
| `onClick()` | *(no label)* | Click handler. |
| `onHold()` | optional | Called 20×/sec while held ≥ 0.25 s. |
| `masterButtonPress()` / `masterButtonText` / `showMasterButton()` | optional | On the clickables object: a button above all clickables (respec-style). |

## 7. Bars — progress/gauge displays

```js
bars: {
    longBoi: {
        direction: RIGHT,                 // constant, NOT a string
        width: 300, height: 30,           // plain numbers (px)
        progress() { return player.points.add(1).log(10).div(10).toNumber() },  // 0..1
        display() { return format(player.points) + " / 1e10 points" },
        fillStyle: {'background-color': "#FFFFFF"},
        baseStyle: {'background-color': "#696969"},
        textStyle: {'color': '#04e050'},
        borderStyle() { return {} },
        instant: false,                   // true = snap, no animation
        unlocked() { return true },
    },
}
```

| Feature | Label | Meaning |
|---|---|---|
| `direction` | *(no label)* | `UP` / `DOWN` / `LEFT` / `RIGHT` **constants** (not strings). |
| `width`, `height` | *(no label)* | Pixel dimensions as numbers (no "px"). |
| `progress()` | *(no label)* | Fill fraction, 0 = empty to 1 = full. Out-of-bounds is safe; number or Decimal. |
| `display()` | optional | Text on the bar (HTML). |
| `baseStyle`, `fillStyle`, `borderStyle`, `textStyle` | optional | CSS objects for the unfilled/filled/border/text parts. |
| `instant` | very optional | Skip animation. |
| `unlocked()` | optional | Visibility. |

## 8. Grids — many same-behavior tiles with individual data

Helpers: `getGridData(layer, id)` · `setGridData(layer, id, data)` · `gridEffect(layer, id)`.

**Three crucial rules:**
1. Grid ids are **base-100**: `101, 102, 103…` per row (so >10 tiles fit in a row) — `101 102` / `201 202`.
2. There is **one `grid` object per layer**; all properties live on it and every function receives `(data, id)`.
3. Need two unrelated grids in one layer? Use the `layer-proxy` component ([05](05-UI-Layouts-and-Visuals.md)).

```js
grid: {
    rows: 2, cols: 2,                 // if dynamic, you MUST also set maxRows/maxCols (static!)
    maxRows: 3, maxCols: 3,
    getStartData(id) { return 0 },    // initial data per tile
    getUnlocked(id) { return true },  // default true
    getCanClick(data, id) { return true },  // default true
    getTitle(data, id) { return "Tile #" + id },
    getDisplay(data, id) { return data },
    getStyle(data, id) { return {'background-color': '#0f0'} },
    onClick(data, id) { player[this.layer].grid[id]++ },
    onHold(data, id) {},              // 20x/sec while held
    getEffect(data, id) { return data },
    getTooltip(data, id) { return "" },
}
```

All functions are optional except `getStartData`, `rows`/`cols`, and `onClick` for interactive grids. Tile data is saved in `player[layer].grid` keyed by id.

## 9. Infoboxes — collapsible text boxes

Good for lore/story and explanations. In the default tab layout the first infobox appears at the very top.

```js
infoboxes: {
    lore: {
        title: "Lore",
        body() { return "DEEP LORE! Now: " + format(player.points) + " points." },
        titleStyle: {'color': '#FE0000'},
        bodyStyle: {'background-color': "#0000EE"},
        unlocked() { return true },
    },
}
```

| Feature | Label | Meaning |
|---|---|---|
| `title` | *(no label)* | Header text (string or function, HTML). |
| `body` | *(no label)* | Box text (string or function, HTML). |
| `style`, `titleStyle`, `bodyStyle`, `unlocked()` | optional | Shared conventions. |
