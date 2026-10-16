// fixture-bad defects — phase-⑨ structural rules (2026-10-17).
//
// These defects live in their own file because each one needs a whole layer (or a
// whole file set) to exist, and because injecting them into layers.js would move the
// component counts that fixture-bad's D-MICROTABS / D-EFFECTMONO / D-COSTSPAN
// regressions are calibrated against.
//
// Injected defects:
//   [N-FACTORY]       addLayer("q", shimLayerDef()) — the body is passed by reference,
//                     so row/startData/components are invisible to every structural rule
//   [N-COMPID]        layer "k" declares upgrades id 12 twice (object keys are
//                     last-wins, so the first definition is unreachable)
//   [N-SELFTOTAL]     layer "k" buyable 11: effect ×2 per purchase against cost ×2 per
//                     purchase — feedback exponent ln(2)/ln(2) = 1, it funds itself
//   [N-COMPSTYLETHIS] layer "k" reads this.id inside componentStyles, which is
//                     evaluated once per LAYER, not per component
//   [N-EFFECTHONEST]  layer "k" upgrade 13 displays ×1.5 while its effect() applies ×2
//   [N-ALLOWSMALL]    layer "k" upgrade 11 costs 1e-30 with modInfo.allowSmall unset,
//                     so format() would print that price as "0.00"
//   [N-AUTOFLAG]      layer "k" milestone 0 promises autoPrestige that no code grants
//                     (layers.js layer "c" carries the autoUpgrade form of the same defect)
//   [N-MAINSTR]       a non-English language mode is declared, but five layers still
//                     render the stock "main-display", whose chrome is hard-coded English

window.chinesemode = true;               // [N-MAINSTR]

// [N-FACTORY] — a runtime factory blinds every rule: the checker resolves a layer by
// locating the `{` after the call, and there is none in this call.
function shimLayerDef() {
    return {
        name: "shim",
        symbol: "Q",
        position: 0,
        row: 4,
        startData() { return { unlocked: true, points: new Decimal(0) } },
        color: "#4BDCFF",
        resource: "shim",
        baseResource: "wisdom shards",
        baseAmount() { return player.w.points },
        requires: new Decimal(1e7),
        type: "normal",
        exponent: 0.5,
        gainMult() { return new Decimal(1) },
        gainExp() { return new Decimal(1) },
        layerShown() { return true },
    }
}
addLayer("q", shimLayerDef())

addLayer("k", {
    name: "contract",
    symbol: "K",
    position: 1,
    startData() { return { unlocked: true, points: new Decimal(0), best: new Decimal(0) } },
    color: "#4BFFDC",
    resource: "contract points",
    row: 4,
    baseResource: "wisdom shards",
    baseAmount() { return player.w.points },
    requires: new Decimal(4e6),
    type: "normal",
    exponent: 0.5,
    gainMult() {
        let ret = new Decimal(1)
        if (hasUpgrade("k", 11)) ret = ret.times(upgradeEffect("k", 11))
        if (hasUpgrade("k", 12)) ret = ret.times(upgradeEffect("k", 12))
        if (hasUpgrade("k", 13)) ret = ret.times(upgradeEffect("k", 13))
        if (hasUpgrade("k", 14)) ret = ret.times(upgradeEffect("k", 14))
        if (getBuyableAmount("k", 11).gt(0)) ret = ret.times(buyableEffect("k", 11))
        return ret
    },
    gainExp() { return new Decimal(1) },
    layerShown() { return true },
    componentStyles: {                   // [N-COMPSTYLETHIS] `this` is a LAYER here, not a component
        upgrade() { return { "border-color": this.id === 11 ? "#4BDCFF" : "#333333" } },
    },
    buyables: {
        11: {
            title: "Amplifier",
            display() { return "Next: " + format(this.cost()) },
            cost(amount) { return new Decimal(2).pow(amount) },        // [N-SELFTOTAL] ×2 per purchase
            effect(amount) { return new Decimal(2).pow(amount) },      // [N-SELFTOTAL] ×2 per purchase
            effectDisplay() { return "×" + format(this.effect()) },
        },
    },
    milestones: {
        0: {
            requirementDescription: "10 contract points",
            effectDescription: "Automates contract-point upgrades (autoPrestige).",   // [N-AUTOFLAG]
            done() { return player[this.layer].best.gte(10) },
        },
    },
    upgrades: {
        11: { title: "Tiny price", description: "A nearly free opener.", cost: new Decimal("1e-30") },   // [N-ALLOWSMALL]
        12: { title: "Honest", description: "Doubles contract gain.", cost: new Decimal(1e3), effect() { return new Decimal(2) }, effectDisplay() { return format(this.effect()) + "x" } },
        12: { title: "Dishonest", description: "Triples contract gain.", cost: new Decimal(1e4), effect() { return new Decimal(3) }, effectDisplay() { return format(this.effect()) + "x" } },   // [N-COMPID] id 12 again
        13: { title: "Wrong readout", description: "Boosts contract gain.", cost: new Decimal(1e5), effect() { return new Decimal(2) }, effectDisplay() { return "×1.5" } },   // [N-EFFECTHONEST]
        14: { title: "Exit ticket", description: "Unlock a new layer.", cost: new Decimal(1e9), effect() { return new Decimal(4) }, effectDisplay() { return format(this.effect()) + "x" } },
    },
})
