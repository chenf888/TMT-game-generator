# 12 — Design Wisdom from the TMT Author

> **Audience:** the AI generating a TMT game.
>
> **Provenance.** Every rule in this chapter comes from design notes by **Acamaeda**, the
> author of The Modding Tree, published between 2020-10 and 2023-04 in the TMT Discord /
> community threads. These are the highest-authority design statements available for this
> engine — they outrank the corpus statistics in handbook 11 whenever the two disagree, and
> **§0 lists every place where this skill previously taught the opposite.**
>
> This chapter reorganises ~45 dated notes into decision rules. Each rule is marked:
> **`[auto]`** = a static check enforces it · **`[judge]`** = design judgment you must apply
> yourself · **`[plan]`** = belongs in the design brief.

---

## §0 Conflicts this handbook resolves

Integrating the author's notes required changing four things this skill used to say. Read
this table before you trust 09/10/11 on their own.

| # | This skill used to say | The author says | Now |
|---|---|---|---|
| 1 | *"Unlock upgrades MUST actually unlock — an upgrade whose text says 'Unlock X' defines `onPurchase()`"* (SKILL.md Stage 4) | *"It's usually not good to have to buy an upgrade to unlock something that you also have to pay to use after (like a buyable or prestige layer). You don't get a benefit from buying the upgrade… you don't know how much the thing it unlocks will cost"* (2022-06-26) | **Unlocking a layer you must then pay to prestige is now discouraged** — use a threshold. `onPurchase()` remains correct only for things that cost nothing afterwards (a subtab, a shop entry, a mechanic). New check `N-UNLOCKPAYGATE`. |
| 2 | Softcaps as the primary runaway defence: *"three independent places (P12)"* | *"Cost scaling is usually better than softcaps… It's easier to understand… (10x points isn't actually 10x if it's softcapped)"* (2022-07-04) | **Cost scaling first, softcap second.** This matches the corpus: only **6%** of 1,156 real layers define a softcap, while cost ladders are the dominant mechanism. 09 P12 and 11 §5 rewritten. |
| 3 | *"K4 meta-effect — raises another upgrade/buyable's exponent"* | *"Try to avoid having effects that boost an upgrade's effect. Only boost resources or named mechanics."* (2021-02-24) | **K4 narrowed** to named mechanics only. Boosting a *resource* is fine; boosting another upgrade's number is not. |
| 4 | `.pow()` effects should dominate (corpus: pow 4,830 vs times 1,652) | *"Exponents are very weak when the value that they are boosting is low. They make for bad early upgrades. (Tetration even more so!)"* (2020-10-07) | **Both true, different eras.** `pow` dominates *because* most upgrades are mid/late. Early upgrades must give a visible absolute bonus. Synthesised in 11 §4. |

---

## §1 Pacing and resets `[plan]`

1. **A major reset must speed the game up from the very first second.** The run right after
   a prestige should feel faster than the one before, immediately — not after five minutes
   of re-clicking. If new power only arrives once automation comes online, the reset felt
   like a punishment.
2. **Under 10 seconds to the first boost** (2021-05-20). Anything slower and the player has
   nothing to do. Enforced as a balance target in `assets/balance-defaults.json`
   (`firstUpgradeCost`).
3. **If a reset cycle runs longer than a minute, every single reset must pay something**
   (2020-10-07). *"Doing multiple identical runs in a row without even a small bonus is not
   fun."* Either more currency carried in, or a new purchase each time.
4. **Never hard reset the player** (2020-10-07). Not to prevent cheating, not to fix
   inflation. Use `fixOldSaves` for inflation; let people play the way they want.
5. **Balance so each new layer gets you to the point of the next one, then visibly slows
   there** (2020-10-07). The slowdown is what makes the next reset worth doing.

## §2 Costs and curves `[plan]` `[auto]`

6. **Prefer raising costs over capping gains.** (2022-07-04) Cost growth is legible: the
   player can predict it, and "10× points is actually 10×" stays true. A softcap quietly
   makes every production upgrade lie.
7. **Scales must still be useful at zero** (2020-10-07). An upgrade that scales with the
   currency you spend should give *something* before you have spent anything, otherwise
   its early value is a rounding error.
8. **An upgrade whose currency grows too fast stops being an upgrade** (2022-07-13). It
   degenerates into a compact milestone you click once. Upgrades are most interesting when
   saving up for them is a real decision.
9. **Exponents are weak on small numbers** (2020-10-07). `points.pow(0.5)` on 12 points is
   3.46 — a rounding error next to your next cost. Use `pow` on mid/late currencies, and
   flat/absolute bonuses early. Tetration is worse still at low values.
10. **A cheap "key" upgrade is good pacing, not a bug** — see 11 §3, where real games put a
    cost-7 upgrade in the middle of a 10^54490 ladder.

## §3 Upgrades: how many, and what they are for `[plan]`

11. **Don't start the game with upgrades** (2022-06-01). They are overdone and build no base
    mechanic to hang prestige on. Find a verb first — Antimatter Dimensions starts with
    *dimensions*. If the theme has a natural unit, spend the first layer on it.
12. **Keep the count down** (2022-07-03). Upgrades work as an enhancement of another
    feature or as a strategic choice — not as a wall of 200 rows.
13. **Reveal upgrades alongside new features, never one at a time** (2022-07-03). Revealing
    them serially hides information and destroys the choice.
14. **One production bonus per upgrade** (2021-02-24). Multiple bonuses only if they touch
    genuinely distinct resources (points *and* prestige points). Never three effects in one.
15. **Never boost another upgrade's effect** (2021-02-24). Boost resources or named mechanics
    instead — an upgrade whose number another upgrade raises is unreadable and fragile.
16. **Unlocking something you must then pay for is bad value** (2022-06-26). Use a threshold
    (milestone, `requires`, or a `display-text` showing when it arrives). See §0 #1.
17. **Effects should report their value before you buy them**, and check ownership when
    applying (2020-10-07) — so the player can see what they are getting.
18. **Every boost must actually help reach the next goal**, including indirectly boosting
    the currency it was paid in (2022-10-30). This is the same idea as `N-UNWIRED`.
19. **More upgrades → keep/automate them sooner.** (2021-05-20) The more there are, the
    earlier they must survive resets or be auto-bought.

## §4 Buyables `[plan]`

20. **Each buyable needs a distinct purpose** (2022-07-03), and every purchase must give a
    noticeable benefit. Antimatter Dimensions' IP and Dilation buyables are the model.
21. **Don't buy the same buyable constantly** (2022-07-03). Keep them across resets and
    automate them *before* buying becomes the bulk of your reset time.
22. **Buyables that give free other buyables muddy the impact** (2022-07-03) — the player
    can no longer tell what their purchase did.
23. **A lot of buyables makes each one meaningless** (2022-07-03).
24. **Static currencies need buy max early** (2020-10-07). Otherwise "buy another one" is
    a thousand identical clicks. Consider bulk buy if autobuyers can't keep up.
25. **Never make the player choose between production and QOL from one static pool**
    (2021-02-24) — they will simply not be able to afford the QOL for a long time. Use
    separate sources, orderable independent upgrades, or a tech tree where QOL sits on the
    path to production.

## §5 Layer and reset structure `[plan]`

26. **Automate static layers with `resetsNothing` + `autoPrestige`; normal layers with
    `passiveGeneration`** (2020-10-07). They are different problems.
27. **Consider resetting generator power on same-row resets** (2021-05-20) so boosting that
    layer's production stays worth doing.
28. **A layer you can only enter by buying an upgrade is a bad gate** (2022-06-26).
29. **Lots of milestones? Use achievements** (2021-09-09) — they are far more compact, and
    reaching back through a 30-step milestone chain is tedious.
30. **Milestones should gate on `total`/`best`, not current** (2020-10-07). Already the rule
    in 09 P4 and in `balance-defaults.json`.
31. **When a reset wipes a lot at once, the first-time bonus must improve every part of
    getting back** (2020-10-07) — especially the slowest and most click-intensive parts.
32. **Don't put milestone toggles inside a separate subtab** (2022-09-27); put them where
    they are reachable. Also avoid several tabs of buyables you must babysit at once.

## §6 Naming, display, readability `[auto]`

33. **Never show internal names to the player** (2021-02-24) — not buyable ids, not the
    prestige exponent, not upgrade ids, not `points` if you renamed it. The player has no
    idea what "2" or "0.5 exponent" means.
34. **Layer colors must keep text readable** (2023-04-17). A dark layer color makes the
    upgrade, challenge and prestige button text unreadable unless you also restyle those
    backgrounds. The engine puts your layer color behind those buttons
    (`template/js/components.js` — upgrades, challenges, prestige button, automation
    toggles). Check `N-CONTRAST`.
35. **Display the currency in the tab that spends it** (2022-07-05), so the player can see
    how close they are.
36. **Add hotkeys, and put the key in the description** (2020-10-07) — e.g.
    `"p: reset for prestige points"`. Check `N-HOTKEYDESC`.
37. **Custom CSS and per-row/column tabFormat styling are how a game gets an identity**
    (2022-06-01) — a stock-looking tree is forgettable.

## §7 Player agency `[plan]`

38. **Create real choices** (2022-06-01) — upgrades at similar prices giving *different*
    kinds of benefit, so order matters. Antimatter Dimensions' Infinity Points is the
    reference. If numbers inflate past that, it is time for a new currency.
39. **Turn automation on when it unlocks** (2022-09-27). Most players would rather have it
    running than toggle it.
40. **Don't take the game away from the player** (2020-10-07) — no forced resets, ever.

## §8 Engine gotchas `[auto]`

41. **Never use `() =>` for layer/component functions** (2020-10-07). Arrow functions have
    no own `this`, so `this.layer` / `this.id` are undefined and the engine's context is
    lost. Use `function() {}` — the engine calls these with the component as `this`.
    Check `N-ARROWTHIS`.
42. **Store long strings, tab layouts and CSS objects in variables** (2020-10-07) to keep
    the code readable and reusable.
43. **Hotkeys need the key in the description** (see #36).
44. **Do not use ExpantaNum (TMT+ / "Better Modding Tree")** (2021-05-20). It performs
    badly, is not officially supported, and buys you nothing until you exceed
    Break_Eternity's limit (1.8e308 e's). Already enforced by `C-EXPANTA`; use
    `Decimal` and `Decimal.pow`.

---

## §9 What this skill still teaches that the author did not contradict

Kept as-is, because the corpus and the notes agree:

- Layer `row` ladder, `requires` monotonicity, the `×10–×100` band (09 P1/P2, `D-REQLADDER`)
- The automation ladder order `resetsNothing → passiveGeneration → autoPrestige → autoUpgrade`
  (09 P4) — consistent with #26
- Milestones gating on `best`/`total` (#30 confirms)
- Decimal discipline, no `.mod()`, Vue2-only, `passiveGeneration()` returns a plain number
  (`references/core/01`, `07`)
- Cost ladders spanning orders of magnitude, with deliberate drops (11 §3, #10)

## §10 Static checks that now enforce this chapter

| Rule | Chapter rule | Level |
|---|---|---|
| `N-ARROWTHIS` | #41 arrows in layer/component functions | FAIL |
| `N-CONTRAST` | #34 layer color vs default theme text | WARN |
| `N-UNLOCKPAYGATE` | #28/#16 buy-to-enter a layer you then pay for | WARN |
| `N-HOTKEYDESC` | #36 hotkey description names its key | WARN |

Everything else in this chapter is `[judge]` or `[plan]` — it belongs in the design brief
and in the Stage-6 walkthrough, not in a linter.