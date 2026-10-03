// fixture-ghost layers — every layer here is well-formed EXCEPT that it uses component
// keys the TMT v2.7 engine never reads (static rule N-GHOSTFIELD).
//
// It exists as its own fixture because injecting a `challenges: {}` block into
// fixture-bad would satisfy the interactive-component floor that fixture's
// D-MECHQUOTA regression relies on.
//
// Every key below was checked against references/core/04 field tables AND the bundled
// engine source — NOT inferred from "no real game used it":
//   js/components.js:148        renders `rewardDescription`, never `reward`
//   js/technical/layerSupport.js:109-110  defaults `completionLimit` to 1
//                                        (so challenges ARE repeatable — do not flag it)
addLayer("g", {
    name: "ghostfields",
    symbol: "G",
    position: 0,
    startData() { return { unlocked: true, points: new Decimal(0), best: new Decimal(0) } },
    color: "#FF4BDC",
    resource: "ghost points",
    row: 0,
    baseResource: "points",
    baseAmount() { return player.points },
    requires: new Decimal(10),
    type: "normal",
    exponent: 0.5,
    tabFormat: ["main-display", "prestige-button", "upgrades"],
    gainExp() { return new Decimal(1) },
    layerShown() { return true },
    upgrades: {
        11: { title: "Real", description: "A properly wired upgrade.", cost: new Decimal(1), effect() { return new Decimal(2) }, effectDisplay() { return format(this.effect()) + "x" } },
    },
    // the one legitimate wiring example in this file — N-UNWIRED must NOT flag upgrade 11
    gainMult() {
        let ret = new Decimal(1)
        if (hasUpgrade("g", 11)) ret = ret.times(2)
        return ret
    },
    milestones: {
        0: {
            requirementDescription: "5 ghost points",
            effectDescription: "Nothing special.",
            persistent: true,                          // [N-GHOSTFIELD] milestones are always persistent in v2.7
            done() { return player[this.layer].best.gte(5) },
        },
    },
    challenges: {
        11: {
            name: "Ghost Trial",
            challengeDescription: "No upgrades while inside.",
            goalDescription: "Reach 100 ghost points",
            canComplete() { return player[this.layer].points.gte(100) },
            completionLimit: 3,                       // VALID — repeatable challenges are supported
            reward: "Double ghost gain",              // [N-GHOSTFIELD] engine renders rewardDescription
            repeatable: true,                         // [N-GHOSTFIELD] not a TMT field
            canBypass: true,                          // [N-GHOSTFIELD] not a TMT field
            countTowardsCompletion: true,             // [N-GHOSTFIELD] not a TMT field (use countsAs)
            unlocked() { return player[this.layer].unlocked },
        },
    },
    achievements: {
        11: {
            name: "Ghost Rookie",
            condition() { return player[this.layer].best.gte(5) },  // [N-GHOSTFIELD] must be done()
            secret: true,                                            // [N-GHOSTFIELD] TMT lists all achievements
            tooltip: "Have 5 ghost points.",
        },
    },
})