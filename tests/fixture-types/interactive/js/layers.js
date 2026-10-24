// Fixture: an active-click game that deliberately violates each T-* rule once.
// Each defect is tagged so tests/types.test.js can assert it is caught, and that the
// rules do not over-fire on the two layers that are correct.
//
// Deliberate defects:
//   [T-CLICKABLE] deadButton — neither canClick nor onClick
//   [T-CLICKABLE] halfButton — onClick but no canClick
//   [T-GRID]      bare       — grid with neither getStartData nor rows/cols
//   [T-TICKREG]   ghost hook — passiveGeneration points at an undefined function

addLayer("c", {
    name: "Clicky Layer",
    symbol: "C",
    color: "#7c9cff",
    position: 0,
    row: 0,
    resource: "clicks",
    baseResource: "points",
    type: "normal",
    baseAmount() { return new Decimal(10) },
    requires: new Decimal(10),
    exponent: 0.5,
    startData() { return { unlocked: false, points: new Decimal(0), charge: 0, total: new Decimal(0) } },
    canReset() { return player.c.points.gte(10) },
    resetDescription() { return "start clicking again" },
    clickables: {
        deadButton: {
            // [T-CLICKABLE] no canClick, no onClick — renders, does nothing
            text: "Dead",
            style() { return { "background-color": "#555555" } },
        },
        halfButton: {
            // [T-CLICKABLE] no canClick
            text: "Half",
            onClick() { player.c.charge += 1 },
        },
        goodButton: {
            text: "Works",
            canClick() { return true },
            onClick() { player.c.charge += 1 },
        },
    },
    doReset(layer) { layer.points = new Decimal(0) },
});

addLayer("g", {
    name: "Board Layer",
    symbol: "B",
    color: "#5bd6b0",
    position: 1,
    row: 1,
    resource: "cells",
    baseResource: "clicks",
    type: "normal",
    baseAmount() { return new Decimal(10) },
    requires: new Decimal(1000),
    exponent: 0.5,
    startData() { return { unlocked: false, points: new Decimal(0), cells: {} } },
    canReset() { return player.g.points.gte(10) },
    // [T-GRID] a grid with no getStartData and no rows/cols spec
    grid: { getStyle() { return {} } },
    doReset(layer) { layer.points = new Decimal(0) },
});

addLayer("t", {
    name: "Tick Layer",
    symbol: "T",
    color: "#ffb74d",
    position: 2,
    row: 2,
    resource: "ore",
    baseResource: "cells",
    type: "normal",
    baseAmount() { return new Decimal(10) },
    requires: new Decimal(100000),
    exponent: 0.5,
    // [T-TICKREG] myPassiveGen is defined nowhere and the engine does not provide it
    passiveGeneration: myPassiveGen,
    startData() { return { unlocked: false, points: new Decimal(0) } },
    canReset() { return player.t.points.gte(10) },
    doReset(layer) { layer.points = new Decimal(0) },
});

addLayer("dl", {
    name: "Deadlock Layer",
    symbol: "D",
    color: "#c7a3ff",
    position: 3,
    row: 2,
    resource: "locks",
    type: "custom",
    // [D-CANRESETDEAD] canReset reads ONLY the layer's own state, nothing outside the
    // layer produces player.dl.points, and nothing ever writes player.dl.unlocked —
    // the engine opens a custom layer only when canReset() is true, so this layer can
    // never be opened (the Braille six/eight board deadlock).
    startData() { return { unlocked: false, points: new Decimal(0), pattern: 0 } },
    canReset() { return player.dl.pattern > 0 && player.dl.points.gte(1) },
    getResetGain() { return new Decimal(1) },
});

// [D-GRIDZERO] the board's target list is FIRST filled by a loop whose counter starts
// at 0 and is used as a mask — a fresh save's board is the empty mask, so it matches
// the first target immediately and the first board reset is free.
var BOARD_TARGETS = []
for (var t = 0; t < 8; t++) { BOARD_TARGETS.push({ label: "t" + t, mask: t }) }