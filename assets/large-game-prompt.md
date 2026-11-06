# Large Mod-Tree Game · Generation Prompt

> **For whoever fills this in — delete this block before sending**
>
> - Purpose: fill it in, paste the whole thing to any capable coding agent, and get a **large**
>   (25+ layer) The Modding Tree game that does **not** look like TMT Game Generator's default output.
> - How it differs from `full-prompt-template.md`: that file is a specification sheet for the skill's
>   pipeline. This one is a creative brief that **breaks the default look and the default structure**,
>   and it grants explicit permission to edit the engine.
> - Fill in at least the three blanks in §11 (theme, language, don'ts). Leave the rest empty to accept
>   the defaults.
> - 25 layers cannot be produced in one pass. The prompt already requires chapter-by-chapter batches —
>   **do not push the agent to emit everything at once**.
> - If your agent has the `tmt-game-generator` skill loaded, send this as-is; §8 defines how this file
>   interacts with that skill's gates.

---

## 1. Your role

You are three people at once: an engineer willing to modify the TMT v2.7 engine, an incremental-game
systems designer, and a front-end visual designer.

There is exactly one delivery standard: **this should read as a finished small work, not a skeleton
that happens to run.** The test is a screenshot test — put it next to other mod trees and it should
not be obvious they came out of the same template.

## 2. Base and authority to change it

- Base: **The Modding Tree v2.7**. If `tmt-game-generator`'s `template/` is available, start there;
  otherwise use the upstream v2.7 source; if neither exists, build `index.html + js/ + css/` by hand
  following TMT v2.7 conventions.
- **You are explicitly authorized to modify any file in that base**, including `css/*.css`,
  `index.html`, `js/mod.js`, `js/components.js`, `js/tree.js`, `js/game.js`, `js/utils.js` and
  `js/technical/*.js`. Layout, components, render order, navigation, save structure, tick logic —
  all fair game. **Never keep something merely because "the template does it that way."**
- Authorization is not permission to break invariants. These six hold even after your edits:

| # | Invariant | How to verify |
|---|---|---|
| 1 | Save round-trip: after `save()` → reload → `load()` no state is lost or crossed | Save twice, load twice, compare the key values |
| 2 | Decimal discipline: currencies and production are all `Decimal`, never mixed with `number`; display always goes through `format()` | Search the project for arithmetic outside `new Decimal` |
| 3 | Reset discipline: `doReset` never writes `player.points`; `layerDataReset` clears only what it should, and every new field is registered | After each prestige, check the resources that must survive |
| 4 | Per-tick idempotence: `gameLoop(diff)` and `layers[x].update(diff)` never double-count, never mutate state during render | 1000 ticks in one go must equal 1 tick × 1000 |
| 5 | Numeric safety: guard division, roots and logs against 0 and NaN; no softcap returns `NaN`/`Infinity` at extremes | Run once with a currency forced to `1e1000` and once at `0` |
| 6 | Zero console errors: including Vue warnings, unhandled promises and 404s | Open DevTools and play the whole loop |

- Register every engine file you touch: **file → what changed → why it had to change → how you
  verified it.** An unregistered engine edit counts as a defect.

## 3. Scale and layers (hard floors, not suggestions)

| Dimension | Floor | Notes |
|---|---|---|
| Main layers | **≥25** | Excluding system pages such as `tree-tab` / `info-tab` / `options-tab` |
| Visible rows | **≥10** | Vertical depth has to carry the sense of "large" |
| Chapters | **5–10** | Each chapter is a structural advance, not a bigger number |
| Signature mechanic per chapter | **≥1** | Something only that chapter has; if you cannot name it, merge the chapter |
| Upgrades | **≥5×5** per layer, 10×5 allowed on large layers | Empty grids do not count; each upgrade must be a real decision |
| Milestones | **≥200** across the tree | They carry automation and stage feedback |
| Challenge sets | **2–4** | Goals must rise with completion count; "enter and instantly finish" is forbidden |
| Buyable families | One per layer (11/12/13 or 21/22 addressing) | At least one family must feed another layer |
| Automation ladder | **≥6 steps**, of which **≥2** are cross-layer autoBuyables | The late game must be delegable |
| Softcaps | **≥3 layers** (segmented + exponential + hard ceiling) | State the trigger point and the feel of each |
| Hub region | **≥1** hub-and-spoke | One unlock chain that opens a new subsystem per chapter |
| Endgame | One explicit `isEndgame()` | The target lives in code, not in "roughly there" |

**Every layer needs at least one thing only that layer has** — a mechanic, a resource, an interaction
or a page structure. If removing a layer changes nothing the player can notice, merge it into a
neighbour. Layer count is a means, not an achievement.

## 4. Theme = structure, not a skin

Before writing code, produce a three-line mapping and make every later layer obey it:

1. **Currency chain** — in accumulation order (e.g. `observation time → spectral value → magnitude → galactic mass`)
2. **Topology** — who resets whom, whether there is a hub, whether there are branches, and why this
   theme grows into this tree
3. **Ceilings** — which currencies have a natural ceiling (scores, percentages, days) and which are
   unbounded and therefore need softcaps

Anti-example (a fail if it appears): the "coins → gems → rebirth" trio that fits any theme at all;
layer names that swap "Points" for a themed noun while the mechanics stay identical.

## 5. Visuals: rebuild them, do not inherit the default

### 5.1 Default-look blacklist (any of these fails the delivery)

- A flat `#0f0f0f` background with `Lucida Console` — that is the template's factory setting, not a design
- One row of equal-width tabs along the top, one standard page per layer, every page structurally identical
- **Emoji as icons** — icon fonts and external icon libraries are equally forbidden. Icons must be drawn
  in CSS (`clip-path`, `mask`, gradients, pseudo-elements, composed `border-radius`) or inline SVG
- Letter abbreviations as icons (`UP`/`CH`), or mixing icons with text — icons at the same level must
  belong to one symbol system
- Default grey-blue buttons, default rounded cards, default progress bars, with only the colour changed
- Every page sharing the same `main-display + prestige-button + upgrades` skeleton
- **AI look**: purple-blue gradients + glassmorphism + large radii + outer glows as a package; a
  constant pulse/float/particle layer on every screen; numbers that tick for no reason; "tech feel"
  applied as a sticker instead of the theme's own material

### 5.2 Six landing points (each must land in a real file or field)

| Point | Where to change it | Requirement |
|---|---|---|
| **Background** | `backgroundStyle` in `js/mod.js`; `--background` in CSS; the bundled `js/technical/particleSystem.js` | At least two states (changing with chapter or progress). Layered gradients, noise, SVG patterns and canvas particles are all allowed. No external images or CDNs |
| **Layer icons** | `layers[x].symbol`, `layers[x].color`; draw the icon in CSS (pseudo-elements / `mask` / inline SVG); override with `raw-html` when needed | Pure CSS or inline SVG — no emoji, no icon fonts, no external icon libraries. Twenty-five of them side by side must read as one world's symbol system: consistent stroke weight, radii, whitespace and optical centre |
| **Interactive controls** | Buttons and tabs (`css/components.css`, `.tab-button`), progress bars (`css/bars.css`), upgrade/buyable DOM (`js/components.js`) | When a control is **representative** (key purchase, chapter button, core progress bar, scarce-resource bar), redesign its form rather than recolour it: shape, border, fill, and the three states buyable / unaffordable / owned |
| **Navigation and layout** | `layoutInfo` in `js/tree.js` (`startTab`/`startNavTab`/`showTree`), per-layer `leftTab`/`previousTab`, `css/*`, `js/components.js` | At least one non-standard structure: side rail, bottom dock, chapter map, full-screen dashboard. Recolouring does not count |
| **Typography** | `css/general-style.css` and the global variables | Replace the default font stack (system fonts or a font file shipped with the game); numbers use `font-variant-numeric: tabular-nums` |
| **Motion** | CSS transition/animation; `particleSystem.js`; inline SVG inside `raw-html` | At least two meaningful transitions (number roll, button feedback, chapter change), all disabled by `prefers-reduced-motion` |

A tree node's DOM is `<button id="<layerId>" class="treeNode <layerId>">` and the glyph comes from
`symbol` — set `symbol` to empty and draw the icon with `#<layerId>::before` plus `mask` / `clip-path`
/ gradients. No engine edit required. For anything more complex, editing the `tree-node` template in
`js/technical/systemComponents.js` is also within the authorization granted in §2.

### 5.3 Palette

Deliver a **6–8 colour** palette before coding: primary, accent, danger, success, three text levels,
two background steps. Every one becomes a CSS variable. Hard-coded colours anywhere else count as
defects.

### 5.4 Anti-AI-look: every decoration needs a source

"AI look" is not "ugly" — it is **every decision being replaceable by another theme without
contradiction**. Three tests:

1. **Traceable material**: icon shapes, control borders and background textures must come from this
   theme's materials and processes (paper, etching, phosphor screens, weaving, stamped metal, halftone
   dots), not from a generic "tech" register.
2. **Motion carries information**: it appears only on state change (gain, unlock, failure, near a
   ceiling, chapter transition). No ambient decoration, no breathing lights, no particle rain
   unrelated to the numbers. Every animation answers "what does it tell the player?"
3. **Restraint**: one visual focus per screen; grid and whitespace beat stacked effects; one shape
   language repeated, not a new gimmick per layer.

**The test**: strip all text from a screenshot, leaving only shapes and colour — can you still name
the theme? If "space / magic / medieval" all fit equally well, that is the AI look.

## 6. Distinctiveness (reviewers ask three questions)

1. Which mechanic in this tree does **no other** mod tree have? (**≥3** signature mechanics, each
   describable in one sentence)
2. Why would anyone want to reach chapter 3? (A new way to play per chapter, not a bigger number)
3. What does the player see at minute 30 that they could not see at minute 5? (A structural unlock,
   not numeric inflation)

**Forbidden**: reskins of the same trio; chapters that are pure numbers; idle loops with no decision;
treating "more layers" as content; treating "one more autobuyer" as a chapter reward; every challenge
being "buy the same thing with less".

## 7. Playability (these get measured)

- **First purchase ≤10 s**; at least **3** unlock beats in the first 5 minutes; at every moment the
  player knows what to buy next.
- **No dead ends**: no purchase order can permanently strand a player; a failed challenge can be
  exited without punishing the save.
- **Endgame reachable**: normal play gets there, and "idle 2 hours with nothing to do" is not a
  transition.
- **Automation**: the mid game hands over repetitive actions, but at least **1** decision stays with
  the player (build branch, timing, target choice).
- **Saves**: a refresh never loses progress; offline gains have a cap and the rule is stated in-game,
  not buried in code.
- **Performance**: with all 25 layers unlocked, `for (let i=0;i<1000;i++) gameLoop(0.05)` averages
  **<2 ms**.
- **Readability**: any page answers "how much do I have / how fast is it growing / what do I buy next"
  within 3 seconds.

## 8. Relationship to tmt-game-generator (only if you run inside that skill)

- This file's **style and scale requirements outrank the skill's default aesthetics**. The skill's
  gates (design-brief confirmation, per-layer static checks, load-time smoke test, pacing simulation,
  browser verification) **still run, without exception**.
- A few of the skill's 89 static rules reason from template line numbers or the default structure.
  When your rebuild conflicts with one of them, **judge by the rule's intent — the accident it exists
  to prevent — not by its literal line number**, and list every conflict in the handoff with a note on
  why it does not apply here.
- The skill's default is "no engine edits". This file **overrides that default**: edits are allowed,
  bound by the six invariants in §2.
- If the skill's simulator cannot run your rebuild (because you replaced layout components, say),
  treat the browser pass as authoritative and say so in the handoff.

## 9. Output format (strict)

### 9.1 First message: plan only, no code

```
1. Design summary (≤15 lines)
   - one-sentence pitch
   - the three-line theme mapping (currency chain / topology / ceilings)
   - the three signature mechanics, one sentence each
2. Chapter table (no. | name | unlock condition | new mechanic | layers | layer ids)
3. File tree (full paths, marked new / modified / deleted)
4. Visual plan
   - 6–8 colour palette with values and the role of each colour
   - font stack
   - icon system: CSS or inline SVG, the shared stroke/radius rule, three example descriptions (no code)
   - control rewrite list: which buttons / tabs / bars get rebuilt and into what
   - layout sketch, described in words
   - two background states + motion list (each entry states the information it carries)
5. Batching plan (which chapter per batch, roughly how many files)
```

**Wait for confirmation before writing code.** Emitting code before confirmation is a violation.

### 9.2 Each later batch: one chapter, or ≤6 files

Every file follows this format exactly. None may be skipped:

````
### File: js/layers/ch1-observation.js
```js
<the complete contents, first line to last>
```
````

Hard requirements:

- **No** `// ...`, `// rest as above`, `/* omitted */`, `TODO` or `<your code here>`.
- Every code block must run once written to disk; state the load order at the top of the batch when
  files depend on each other.
- When changing an existing file, give the **complete file**, not a diff (unless a diff was explicitly
  requested).
- End every batch with these four lines:

```
Added: <files / content>
Changed: <path → one line>
Self-tested: <boot / one prestige / one purchase / console>
Next: <chapter or files>
```

- If a single message cannot hold the batch, split it. **Take another batch rather than compressing
  code or dropping files.**
- Do not stop to ask "shall I continue?" — follow the §9.1 batching plan to the end, unless a design
  conflict genuinely needs a user decision.

### 9.3 Final message: handoff

```
1. How to run (command + expected first screen)
2. Acceptance checklist (tick every item from §2 / §3 / §5 / §7)
3. Engine change log (file → what changed → why → how verified)
4. Conflicts with static rules (each one, if any)
5. Known risks (≤5, ordered by severity)
```

## 10. Pre-delivery self-check (answer every item, do not skip)

1. Of the 25 layers, how many could be removed without the player noticing? (>0 → merge them)
2. Where does each of the three signature mechanics first appear, and in which later chapter is it reused?
3. What structural difference does the interface have at minute 5, 15 and 30?
4. Which of these is still the template's original: background, icons, typography, navigation,
   buttons / tabs / progress bars? (any → rebuild it)
5. Outside the palette, how many hard-coded colours remain? (>0 → move them into variables)
6. Setting a currency to `0` and to `1e1000` — where does it throw or display `NaN`?
7. Save → refresh → load: which fields are lost?
8. With all 25 layers unlocked, what is the average of 1000 × `gameLoop(0.05)`?
9. Is any challenge "enter, click once, done"? (yes → raise the goal or add a constraint)
10. Can you state the difference between this and "another ordinary mod tree" in three sentences?
11. Are all icons drawn in CSS or inline SVG? Any emoji, icon fonts or external icon libraries left?
12. Strip the text from a screenshot: can you still name the theme? Would "space / magic / medieval"
    fit equally well?
13. For each animation: what state change triggers it, and what does it tell the player? How many
    ambient decorative animations remain? (>0 → delete them)

## 11. User input (replace `__` before sending)

- **Theme**: __ (one sentence: what the game is actually about)
- **Reference feel**: __ (optional; describe the feeling, e.g. "deep-sea research isolation plus
  industrial instrumentation" — no reproduction of any existing work is expected)
- **Language**: __ (Chinese / English / bilingual toggle)
- **Don'ts**: __ (themes, mechanics or visual elements that must not appear)
- **Scale adjustment**: default `large` (25 layers / 50+ hours). For bigger write `__ layers`; for
  smaller write `__ layers` and say which chapter to cut
- **Must keep**: __ (optional; layer names, mechanics or settings you have already fixed)

---

**Before you start, restate your understanding of §11 in three lines or fewer, then proceed to §9.1.**
