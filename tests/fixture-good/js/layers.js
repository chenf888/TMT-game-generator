// fixture-good layers — row 0 opener (P1) + row 1 branch (P2/P3) + side achievements (P13/P11).
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
        { key: "p", description: "P: Reset for prestige points", onPress() { if (canReset(this.layer)) doReset(this.layer) } },
    ],
    update(diff) {
        // achievement backfill with idempotence guard (09 P11)
        if (hasAchievement("a", 12) && !hasUpgrade("p", 13)) player.p.upgrades.push(13)
    },
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

addLayer("b", {
    name: "boosting",
    symbol: "B",
    position: 0,
    startData() { return { unlocked: false, points: new Decimal(0) } },
    color: "#4BDCFF",
    resource: "boosts",
    row: 1,
    baseResource: "prestige points",
    baseAmount() { return player.p.points },
    requires: new Decimal(500),
    type: "normal",
    exponent: 1 / 3,
    branches: ["p"],
    gainMult() { return new Decimal(1) },
    gainExp() { return new Decimal(1) },
    layerShown() { return player.b.unlocked || player.p.points.gte(400) },
    hotkeys: [
        { key: "b", description: "B: Reset for boosts", onPress() { if (canReset(this.layer)) doReset(this.layer) } },
    ],
    upgrades: {
        11: {
            title: "Boost the boost",
            description: "Triple your point gain.",
            cost: new Decimal(1),
            effect() { return new Decimal(3) },
            effectDisplay() { return format(this.effect()) + "x" },
        },
    },
})

addLayer("a", {
    startData() { return { unlocked: true, points: new Decimal(0) } },
    color: "yellow",
    resource: "achievement power",
    row: "side",
    tooltip() { return "Achievements" },
    achievementPopups: true,
    achievements: {
        11: {
            name: "Get me!",
            done() { return player.points.gte(100) },
            tooltip: "Have 100 points.",
        },
        12: {
            name: "Backfill",
            done() { return player.p.points.gte(25) },
            tooltip: "Have 25 prestige points.<br>Reward: a free layer-p upgrade.",
        },
        13: {
            name: "Branch out",
            done() { return player.b.unlocked },
            tooltip: "Unlock the boosting layer.",
        },
    },
})
