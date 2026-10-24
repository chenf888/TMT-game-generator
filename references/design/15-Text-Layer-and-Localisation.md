# 15 — The text layer: localisation beyond a two-way ternary

Read this at **Stage 2** (Q7) and **Stage 4.4** whenever the answer is anything other than
"English only".

---

## §0 P17 is the smallest case, not the standard

`09 P17` teaches the bilingual convention: a `window.chinesemode` flag and
`cond ? "中文" : "English"` ternaries on user-facing strings. That is correct, cheap, and
sufficient for exactly one shape: **two languages, one of them English, chosen by a toggle.**

It breaks in four ways that real builds have already hit:

1. **More than two languages.** A build that answered Q7 with "every sentence in a different
   language, 16 languages in the pool" cannot express itself as a ternary — and neither can a
   three-language game.
2. **Strings built at module scope.** A ternary evaluated while the file loads bakes in the
   language that was set at load time; the flag's later value never reaches it.
3. **Engine-owned strings.** `main-display` hard-codes `You have` / `(x/sec)` and cannot be
   translated without editing engine files (07 Part F7). A bilingual game that translates
   every string it owns still shows English chrome.
4. **Data-shaped text.** Upgrade descriptions that are *generated* (`"×" + format(mult) + " gain"`)
   need a template, not a ternary pair, or the count of strings grows with the content.

---

## §1 Pick the tier at Q7

| Tier | Shape | Machinery |
|---|---|---|
| **T1 — single** | one language, usually English | none; write strings inline |
| **T2 — pair** | two languages, one toggle (`P17`) | `window.chinesemode` + ternaries |
| **T3 — pack set** | N complete packs, a settings dropdown switches everything | the `js/lang/` text layer below |
| **T4 — polyglot** | T3 **plus** a mixed mode where each string is independently assigned a language | T3 + a phrase pool + a stable per-save offset |

T3/T4 are the same machinery; T4 only adds a pool and a rotation. Do not attempt T4 with a
ternary — one build's T4 is 370 strings across 370 languages and 7 helper scripts, because the
integrity problem is real and mechanical.

---

## §2 The `js/lang/` convention (T3/T4)

```
js/lang/index.js      # the t() accessor, LANG_MODES, preference persistence
js/lang/pool_*.js     # LANG_PHRASES rows: [key, code, text, native]   (T4 only)
js/lang/packs_*.js    # LANG_PACKS: { en: {key: text}, zh: {...} }     (one per complete mode)
```

**Load order is mandatory.** `index.html` must load the lang files **before `js/mod.js`**,
because mod.js and every layer file call `t()` inside `addLayer()` — i.e. at load time. A pack
loaded after mod.js produces a game whose text is the literal fallback.

**One accessor.** Every user-facing string in the game goes through exactly one function:

```js
function t(key, fallback) { … }        // pack → pool → English pack → literal → key
```

The key is the contract between code and text: namespace it
`<layer>.<component><id>.<field>` (`chat.up11.t`, `chat.up11.d`, `ach.13.t`). Keys are
**stable and never reused** — re-using a key silently re-labels the wrong thing in every pack.

**Preferences live outside the save.** Persist the chosen language and the polyglot offset in
`localStorage` under a key derived from `modInfo.id` (`<id>.lang`, `<id>.offset`), never inside
the save payload: the language must survive an export/import and a hard reset, and re-importing
someone else's save must not change the reader's language. The offset must be persisted too,
otherwise the same sentence changes language on every reload and the game reads as corrupted.

**Get the strings out of module scope.** Descriptions, titles, tooltips and `winText` must be
**functions** so `t()` runs after the preference is loaded: `title: () => t("chat.up11.t", "…")`.
This is the same rule that F3 in 07 Part F enforces for a different reason (a top-level throw
kills every later initializer in mod.js).

**Override the engine's own chrome.** Replace `main-display` with a `mainDisplay` /
`mainAmount()` implementation in every non-English game, or the layer tab will mix languages
(07 Part F7).

---

## §3 The integrity problem — what goes wrong at T3/T4

This is not hypothetical: one build needed **seven** helper scripts (`langcheck`, `langfix`,
`langdedupe`, `verify_lang`, `pack_zh_en`, `pack_zht`, `relang`) before its text layer was
clean. The failure modes, in the order they appeared:

| # | Defect | Symptom in play |
|---|---|---|
| 1 | **Duplicate language codes** — two rows claim `ie`, `dyo`… | the picker offers the same language twice; one is unreachable |
| 2 | **Duplicate endonyms** — two languages share a native name | the reader cannot tell two entries apart |
| 3 | **Key used in `t()` but absent from the pool** | silently falls back to the literal: that sentence is *never* translated, and nothing warns |
| 4 | **Key in the pool that no code uses** | dead text, inflates the language count misleadingly |
| 5 | **Pack parity broken** — `zh` has a key `en` lacks (or vice versa) | switching to that mode leaves a few strings in the other language |
| 6 | **CJK leaking into a non-CJK language** (or vice versa) | copy-paste contamination; the "language" is half-written |
| 7 | **Placeholder / mojibake tokens** — `Required`, `填充`, `**`, `□` | untranslated leftovers and encoding damage reaching the screen |

**Run the checker, not your eyes:**

```bash
node scripts/i18n_check.js <game-folder> [--json]
```

It is console-free and reads the convention above: it loads `js/lang/pool_*.js` and
`packs_*.js` in a VM, extracts every `t("…")` key from `js/mod.js` and the registered mod files,
and reports missing keys, unused keys, duplicate codes, duplicate endonyms, pack parity,
CJK leakage by language code, and a token blocklist. A game with no `js/lang/` directory is
skipped silently, so it is safe to run on every build.

---

## §4 The engine's own chrome (the strings you don't own but the player reads)

The stock template speaks English in places no layer file reaches: the options menu, tree
tooltips and dialogs, the time units ("seconds ago"), the milestone/achievement popups, the
respec/master buttons, and the three end-screen lines inside `index.html`. `main-display`
(F7) is only the most visible one. A T2 game can ship with English chrome and a note; a **T3+
build must localize the chrome too**, or the picker promises four modes and three of them
still say "You have".

The proven method (one real T3 build shipped it across four packs):

1. **Swap the engine's English literals for `t("ui.*")` calls** in the six chrome files —
   `components.js`, `technical/systemComponents.js`, `utils/NumberFormating.js`,
   `utils/save.js`, `utils.js`, `game.js` — plus the end-screen text nodes in `index.html`.
   String-literal swaps ONLY: no logic changes, no signature changes. This is the one
   sanctioned exception to "never edit engine files", and it stays safe because step 2 makes
   every swap verifiable.
2. **Generate the packs from one source.** Keep every string in a single `texts.js` and emit
   the packs from it with a build-time script; the script hard-fails on any `t("…")` key the
   source does not define, so a half-swapped chrome cannot ship.
3. **Let the checker see the chrome.** `scripts/i18n_check.js` scans those same six files and
   `index.html` for `t()` calls (double- or single-quoted — Vue attribute contexts force
   single quotes), so a missing `ui.*` key is an I-MISSING FAIL, not a silent English leak.
   A stock (unswapped) engine file contains no `t()` calls and scans as a no-op.
4. **Bump the preference key when changing the default language** (`<id>.lang` →
   `<id>.lang.v2`): a saved old choice otherwise silently masks the new default, and the
   "default changed" that you verified never reaches an existing profile.

Script-specific rendering note: writing systems rendered as Unicode symbols (braille cells
U+2800–28FF, IPA, CJK extensions) have no soft-wrap points — long lines force horizontal
scrolling. Give such a mode a body class (`html.brl-mode`) applying `word-break: break-all`
and `overflow-wrap: anywhere`, and render digits through the script's own number signs
rather than leaving ASCII numerals inside a translated sentence.

---

## §5 Checklist

- [ ] Q7 answered as one of T1–T4, and the tier written into the brief.
- [ ] Lang files are loaded **before `js/mod.js`** in `index.html`.
- [ ] Exactly one accessor; every user-facing string goes through it (grep for stray literals).
- [ ] Keys namespaced `<layer>.<component><id>.<field>`; no key reused for a second meaning.
- [ ] Descriptions/titles/tooltips/`winText` are **functions**, not module-scope values.
- [ ] `main-display` overridden (F7) in any non-English game.
- [ ] T3+: the engine's chrome localized via §4 — `i18n_check` covers the six chrome files
      and `index.html`, with 0 missing `ui.*` keys.
- [ ] A changed default language bumped the preference key (`<id>.lang` → `<id>.lang.v2`), so
      a saved old choice cannot mask it.
- [ ] Language preference + polyglot offset persisted outside the save, keyed off `modInfo.id`.
- [ ] `node scripts/i18n_check.js <game>` reports 0 missing, 0 duplicate codes, 0 duplicate
      endonyms, 0 parity gaps, 0 suspicious tokens.
- [ ] Numbers in translated strings go through `format()`; no locale-specific separators are
      baked into a translation.
