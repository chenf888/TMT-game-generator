# 05 — UI Layouts, Trees, and Visuals

## 1. `tabFormat` — custom tab layouts

By default a layer's tab renders in the standard order (main display → prestige button → milestones → buyables → …). `tabFormat` on the layer replaces that with your own component list. It doubles as the **subtab** definition (§2).

### Array form

Each entry is a component **name string**, or `[name, data, cssStyle?]`:

```js
tabFormat: [
    "main-display",
    ["prestige-button"],
    "blank",
    ["display-text",
        function() { return 'I have ' + format(player.points) + ' pointy points!' },
        {"color": "red", "font-size": "32px", "font-family": "Comic Sans MS"}],
    "blank",
    ["toggle", ["c", "beep"]],
    "milestones",
    "blank",
    "blank",
    "upgrades",
]
```

### Component catalog

**Layout primitives**

| Component | Argument | Effect |
|---|---|---|
| `display-text` | string or function | Text (basic HTML). |
| `display-image` | URL | Image. |
| `raw-html` | string or function | Raw HTML block. |
| `h-line`, `v-line` | — / height | Horizontal / vertical divider. |
| `blank` | height or [width, height] | Empty space. Default 8×17 px. `"5px"` = height; `["30px", "10px"]` = width, height. |
| `row` | array of components | Lays out children horizontally. |
| `column` | array of components | Lays out children vertically (use inside rows). |

**Layer widgets**

| Component | Argument | Effect |
|---|---|---|
| `main-display` | precision (number) | The layer's currency + effect text. Precision lets it show decimals. |
| `resource-display` | — | The base currency amount + best/total (if defined in `startData`). |
| `prestige-button` | — | The layer's reset button. |
| `text-input` | variable name | Binds `player[layer][arg]`; works with strings, numbers, Decimals. |
| `slider` | [name, min, max] | Binds `player[layer][arg]`; **no Decimals**. |
| `drop-down` | [name, options[]] | Binds `player[layer][arg]` to a string choice. |
| `toggle` | [layer, variableName] | Boolean toggle bound into player data; color follows the layer. |
| `upgrades` / `milestones` / `challenges` / `achievements` / `buyables` / `clickables` | optional: rows to include | Render that feature's full grid. |
| `microtabs` | family name | Renders a microtabs set defined in the layer's `microtabs` feature. |
| `bar` | bar id | One bar. |
| `infobox` | infobox id | One infobox. |
| `grid` | optional rows | The layer's grid (one per layer; use layer-proxy for more). |
| `tree` | array of arrays of node ids | Renders a tree diagram (see §3). |
| `upgrade-tree` / `buyable-tree` / `clickable-tree` | array of arrays of ids | A tree of that feature with branch lines. One component type per tree. |
| `layer-proxy` | [layerId, tabFormat] | Render another layer's components inside this tab. **No microtabs inside a layer proxy.** |

**Sub-components** (for fine-grained control, e.g. splitting features across subtabs): `upgrade`, `milestone`, `challenge`, `buyable`, `clickable`, `achievement`, `gridable` (arg = id) · `respec-button`, `master-button` · `sell-one`, `sell-all` (arg = buyable id).

Custom components can be added in `js/components.js` (engine file — only if you must).

## 2. Subtabs and microtabs

### Subtabs — object form of `tabFormat`

```js
tabFormat: {
    "Main tab": {
        content: ["main-display", "prestige-button", "resource-display", "milestones"],
        shouldNotify: true,
        glowColor: "blue",
        buttonStyle() { return {'color': 'orange'} },
    },
    "Buyables": { content: ["buyables", "blank", ["display-image", "discord.png"]] },
    "Secret": {
        unlocked() { return hasUpgrade("c", 13) },   // NOTE: no `this` allowed here
        content: [...],
    },
}
```

### Microtabs — nested tab areas (a layer feature)

```js
microtabs: {
    stuff: {
        first: {
            content: ["upgrades", ["display-text", function() { return "confirmed<br>" + player.c.drop }],
                      ["drop-down", ["drop", ["drip", "drop"]]]],
        },
        second: { embedLayer: "f" },   // displays the ENTIRE layer "f" inside this microtab
    },
    otherStuff: {},                    // could hold more tab sets
},
// then in tabFormat: ["microtabs", "stuff", {'width': '600px'}]
```

### Subtab features (both subtabs and microtab subtabs)

| Feature | Label | Meaning |
|---|---|---|
| `content` | *(no label)* | The tab layout array (or overridden by embedLayer). |
| `style` | optional | CSS for the whole subtab when active. |
| `buttonStyle` | optional | CSS for the subtab's button. |
| `unlocked()` | optional | Visibility of the button. **Cannot use `this`.** |
| `shouldNotify()` / `prestigeNotify()` | optional | Highlight the tab button. |
| `glowColor` | optional | Glow color; propagates to the node. |
| `embedLayer` | **SIGNIFICANT** | Layer id: overrides `content`/`style`/`shouldNotify`, embedding the whole layer here. |

**Shortcut:** `addLayer(id, data, tabLayers)` accepts an optional **third argument** — an array of layer ids. It auto-generates a subtab per layer with `embedLayer`, colored buttons from each layer's node style, and visibility following each layer's `layerShown`. Use it for "hub" layers that display other layers.

## 3. Trees and tree customization (`js/tree.js`)

### `layoutInfo`

```js
var layoutInfo = {
    startTab: "p",            // default right-side tab
    startNavTab: "tree-tab",  // default left-side nav tab
    showTree: true,           // false = the other tab fills the whole page
    treeLayout: ""            // optional override: array of arrays of node ids
}
```

### Custom tree layouts

Set `treeLayout` to an array of arrays (rows → nodes). `"blank"` strings and ghost nodes act as spacers:

```js
treeLayout: [
    ["p"],
    ["left", "blank", "right", "blank"],
    ["a", "b", "blank", "c", "weirdButton"],
]
```

The standard tree (`TREE_LAYERS`, computed from layer rows/positions) is used when `treeLayout` is empty.

### Non-layer nodes

`addNode(id, {...})` creates tree-only nodes (buttons, spacers) — full feature list in [03 §9](03-Layers-Complete-API.md): `color`, `symbol`, `canClick()`, `onClick()`, `layerShown()` (bool or `"ghost"`), `branches` (with per-branch color/width), `nodeStyle`, `tooltip()/tooltipLocked()`, `row`, `position`.

### Replacing the tree entirely

Edit the `"tree-tab"` layer at the bottom of `tree.js` like any layer's tab (it currently just renders `["tree", ...]` with `leftTab: true`). You can switch left nav tabs programmatically with `showNavTab(layer)`.

### The `tree` component inside layers

`["tree", treeArray]` renders any tree layout inside any tab (e.g. a mini-map of nearby layers).

## 4. Particle system

Free-floating visual/interactive elements (floating text, golden-cookie-style collectibles). All properties optional; values may be constants or functions (called per particle with an `id` argument). Distances in px, angles in degrees (0 = up, clockwise).

```js
const coolParticle = {
    image: "options_wheel.png",   // "" = no image; default: generic particle
    spread: 20,                   // degrees between multiple particles
    gravity: 2,                   // downward acceleration
    time: 3,                      // lifetime, seconds (default 3)
    fadeOutTime: 1, fadeInTime: 0,
    rotation(id) { return 20 * (id - 1.5) + (Math.random() - 0.5) * 10 },
    dir() { return (Math.random() - 0.5) * 10 },
    speed() { return (Math.random() + 1.2) * 8 },
    width: 35, height: 35, color: "", text: "", style: {},
    x: undefined, y: undefined,   // default: mouse position
    offset: 10,
    layer: 'f',                   // particle is erased when leaving this tab
    onClick() {}, onMouseOver() {}, onMouseLeave() {},
    update() { /* per-tick; mutate properties; Vue.delete(particles, this.id) to self-destruct */ },
}
```

**API:** `makeParticles(particle, amount)` spawns moving particles; `makeShinies(particle, amount)` spawns stationary ones at random locations. Utilities: `setDir(particle, dir)`, `setSpeed(particle, speed)`, `clearParticles(checkFn?)`, globals `mouseX`/`mouseY`, degree-based trig `sin/cos/tan/asin/acos/atan`.

Trigger from anywhere, e.g. `makeParticles(textParticle, 4)` inside a click handler (the demo wires it to a `raw-html` button's onclick).

## 5. CSS customization

- **Global:** edit the files in `css/` (`general-style`, `components`, `bars`, `tree-node`, `other-tabs`, `popup`, `misc`, `system-style`).
- **Per-layer/per-component classes:** every rendered component automatically gets CSS classes for its **layer id** and feature type. Target layer `p`'s achievements with `.p.achievement`, locked challenges in layer `c` with `.c.locked`, etc. This is the cleanest way to give one layer a unique look without touching others.
- **Per-object styles:** the `style`/`nodeStyle`/`componentStyles` features (see [03](03-Layers-Complete-API.md)) handle most one-off styling inline.
- **Themes:** the engine ships themes (`default`, `aqua`) in `js/utils/themes.js`; colors given as theme numbers (1–3) in branches adapt to them.

## 6. Endgame screen and background

- `winText` (mod.js) appears on the endgame screen once `isEndgame()` is true; the player may keep going.
- `backgroundStyle` (mod.js) — CSS object or function for the full-page background. Combine with per-layer `style` for a themed look.
