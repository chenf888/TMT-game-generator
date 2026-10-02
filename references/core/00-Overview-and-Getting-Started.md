# 00 — Overview and Getting Started

## What is The Modding Tree?

The Modding Tree (TMT) is a **client-side framework for incremental/idle games**, written in plain HTML/JavaScript with **Vue 2** (v2.7.16, loaded from CDN). It descends from The Prestige Tree.

Key characteristics that shape how you write games with it:

- **No build system.** No npm, no bundler, no package.json. A game is a folder of static files served by any static file server (or often opened directly as `file://`). Testing = edit code → reload the page.
- **Declarative modding.** A game is defined by calling `addLayer(layerId, layerDataObject)` with a large plain object whose properties are either constants or functions. The engine reads these objects and renders/animates everything.
- **Big-number math everywhere.** All game values use `Decimal` objects from the bundled [break_eternity.js](https://github.com/Patashu/break_eternity.js) library (up to ~10^^1e308). You **cannot** use native JS arithmetic operators on them (see [01](01-Core-Rules-and-Decimal.md)).
- **Modder-facing surface is tiny.** A modder edits `js/mod.js` plus any files listed in `modInfo.modFiles` (layer definitions, tree layout). Everything else in `js/` is engine and should not be modified.

## Anatomy of a TMT game (template file layout)

```
game-folder/
├── index.html            The game page. Loads Vue + engine scripts + js/mod.js. <body onload="load()">
├── demo.html             Same page but loads the official feature demo instead (good for studying idioms)
├── changelog.md          Engine changelog (repo metadata; not shown in-game)
├── css/                  8 stylesheets (system-style, bars, components, general-style, misc,
│                         other-tabs, popup, tree-node). Moddable for visual identity.
├── resources/            Generic particle sprite (genericParticle.png)
└── js/
    ├── mod.js            ★ MODDER FILE #1 — modInfo, VERSION, point gen, endgame, save hooks
    ├── layers.js         ★ MODDER FILE #2 — layer definitions (blank template has one minimal layer "p")
    ├── tree.js           ★ MODDER FILE #3 — tree layout config (layoutInfo, custom nodes)
    ├── technical/        ENGINE: break_eternity.js (Decimal), layerSupport.js (addLayer/addNode,
    │                     layer registry, row sorting), loader.js (injects modFiles), temp.js (tmp),
    │                     displays.js (default texts), systemComponents.js, canvas.js, particleSystem.js
    ├── utils.js          ENGINE: purchase/click/respec logic, popup helpers, run(), showTab()
    ├── utils/            easyAccess.js (helper functions), NumberFormating.js (format()),
    │                     save.js (localStorage saves), options.js, themes.js
    ├── components.js     ENGINE: all user-facing Vue components (upgrade/milestone/... renderers)
    └── Demo/             The official demo mod (c.js kitchen-sink layer, f.js static layer,
                          a.js side achievements layer, demoMod.js, demoTree.js)
```

**A generated game = the template with `js/mod.js`, `js/layers.js` (or additional layer files), and `js/tree.js` rewritten** — plus optional css/images. Never edit engine files (`js/technical/*`, `js/components.js`, `js/utils*`, `js/game.js`).

## Script load order (fixed in index.html)

Vue 2.7.16 (CDN) → `js/technical/break_eternity.js` → `js/technical/layerSupport.js` → **`js/mod.js`** → `js/technical/loader.js` (injects every file in `modInfo.modFiles` as a `<script>` tag) → `temp.js` → `displays.js` → `game.js` → `utils.js` → `easyAccess.js` → `systemComponents.js` → `components.js` → `canvas.js` → `particleSystem.js` → `NumberFormating.js` → `options.js` → `save.js` → `themes.js`.

Consequences:

- `mod.js` and every `modFiles` entry run **before** the rest of the engine, so at file top level you may only define data/functions — you cannot read `tmp` or `player` there.
- Adding a new layer file requires adding its path to `modInfo.modFiles` (paths are **relative to `js/`**), or it will never load.

## Runtime model

- **Game loop:** a 50 ms `setInterval` in `js/game.js`. Each tick computes `diff` (seconds since last tick, multiplied by `devSpeed` if set), refreshes `tmp`, applies `getPointGen() × diff` to `player.points`, then per layer: `passiveGeneration`, `update(diff)`, then (from highest row down) `autoPrestige`/`automate()`/`autoUpgrade`, then milestone/achievement checks.
- **Saves:** `player` is serialized to `localStorage` (base64 JSON), keyed by the mod id (`modInfo.id`, falling back to `name-author`). Autosave runs periodically (options toggle) and on page close. `VERSION.num` triggers save migration via `fixOldSave(oldVersion)`.
- **Offline time:** time away is accumulated in `player.offTime`, capped at `modInfo.offlineLimit` hours, and only produces progress if the player has offline production enabled in options. Do not balance around unlimited offline time.
- **Reset behavior (crucial mental model):** when a layer prestiged ("reset"), all layers in **lower rows** are reset automatically, layers defining `doReset` handle themselves, and main `points` go to 0 (row 0 resets) or `getStartPoints()` (higher rows). Side layers (`row: "side"`) are never auto-reset. See [03](03-Layers-Complete-API.md) for exact semantics.

## How content is defined: the dynamic-value pattern

Almost **any** property in a layer/component object can be either:

- a **constant value**: `cost: new Decimal(100)`, `color: "#4BDC13"`, or
- a **function returning the value**: `cost() { return player.points.add(100) }`.

Functions are re-evaluated every tick and cached in the `tmp` structure (see [01](01-Core-Rules-and-Decimal.md)). This applies to display strings, styles, costs, requirements, unlock conditions, etc. Functions defined inside components are called with `this` bound to the component, so `this.layer` and `this.id` work inside them.

Display text (descriptions, tooltips, infobox bodies…) supports **basic HTML** (`<b>`, `<br>`, `<h3>`, `<span style>`…), but **not** most Vue template features (no `v-if`, no `{{ }}`, no components in strings).

## Documentation label key

The original TMT docs (and this handbook) label every feature:

| Label | Meaning |
|---|---|
| *(no label)* | **Required.** The game may crash without it. |
| **sometimes required** | Required depending on other settings (e.g. `base` for static layers). |
| **optional** | Safe to omit. |
| **assigned automagically** | Set by the engine; your value is overridden. (`layer`, `id` on every feature.) |
| **OVERRIDE** | Replaces a whole subsystem — use only when you know what you replace. |
| **deprecated** | Still works, but a newer feature does it better. Avoid in new games. |

## Creating and running a game

1. **Copy the template** (the whole `The-Modding-Tree` folder). This folder *is* your game.
2. **Edit `js/mod.js`:** set `modInfo.name`, **`modInfo.id`** (unique string — determines the savefile; set it once and never change it), `author`, `pointsName`, and keep `modFiles` listing every layer file you write.
3. **Define layers** with `addLayer("id", {...})` in files listed in `modFiles` (start from the minimal layer in `js/layers.js`).
4. **Run it:** serve the folder with any static file server and open `index.html` in a browser. (Opening the file directly also works in most browsers; a local server is the reliable path.) Reload the page after every change to test.
5. **Demo:** open `demo.html` to see every engine feature in action (`js/Demo/`).

During testing, disable offline progress in the in-game options tab and don't leave the page running — otherwise offline time will hide balance problems (huge fake timewalls).
