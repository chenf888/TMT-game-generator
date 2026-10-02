// fixture-bad layers — see the defect tags in js/mod.js.
addLayer("a", {
    name: "prestige",
    symbol: "A",
    position: 0,
    startData() { return { points: new Decimal(0) } },  // [D-STARTDATA] no unlocked
    color: "#4BDC13",
    resource: "prestige points",
    row: 0,
    // [D-PRESTIGE] no baseResource on a normal layer
    baseAmount() { return player.points },
    requires: new Decimal(100000),
    type: "normal",
    exponent: 0.5,
    gainMult() { return new Decimal(1) },
    layerShown() { return true },
    hotkeys: [
        { key: "a", description: "A: Reset for prestige points", onPress() { if (canReset(this.layer)) doReset(this.layer) } },
    ],
})

addLayer("c", {
    name: "late",
    symbol: "C",
    position: 0,
    startData() { return { unlocked: false, points: new Decimal(0) } },
    color: "#FF4BDC",
    resource: "late points",
    row: 2,                              // [D-ROWMISSING] row 1 skipped
    baseResource: "prestige points",
    baseAmount() { return player.a.points },
    requires: new Decimal(50),           // [D-REQLADDER] 50 < 100000 (A1 backwards)
    type: "normal",
    exponent: 0.5,
    branches: ["zzz"],                   // [D-BRANCH] target layer does not exist
    tabFormat: ["main-display", ["upgrades"]], // [C-CONTENT1ELEM] 1-element array renders NOTHING
    gainMult() { return new Decimal(1) },
    gainMult() { return new Decimal(2) }, // [D-DUPKEY] gainMult defined twice
    layerShown() { return true },
    milestones: {
        0: {
            requirementDescription: "500 late points",
            effectDescription: "Automates late-point upgrades (autoUpgrade).",
            done() { return player[this.layer].best.gte(500) },
        },
        1: {
            requirementDescription: "5000 late points",
            effectDescription: "Also grants autoUpgrade for this layer.",
            unlocked() { return hasMilestone(this.layer, 0) },
            done() { return player[this.layer].best.gte(5000) },
        },
    },                                   // [D-AUTOCOLLIDE] two milestones both claim autoUpgrade
    update(diff) {
        player.c.milestones.push(0)      // [D-PUSHGUARD] no !hasMilestone guard
        let r = player.c.points.mod(2)   // [C-MOD] Decimal has no .mod
        player.c.points = player.c.points.sub(r)
    },
    upgrades: {
        11: {
            title: "Raw cost",
            description: "Bought with a raw number cost.",
            cost: 100,                   // [C-RAWNUM-2] raw number
        },
    },
})

// [D-MICROTABS][FAIL] 20 content items (16 upgrades + 4 milestones), no tabFormat/microtabs.
// [D-EFFECTMONO] 12/16 upgrades are flat or externally-wired (only 4 are K7 unlocks).
addLayer("m", {
    name: "heavy",
    symbol: "M",
    position: 1,
    startData() { return { unlocked: false, points: new Decimal(0) } },
    color: "#4BFFDC",
    resource: "heavy points",
    row: 2,
    baseResource: "prestige points",
    baseAmount() { return player.a.points },
    requires: new Decimal(5000),
    type: "normal",
    exponent: 0.5,
    branches: ["a"],
    gainMult() { return new Decimal(1) },
    gainExp() { return new Decimal(1) },
    layerShown() { return true },
    milestones: {
        0: {
            requirementDescription: "10 heavy points",
            effectDescription: "Double heavy point gain.",
            done() { return player[this.layer].best.gte(10) },
        },
        1: {
            requirementDescription: "100 heavy points",
            effectDescription: "Triple heavy point gain.",
            done() { return player[this.layer].best.gte(100) },
        },
        2: {
            requirementDescription: "1000 heavy points",
            effectDescription: "Quadruple heavy point gain.",
            done() { return player[this.layer].best.gte(1000) },
        },
        3: {
            requirementDescription: "10000 heavy points",
            effectDescription: "Quintuple heavy point gain.",
            done() { return player[this.layer].best.gte(10000) },
        },
    },
    upgrades: {
        11: { title: "x2", description: "Double heavy point gain.", cost: new Decimal(1) },
        12: { title: "x3", description: "Triple heavy point gain.", cost: new Decimal(10) },
        13: { title: "x4", description: "Quadruple heavy point gain.", cost: new Decimal(100) },
        14: { title: "x5", description: "Quintuple heavy point gain.", cost: new Decimal(1000) },
        15: { title: "x6", description: "Sextuple heavy point gain.", cost: new Decimal(1e4) },
        21: { title: "x7", description: "Septuple heavy point gain.", cost: new Decimal(1e5) },
        22: { title: "x8", description: "Octuple heavy point gain.", cost: new Decimal(1e6) },
        23: { title: "x9", description: "Nonuple heavy point gain.", cost: new Decimal(1e7) },
        24: { title: "x10", description: "Decuple heavy point gain.", cost: new Decimal(1e8) },
        25: { title: "x11", description: "Multiply heavy point gain by 11.", cost: new Decimal(1e9) },
        31: { title: "x12", description: "Multiply heavy point gain by 12.", cost: new Decimal(1e10) },
        32: { title: "x13", description: "Multiply heavy point gain by 13.", cost: new Decimal(1e11) },
        33: { title: "Exit ticket", description: "Unlock a new layer.", cost: new Decimal(1e12) },
        34: { title: "Door 2", description: "Unlock a new buyable.", cost: new Decimal(1e13) },
        35: { title: "Door 3", description: "Unlock a new challenge.", cost: new Decimal(1e14) },
        41: { title: "Door 4", description: "Unlock a new subtab.", cost: new Decimal(1e15) },
    },
})

// [D-EFFECTMONO] 8/8 upgrades are inline constant multipliers (K1 monotony).
addLayer("n", {
    name: "flat",
    symbol: "N",
    position: 2,
    startData() { return { unlocked: false, points: new Decimal(0) } },
    color: "#DC4BFF",
    resource: "flat points",
    row: 2,
    baseResource: "prestige points",
    baseAmount() { return player.a.points },
    requires: new Decimal(5000),
    type: "normal",
    exponent: 0.5,
    gainMult() { return new Decimal(1) },
    gainExp() { return new Decimal(1) },
    layerShown() { return true },
    upgrades: {
        11: { title: "Flat 2", description: "Double flat point gain.", cost: new Decimal(1), effect() { return new Decimal(2) }, effectDisplay() { return format(this.effect()) + "x" } },
        12: { title: "Flat 3", description: "Triple flat point gain.", cost: new Decimal(10), effect() { return new Decimal(3) }, effectDisplay() { return format(this.effect()) + "x" } },
        13: { title: "Flat 4", description: "Quadruple flat point gain.", cost: new Decimal(100), effect() { return new Decimal(4) }, effectDisplay() { return format(this.effect()) + "x" } },
        14: { title: "Flat 5", description: "Quintuple flat point gain.", cost: new Decimal(1e3), effect() { return new Decimal(5) }, effectDisplay() { return format(this.effect()) + "x" } },
        15: { title: "Flat 6", description: "Sextuple flat point gain.", cost: new Decimal(1e4), effect() { return new Decimal(6) }, effectDisplay() { return format(this.effect()) + "x" } },
        21: { title: "Flat 7", description: "Septuple flat point gain.", cost: new Decimal(1e5), effect() { return new Decimal(7) }, effectDisplay() { return format(this.effect()) + "x" } },
        22: { title: "Flat 8", description: "Octuple flat point gain.", cost: new Decimal(1e6), effect() { return new Decimal(8) }, effectDisplay() { return format(this.effect()) + "x" } },
        23: { title: "Flat 9", description: "Nonuple flat point gain.", cost: new Decimal(1e7), effect() { return new Decimal(9) }, effectDisplay() { return format(this.effect()) + "x" } },
    },
})
