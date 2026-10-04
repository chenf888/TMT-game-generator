# Design Brief — "The Apiary Tree"

> Filled BEFORE any code (SKILL.md, Stage 2). Blueprint: `small` (assets/blueprints.json).

## 1. Identity

| Field | Value |
|---|---|
| Game name | The Apiary Tree |
| Author | AI |
| Points name (`modInfo.pointsName`) | honey |
| Language mode (interview Q7) | English only |
| One-line pitch | An incremental apiary where bees turn flowers into honey across a growing farm |

## 2. Interview record (answers → parameters)

| # | Question | Answer | Locked parameter |
|---|---|---|---|
| Q0 | Theme | **Apiary** (user) | P14 mapping in §3 |
| Q1 | Theme-structure | Confirmed by user | currencies/topology/ceilings below |
| Q2 | Scale | **small** | blueprint `blueprints.small` |
| Q3 | Natural ceilings | No, unbounded | P12 softcaps |
| Q4 | Pacing | **Balanced** | default blueprint curves |
| Q4b | Game type (interaction model) | passive-prestige | component contract in §2b |
| Q5 | Side content | Standard | M1 classic challenges + achievements |
| Q6 | Automation & timewalls | Classic pacing | 5-step ladder |
| Q7 | Language & style | English only | warm amber palette |

- **Currencies (in order):** Nectar → Honey → Beeswax → Propolis
- **Layer topology:** 2 honey layers → 1 beeswax hub → 1 propolis capstone
- **Ceilings:** none

## 2b. Game type profile (Q4b — required)

| Field | Value |
|---|---|
| Type | passive-prestige |
| Confidence + margin | 0.63 / 0.613 |
| Components this type makes mandatory | layers:normal\|static, upgrades, milestones, mod.js |
| Components this type forbids | clickables, grid, update() |
| Rules exempt for this type | D-NOUPDATE |