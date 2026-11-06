# TMT Game Generation · Full-Prompt Template

> **What this is**: a single form that states the game once and completely. TMT-Skill's default entry
> is "one conversation, nine questions", which suits lightweight requests; this template is the
> **alternative entry** — you write the full specification yourself, the agent skips the question-by-
> question interview and goes straight to the confirmation gate, and the game ships with chaptered
> content, signature mechanics and a story skeleton from the first line instead of a skeleton squeezed
> out of one sentence.
>
> **How to use it**
> 1. Copy this file and fill in each section (write inline; `__` marks a blank).
> 2. Start a new session, paste the whole filled document to the agent, and add:
>    **"Execute this specification through the tmt-game-generator pipeline."**
> 3. The agent checks the §A ledger and the §B three-line recap → you confirm → Stage 2 onward runs
>    automatically (every per-layer gate still applies).
>
> **Three iron rules (the template does not rewrite any gate)**
> 1. **Only what you wrote counts as an answer** — the agent transcribes it verbatim into the design
>    brief's §2 question ledger (`D-QLEDGER`) with the source recorded as `full-prompt`.
> 2. **A blank is not an invitation to decide.** The agent raises every blank at the confirmation gate
>    or offers a proposal **and waits**; it never quietly decides for you.
> 3. **The template replaces the interview, not the gates.** The Stage 2 brief confirmation, the
>    per-layer gates, the pacing simulation and the browser verification all still run.

---

## §0 Delivery positioning

- **Game name**: __
- **One-sentence pitch**: __ (the difference a player feels within 30 seconds of opening the page)
- **Reference feel** (optional): __ (describe the feeling, e.g. "Celestial-style chapter progression
  with named softcap bosses" — the agent translates it into structure and mechanics and promises no
  reproduction of any work's scale)
- **Target directory name** (lowercase, hyphens, e.g. `the-starlit-tree`): __

## §A Question ledger (same numbering as design brief §2; the agent transcribes it line by line)

| # | Question | Your answer |
|---|---|---|
| S0 | Theme (what the game is actually about) | __ |
| Q1 | Theme = structure, three lines (currencies / tree / ceilings — see §B) | __ (or "AI drafts, I confirm") |
| Q2 | Scale: `small` (5–7 layers / 2–4 h) / `medium` (10–16 layers / 10–30 h) / `large` (25+ layers / 50 h+) / `custom` (attach a substitution note) | __ |
| Q3 | Natural ceilings: `hard` (e.g. an exam capped at 150) / `unbounded` / `mixed` (per currency) | __ |
| Q4 | Pacing: `idle` / `active` / `balanced` | __ |
| Q4b | Core interaction (what the player **does**): `passive-prestige` / `active-click` / `active-tick` / `board-minigame` | __ (writing it locks it; leave blank and the agent runs `classify.js` for a proposal) |
| Q4b+ | Modifier multi-select: `score-attack` / `minigame` / `boss-rush` / `gacha` / `casino` / `story` / `challenges` / `caps` (the agent lists any unmet dependency and waits) | __ |
| Q5 | Side content: `full` (challenges + achievements + a story side layer) / `standard` (challenges + achievements) / `light` (achievements only) | __ |
| Q6 | Automation and walls: `full-auto, no long walls` (8-step ladder) / `classic` (4–6 steps, mid wall ≤30 min) / `speedrun` (walls <5 min) | __ |
| Q7 | Language: `T1` single / `T2` two-way toggle (**default language?**) / `T3` multi-language pack / `T4` mixed | __ |
| Q8 | Endgame flavour: `consumable-reset` / `tuning` / `erosion` / `classic` (milestone chain) | __ |

## §B Theme = structure mapping (the expansion of Q1; the theme must grow into a tree, not wear one)

- **Currency chain (in accumulation order)**: __ (e.g. study hours → subject score → overall rank)
- **Tree topology**: __ (which layers exist, who resets whom, whether there is a hub or branches;
  for medium+ reference the chapters in §C directly)
- **Ceilings**: __ (which currencies are capped and at what value; uncapped ones use softcaps, see §G)

## §C Chapter plan (the spine of a good build; medium suggests 2–4 chapters, large 5–10; small may delete this section)

Each row is one content chapter. **Every chapter must carry at least one signature mechanic** (pick one
from §E or invent your own) — "the next chapter is just bigger numbers" is the mark of a factory-made
game, and it is exactly what this template exists to eliminate.

| Ch. | Name and theme | Unlock condition (which milestone or value from the previous chapter) | Signature mechanic | Approx. layers | Representative layers |
|---|---|---|---|---|---|
| 1 | | Opening | | | |
| 2 | | | | | |
| 3 | | | | | |

- **Reset relationship between chapters**: __ (when a new chapter starts, are old currencies/layers kept
  or cleared? Spell out `doReset keeps`)
- **Hub layer** (optional): __ (e.g. a shop hub: one unlock chain opening a new subsystem per chapter,
  prices spanning several orders of magnitude — P33)

## §D Layer specification (write it per layer; a whole row of `AI drafts` is also legal — the agent drafts
from the blueprint quota and waits for your confirmation in the Stage 2 table)

| id | name | row | type | requires | Component budget (upgrades/milestones/challenges/buyables) | Automation grant | Softcap plan | Kept through reset |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

## §E Signature mechanic selection (all buildable; choose by cost, one line of spec each)

**Native component tier (pick directly)**
- [ ] **Named softcap boss** (P31): turn a softcap into a named, own-page, attackable enemy — name: __;
  three purchasable directions: starting point / weakening strength / floor guarantee
- [ ] **Shop hub unlock chain** (P33): chain length __ steps, price span __ (e.g. 10 → 1e12)
- [ ] **Charged building** (P34): spend a rare material to build → output peaks → upgrade clears it and
  starts over; the charge feeds __
- [ ] **Consumable reset** (P42/M19, i.e. Q8's `consumable-reset`): the reset also consumes __, and each
  resource shows its own contribution
- [ ] **Return-visit rewards** (P41): golden-cookie floating clicks / timed orb claims / limited refreshes
  (choose __)
- [ ] **Blessing/curse pair** (P40): two resources with opposite signs derived from the same source, a
  build branch at __
- [ ] **Casino** (P38/M14, needs an active type): pick __ of the four (dice multiplication / coin duality
  / slots / poker)
- [ ] **Gacha** (P39/M13, needs an active type): __ rarity tiers; banner rotation (yes/no); sacrifice __
- [ ] **Boss attack roulette** (P35/M12, needs active + sim, at most 1 layer): __ phases; counter rules: __

**Engine-extension tier (real cost — choose within your budget)**
- [ ] **Story engine** (P32/M15; only the large blueprint carries full cutscenes): segment plan in §F
- [ ] **Bullet-hell / action arena** (P36) ⚠ high cost: a bespoke canvas sub-game; leaving the tab takes
  full damage to keep focus
- [ ] **Ship roguelike arena** (P37) ⚠ high cost: wave clearing plus a three-choice upgrade per wave
- [ ] **Multiverse** (P30) ⚠⚠ highest cost: a gameLoop-level engine extension (`layers[].universe` plus
  per-universe time rates). It is the ultimate "second world", but a 25-layer large game cannot hold it —
  halve the scale expectation and accept a longer build

**Anything not selected must not appear**: the agent will not stuff in mechanics to fill a quota — the fun
quota is a floor, not a checklist.

## §F Story and copy

- **Language tier** (= Q7, details here): __; default language: __
- **Named character** (optional, Celestial-style personality): __ (give a key layer a "person"; story and
  upgrade copy revolve around them)
- **Story segment table** (fill only if `story` was chosen; one row per segment: trigger → one line of
  what it says):
  | Trigger | Content |
  |---|---|
  | | |
- **winText**: __ (the line on the endgame screen — worth writing by hand)
- **Style and voice**: colour mood __; naming register __ (e.g. every layer name uses the same figure)

## §G Numbers and feel (leave blank to use the measured defaults in `balance-defaults.json` — that is the
right choice most of the time)

- First purchase ≤10 s (default; do not touch)
- Wall budget: __ (Q6 already picked a tier; note exceptions here, e.g. "chapter 3 may open with a 45 min
  wall because …")
- Endgame target duration: __ h (matches the Q2 tier; the simulator measures it — paper ≠ measurement)
- Cost ladder: ≥6 orders of magnitude per layer plus at least one deliberate price drop "key slot"
  (on by default)
- Softcap family: P12 triple softcap by default; if P31 is chosen, the main currency switches to a named
  softcap

## §H Off-limits and boundaries (saying what you do **not** want matters as much as what you do)

- **Mechanics or subject matter that must not appear**: __
- **Offline gains**: kept by default; if you want Celestial-style `offlineLimit: 0`, you must pair it with
  the §E return-visit rewards (that set exists for exactly this)
- **Placeholder layers**: no Celestial-style `deactivated` stubs — this template's output carries no
  unwired skeleton

## §I Acceptance

- Endgame `isEndgame()`: __ (a concrete Decimal; e.g. points ≥ 1e1200)
- Total achievements and their quota: __
- The four things you will try by hand at handoff (Stage 7 produces its own checklist; add yours here): __

---

## Appendix: one filled row as a style reference (from §C)

| Ch. | Name and theme | Unlock condition | Signature mechanic | Approx. layers | Representative layers |
|---|---|---|---|---|---|
| 3 | Starport — the orbital construction era | 4th step of the chapter-2 hub chain | Charged building (P34): spend star-core shards to build orbital turrets; when output peaks, upgrade clears them and starts over; the charge also feeds global time rate | 4 | Turret, Dockyard, Orbit, Starlane |

> That single row locks in three things at once: the chapter's entry ticket (the hub chain), the ritual
> only this chapter has (upgrade-and-clear), and the cross-chapter lever (feeding global time rate).
> Every chapter should survive the question "why would anyone want to play this far?"
