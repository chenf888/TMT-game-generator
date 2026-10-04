// Fixture: a passive-prestige game — the type's whole point is that it has NO tick,
// NO clickables, NO bars and NO grid. Five main layers clear the >=4 floor where
// D-NOUPDATE and D-MECHQUOTA live, so this fixture is what proves the exemption works:
//
//   with .tmt-profile.json        -> D-NOUPDATE is exempt and MUST NOT appear
//   with --no-profile             -> D-NOUPDATE MUST appear (it fires on zero updates)
//
// Challenges live in the side layer, which is why D-MECHQUOTA still passes: under
// passive-prestige its quota counts challenges only, never clickables/bars/grids.

addLayer("p", {
    name: "Ore",
    symbol: "O",
    color: "#b0bec5",
    position: 0,
    row: 0,
    resource: "ore",
    baseResource: "points",
    type: "normal",
    baseAmount() { return new Decimal(10) },
    requires: new Decimal(10),
    exponent: 0.5,
    startData() { return { unlocked: true, points: new Decimal(0), best: new Decimal(0), total: new Decimal(0) } },
    canReset() { return player.p.points.gte(10) },
    gainMult() { return new Decimal(1) },
    doReset(layer) { layer.points = new Decimal(0) },
});

addLayer("q", {
    name: "Ingot",
    symbol: "I",
    color: "#90a4ae",
    position: 0,
    row: 1,
    resource: "ingots",
    baseResource: "ore",
    type: "normal",
    baseAmount() { return new Decimal(10) },
    requires: new Decimal(1000),
    exponent: 0.33,
    startData() { return { unlocked: false, points: new Decimal(0), best: new Decimal(0), total: new Decimal(0) } },
    canReset() { return player.q.points.gte(10) },
    gainMult() { return new Decimal(1) },
    doReset(layer) { layer.points = new Decimal(0) },
});

addLayer("r", {
    name: "Machine",
    symbol: "M",
    color: "#78909c",
    position: 0,
    row: 2,
    resource: "machines",
    baseResource: "ingots",
    type: "normal",
    baseAmount() { return new Decimal(10) },
    requires: new Decimal(100000),
    exponent: 0.33,
    startData() { return { unlocked: false, points: new Decimal(0), best: new Decimal(0), total: new Decimal(0) } },
    canReset() { return player.r.points.gte(10) },
    gainMult() { return new Decimal(1) },
    doReset(layer) { layer.points = new Decimal(0) },
});

addLayer("s", {
    name: "Foundry",
    symbol: "F",
    color: "#b0bec5",
    position: 0,
    row: 3,
    resource: "output",
    baseResource: "machines",
    type: "normal",
    baseAmount() { return new Decimal(10) },
    requires: new Decimal(10000000),
    exponent: 0.33,
    startData() { return { unlocked: false, points: new Decimal(0), best: new Decimal(0), total: new Decimal(0) } },
    canReset() { return player.s.points.gte(10) },
    gainMult() { return new Decimal(1) },
    doReset(layer) { layer.points = new Decimal(0) },
});

addLayer("chal", {
    name: "Contracts",
    symbol: "C",
    color: "#d7ccc8",
    row: "side",
    startData() { return { unlocked: false, points: new Decimal(0), contracts: 0 } },
    challenges: {
        1: {
            description: "Double every layer's output for this run.",
            goalDescription() { return "Reach 1e6 output" },
            canComplete() { return player.s.points.gte(1e6) },
            onEnter() { player.s.points = new Decimal(0) },
            onExit() { player.s.points = new Decimal(0) },
            rewardDescription: "a permanent ×2 to output",
            rewardEffect() { return new Decimal(2) },
        },
    },
    doReset(layer) { layer.points = new Decimal(0) },
});