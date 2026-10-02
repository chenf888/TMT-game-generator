// fixture-bad extra file — NOT listed in modInfo.modFiles on purpose.
// [M-UNREG] defines addLayer("e") but the file never loads.
// [C-EXPANTA] ExpantaNum code copied from a framework-swapped mod.
addLayer("e", {
    name: "unregistered",
    symbol: "E",
    position: 0,
    startData() { return { unlocked: false, points: new ExpantaNum(0) } },
    color: "#FFFF4B",
    resource: "phantom points",
    row: 3,
    baseResource: "late points",
    baseAmount() { return player.c.points },
    requires: new Decimal(1e5),
    type: "normal",
    exponent: 0.5,
    branches: ["c"],
    gainMult() { return new Decimal(1) },
    layerShown() { return true },
})
