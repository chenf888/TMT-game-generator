# 01 — Core Rules, Decimal API, and Helper Functions

Read this file **before writing any game code**. TMT has a small number of absolute rules; breaking any of them is the #1 cause of broken AI-generated games.

## 1. Hard coding rules

1. **All game values are `Decimal` objects** (break_eternity.js), not numbers. `player.points`, `player[layer].points`, costs, amounts, effects — all `Decimal`.
2. **Never use native JS operators on Decimals.** No `+ - * / % **` and no `< <= > >= ===`. Use the methods in §3 instead.
   ```js
   // WRONG                                // RIGHT
   x = x + y                               x = x.add(y)
   if (a > b)                              if (a.gt(b))
   x = x * 2                               x = x.times(2)
   ```
   The right-hand operand may be a plain number: `x.add(1)`, `x.times(2.5)`, `x.gt(10)` are all fine.
3. **There is no `.mod()` method** in the vendored break_eternity version. Compute modulo manually if ever needed.
4. **Values can be constants or functions.** A function value is re-evaluated every tick; use `function` shorthand syntax (`unlocked() { return ... }`) or arrow-free method syntax inside objects. Functions on components get `this` = the component (so `this.layer`, `this.id` work).
5. **Every action-function you invent inside a layer must be registered** in `doNotCallTheseFunctionsEveryTick` in `mod.js`, because TMT calls *every function anywhere in `layers`* every tick to cache results in `tmp`. Official documented functions are already exempt; custom ones (e.g. `blowUpEverything`) are not. Without registration, your "do something once" function runs 20×/second.
6. **Display text supports basic HTML only.** `<b>`, `<i>`, `<br>`, `<h1>-<h6>`, inline `style` attributes work. Vue directives (`v-if`, `{{ }}`) and most Vue features do not.
7. **Vue 2 only.** The engine runs Vue 2.7.16. Never use Vue 3 APIs.
8. **Always implement described effects.** Descriptions (`description: "Double point gain"`) are pure text. The actual bonus must be implemented where it applies (e.g. in `getPointGen()` in mod.js) — the engine does not parse descriptions.
9. **Format all displayed numbers** with `format()` / `formatWhole()` (§5), never raw Decimals (string concatenation of a Decimal shows its internal representation).

## 2. Creating Decimals

```js
new Decimal(100)          // from a number
new Decimal("1e1000")     // from a string — required for very large values (beyond ~1e308)
new Decimal("1e2500000")  // strings accept any magnitude, even "eeee1000"
Decimal.pow(10, x)        // 10^x as a Decimal
player.points             // already a Decimal — do NOT wrap in new Decimal() again
```

Special values: `Decimal.dZero`, `Decimal.dOne`, `Decimal.dTwo`, `Decimal.dTen`, `Decimal.dNegOne`, `Decimal.dNaN`, `Decimal.dInf`, `Decimal.dNegInf`. TMT also defines globals `decimalZero`, `decimalOne`, `decimalNaN` (in layerSupport.js).

Practical limit: ~`10^^1e308` (tetration height). `format()` displays beyond `1e1000000` in exponential form and beyond `"eeee1000"` in "F" notation.

## 3. Decimal API reference (extracted from the vendored break_eternity.js)

All methods below exist on every Decimal and return **new** Decimals (they never mutate the receiver — reassign: `x = x.add(1)`).

### Arithmetic
| Method | Aliases | Meaning |
|---|---|---|
| `add(x)` | `plus` | x + x |
| `sub(x)` | `minus`, `subtract` | this − x |
| `times(x)` | `mul`, `multiply` | this × x |
| `div(x)` | `divide`, `dividedBy`, `divideBy` | this ÷ x |
| `recip()` | `reciprocal`, `reciprocate` | 1 / this |
| `neg()` | `negate`, `negated` | −this |
| `abs()` | | absolute value |
| `pow(x)` | | this^x (x may be number or Decimal) |
| `pow_base(x)` | | x^this |
| `sqrt()`, `sqr()`, `cube()`, `cbrt()` | | square root, ², ³, cube root |
| `root(x)` | | x-th root of this |
| `exp()` | | e^this |
| `log(base)` | `logarithm` | log_base(this); **base defaults to 10** if omitted |
| `log10()`, `log2()`, `ln()` | | fixed-base logs |
| `factorial()` | | factorial |

### Advanced (iterates — usable but rarely needed)
`tetrate(x)`, `iteratedexp(x)`, `iteratedlog(x)`, `pentate(x)`, `slog(x)`, `layeradd(x, base)`, `ssqrt()`, `lambertw()`, `gamma()`, `lngamma()`, `pLog10()`.

### Comparison — the ONLY way to compare
| Method | Aliases | Meaning |
|---|---|---|
| `gt(x)` | `greaterThan` | this > x |
| `gte(x)` | `greaterThanOrEqualTo` | this ≥ x |
| `lt(x)` | `lessThan` | this < x |
| `lte(x)` | `lessThanOrEqualTo` | this ≤ x |
| `eq(x)` | `equals` | this == x |
| `neq(x)` | `notEquals` | this != x |
| `cmp(x)` | `compare` | −1 / 0 / 1 |
| `max(x)`, `min(x)` | | larger/smaller of the two |
| `clamp(min, max)`, `clampMin(m)`, `clampMax(m)` | | clamped value |
| `maxabs(x)`, `minabs(x)` | | by absolute value |

Each comparison also has a tolerance variant (`eq_tolerance(x, tolerance)` etc.) for float-like equality.

### Rounding & inspection
| Method | Meaning |
|---|---|
| `floor()`, `ceil()`, `round()`, `trunc()` | rounding (all return Decimals) |
| `toNumber()` | converts to a JS number (use only for small values — e.g. bar progress, CSS) |
| `toString()` | string form |
| `toStringWithDecimalPlaces(n)` | fixed-precision string |
| `toFixed(n)`, `toExponential(n)`, `toPrecision(n)` | standard formats |
| `mantissaWithDecimalPlaces(n)`, `magnitudeWithDecimalPlaces(n)` | parts of scientific form |
| `.m`, `.e`, `.s` (and `.mantissa`, `.exponent`, `.sign`) | scientific-form components |
| `.mag`, `.layer` | internal representation |
| `isNaN()`, `isFinite()` | checks |

### Static methods (called on `Decimal`, not an instance)
`Decimal.pow(base, exp)`, `Decimal.pow10(exp)`, `Decimal.add(a, b)`, `Decimal.sub`, `Decimal.times/mul`, `Decimal.div`, `Decimal.max(a, b)`, `Decimal.min(a, b)`, `Decimal.ln(a)`, `Decimal.exp(a)`, `Decimal.fromString(str)`, `Decimal.fromMantissaExponent(m, e)`, `Decimal.fromValue(x)`.

## 4. The `tmp` system

`tmp` (alias `temp`) is an engine-maintained copy of `layers` where **every function-valued property is replaced by its current result**. If layer `p`'s `baseAmount()` returns `player.points` and the player has 54 points, then `layers.p.baseAmount` is a function but `tmp.p.baseAmount` is the Decimal 54.

- Read computed values from `tmp` for performance-sensitive code: `tmp[layer].buyables[11].cost`, `tmp[layer].resetGain`, `tmp[layer].nextAt`, `tmp[layer].canReset`, etc.
- `player` holds **saved** state; `layers` holds **definitions**; `tmp` holds **current computed** values. Never write to `tmp` (except the few documented engine-managed fields like `trueGlowColor`).
- Engine-maintained tmp values you can rely on per layer: `type`, `requires`, `baseAmount`, `resetGain`, `nextAt`, `canReset`, `passiveGeneration`, `gainMult`, `gainExp`, `directMult`, `softcap`, `effect`, `layerShown`, `deactivated`, `trueGlowColor`, plus computed sub-features.

## 5. Number formatting (from NumberFormating.js)

| Function | Use |
|---|---|
| `format(decimal, precision = 2, small = false)` | The universal formatter. Commas under 1e3, fixed precision up to 1e9, exponential up to 1e9e7, "e"-notation beyond, "F" (tetration) beyond `eeee1000`. Handles negatives and small numbers. |
| `formatWhole(decimal)` | Like format but rounds to integers for medium values. |
| `formatTime(seconds)` | Human time strings: "12.5s", "3m 20s", "2h 05m 13s", days, years. |
| `formatSmall(x, precision = 2)` | format() with small numbers displayed. |
| `toPlaces(x, precision, maxAccepted)` | String with fixed decimals, capped at a max. |

## 6. Global helper functions (easyAccess.js + utils.js)

**All of these are global functions available everywhere in mod code.**

### Checking state
| Function | Returns |
|---|---|
| `hasUpgrade(layer, id)` | true if the player bought the upgrade (and layer not deactivated) |
| `hasMilestone(layer, id)` | true if the milestone was reached |
| `hasAchievement(layer, id)` | true if the achievement was earned |
| `hasChallenge(layer, id)` | true if the challenge was completed at least once |
| `inChallenge(layer, id)` | true if the player is currently in the challenge (or a challenge with `countsAs` covering it) |
| `challengeCompletions(layer, id)` | number of completions |
| `maxedChallenge(layer, id)` | true if completions reached `completionLimit` |
| `canEnterChallenge(layer, id)` / `canExitChallenge(layer, id)` | challenge gating flags (`canEnter`/`canExit` properties, default true) |

### Reading effects and amounts
| Function | Returns |
|---|---|
| `upgradeEffect(layer, id)` | current value of the upgrade's `effect()` |
| `challengeEffect(layer, id)` | current value of `rewardEffect()` |
| `buyableEffect(layer, id)` | current value of the buyable's `effect()` |
| `clickableEffect(layer, id)` | current value of the clickable's `effect()` |
| `achievementEffect(layer, id)` | current value of the achievement's `effect()` |
| `gridEffect(layer, id)` | current value of `getEffect(data, id)` for a grid tile |
| `getBuyableAmount(layer, id)` | Decimal amount owned |
| `getClickableState(layer, id)` | current state (number or string) |
| `getGridData(layer, id)` | current data of a grid tile |

### Writing state
| Function | Effect |
|---|---|
| `setBuyableAmount(layer, id, amount)` | set a buyable's amount |
| `addBuyables(layer, id, amount)` | add to a buyable's amount |
| `setClickableState(layer, id, state)` | set a clickable's state |
| `setGridData(layer, id, data)` | set a grid tile's data |

### Buying and respeccing (normally used by UI, usable in automation)
| Function | Effect |
|---|---|
| `buyUpgrade(layer, id)` / `buyUpg(layer, id)` | buys an upgrade if affordable (handles currencies, `pay()`, `onPurchase()`) |
| `canAffordUpgrade(layer, id)` | affordability check used for upgrade highlighting |
| `buyBuyable(layer, id)` | triggers a buyable's `buy()` through the normal gating |
| `buyMaxBuyable(layer, id)` | triggers `buyMax()` if defined |
| `respecBuyables(layer)` | runs the layer's buyables respec (with confirm message) — **use this**, not the demo's nonexistent `resetBuyables` |
| `canBuyBuyable(layer, id)` | unlocked + affordable + under purchaseLimit |

### Navigation and misc
`showTab(layer)`, `showNavTab(layer)` (switch the left nav tab), `goBack()` (previousTab arrow), `notifyLayer(layer)`, `prestigeNotify(layer)`, `doPopup(title, text, textColor, borderColor, glowColor)` (toast popup), `keepGoing()` (dismiss endgame screen), `toNumber(x)`, `toValue(value, oldValue)`, `run(func, target, args)` (safely call a possibly-function value with `this` = target), `layOver(obj1, obj2)`, `isPlainObject(x)`, `layerunlocked(layer)`, `nodeShown(id)`.

### Direction constants (for bars)
`UP = 0, DOWN = 1, LEFT = 2, RIGHT = 3` — **use the constants, not strings** (`direction: RIGHT`).

## 7. Common Decimal idioms in TMT games

```js
// Scaling effect with a softcap (keep growth sane):
effect() {
    let ret = player[this.layer].points.add(1).pow(0.5)
    if (ret.gte("1e20000000")) ret = ret.sqrt().times("1e10000000")
    return ret
}

// Cost curve for a buyable, with a cost-softcap after 25 purchases:
cost(x) {
    if (x.gte(25)) x = x.pow(2).div(25)
    return Decimal.pow(2, x.pow(1.5)).floor()
}

// Requirement gated by unlock order (parallel layers get harder):
requires() {
    let req = new Decimal(10)
    if (player.f.unlocked) req = req.times(100)          // or use unlockOrder
    return req
}

// Log-based progress for a bar (0..1 as a number):
progress() { return player.points.add(1).log(10).div(10).toNumber() }
```
