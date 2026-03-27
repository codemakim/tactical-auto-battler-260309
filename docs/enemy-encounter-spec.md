# Tactical Auto Battler

## Enemy Encounter Specification (MVP)

This document defines enemy archetypes and stage compositions for the MVP run.

Design principle: **few types, clear roles**. Players should read enemy behavior within a few seconds. Each battle introduces at most one new archetype.

---

# 1. Design Principles

## 1.1 Readability First

- Max **2 enemy archetypes** per battle
- Same archetype can appear multiple times (e.g., Brute x2)
- Enemy uses the same 3-action-slot system as player units
- Player can predict enemy behavior by reading their actions

## 1.2 Learning Curve

Each stage introduces at most one new archetype:

```
Stage 1: Brute (learn: basic front-line combat)
Stage 2: + Ranger (learn: back-line threats)
Stage 3: + Guard (learn: protection mechanics)
Stage 4: + Disruptor (learn: position disruption)
Stage 5: Boss (all learned mechanics combined)
```

## 1.3 Stat Basis

Enemy stats are derived from player class stat ranges with a stage multiplier.

No separate enemy stat system — reuse existing `ClassDefinitions` ranges.

---

# 2. Enemy Archetypes (4 Types)

## 2.1 Brute (전열 압박형)

Based on: **Warrior** stat range

Role: Front-line aggression. Straightforward melee damage.

```
Base stat range: hp [48,58], atk [11,13], grd [6,8], agi [5,7]

Action Slots:
  Slot 1: IF POSITION_FRONT → DAMAGE (ATK x1.0, target: ENEMY_FRONT)
  Slot 2: IF HP_BELOW 40%   → SHIELD (GRD x1.2, target: SELF)
  Slot 3: IF POSITION_BACK  → MOVE to FRONT
```

Behavior: Moves to front, attacks. Defends when low HP.

Player learns: basic front-line engagement, how damage and positioning work.

## 2.2 Ranger (후열 화력형)

Based on: **Archer** stat range

Role: Back-line damage dealer. Threatens player's back-line or weakest units.

```
Base stat range: hp [36,44], atk [12,14], grd [3,5], agi [9,12]

Action Slots:
  Slot 1: IF POSITION_BACK  → DAMAGE (ATK x1.1, target: ENEMY_ANY)
  Slot 2: IF POSITION_FRONT → DAMAGE (ATK x0.7, target: ENEMY_FRONT)
  Slot 3: IF ALWAYS         → MOVE to BACK
```

Behavior: Stays in back, picks off weakest target. If pushed to front, does reduced damage then retreats.

Player learns: back-line threats exist, need to protect squishy units or eliminate Rangers fast.

## 2.3 Guard (보호형)

Based on: **Guardian** stat range

Role: Protects allied Rangers. Creates shields, uses COVER.

```
Base stat range: hp [56,65], atk [7,10], grd [10,12], agi [4,5]

Action Slots:
  Slot 1: IF POSITION_FRONT → SHIELD (GRD x1.0, target: SELF) + BUFF (COVER, duration: 1)
  Slot 2: IF POSITION_BACK  → MOVE to FRONT
  Slot 3: IF ALWAYS         → SHIELD (GRD x0.8, target: SELF)
```

Behavior: Stands in front, shields self and covers back-line allies. Moves forward if displaced.

Player learns: must deal with Guard to reach Rangers. Introduces COVER mechanic as an obstacle.

## 2.4 Disruptor (방해형)

Based on: **Controller** stat range

Role: Disrupts player formation with PUSH. Forces repositioning.

```
Base stat range: hp [40,48], atk [8,11], grd [4,6], agi [7,9]

Action Slots:
  Slot 1: IF ENEMY_FRONT_EXISTS → DAMAGE (ATK x0.6, target: ENEMY_FRONT) + PUSH
  Slot 2: IF POSITION_BACK      → DAMAGE (ATK x0.8, target: ENEMY_FRONT)
  Slot 3: IF ALWAYS             → SHIELD (GRD x0.8, target: SELF)
```

Behavior: Pushes player's front-liners to back, disrupting melee attackers. Falls back to ranged poke if in back.

Player learns: position is not static, need movement cards or flexible builds.

---

# 3. Stage Compositions

## Stage 1: Introduction

```
Brute x3

Total enemies: 3
Positions: FRONT x3
```

Purpose: Teach basic combat. Player's base actions should be enough to win.

Difficulty: Very low. Players learn the UI and flow.

## Stage 2: Back-line Threat

```
Brute x1 (FRONT) + Ranger x3 (BACK)

Total enemies: 4
```

Purpose: Rangers in back pick off player units. Player must decide whether to rush Rangers or deal with Brute first.

Difficulty: Low-medium. First card reward from Stage 1 helps.

## Stage 3: Protection Wall

```
Guard x1 (FRONT) + Ranger x3 (BACK)

Total enemies: 4
```

Purpose: Guard's COVER protects Rangers. Player must either burst through Guard's shield or find ways to bypass COVER (e.g., ENEMY_BACK targeting, PUSH).

Difficulty: Medium. Tests whether card acquisitions are building toward a coherent strategy.

## Stage 4: Position Chaos

```
Disruptor x1 (FRONT) + Brute x3 (FRONT)
  OR
Disruptor x1 (FRONT) + Ranger x3 (BACK)
```

Variant selection: seed-based random (one of two compositions).

Purpose: Disruptor pushes player units around, breaking formation. Combined with either raw pressure (Brute variant) or back-line threat (Ranger variant).

Difficulty: Medium-hard. Player should have 3 card rewards by now.

## Stage 5: Boss

```
Boss Brute x1 (FRONT) + Guard x1 (FRONT) + Ranger x2 (BACK)

Total enemies: 4
```

Boss Brute = Brute archetype with enhanced stats (see §4 scaling).

Purpose: Combines all learned mechanics — front pressure, protection, back-line threat. Player needs a well-built team to handle all three simultaneously.

Difficulty: Hard. Full run preparation required.

---

# 4. Stat Scaling

## 4.1 Stage Multiplier

Base stats are taken from the archetype's stat range (mid-point), then multiplied:

```
Stage 1: x0.85
Stage 2: x0.95
Stage 3: x1.0
Stage 4: x1.1
Stage 5: x1.15 (normal enemies), x1.5 (boss)
```

Applied to all stats (HP, ATK, GRD, AGI). Rounded down.

## 4.2 Calculation Example

Brute at Stage 3 (x1.0):
```
HP:  mid(48,58) = 53 × 1.0 = 53
ATK: mid(11,13) = 12 × 1.0 = 12
GRD: mid(6,8)   = 7  × 1.0 = 7
AGI: mid(5,7)   = 6  × 1.0 = 6
```

Brute Boss at Stage 5 (x1.5):
```
HP:  53 × 1.5 = 79
ATK: 12 × 1.5 = 18
GRD: 7  × 1.5 = 10
AGI: 6  × 1.5 = 9
```

## 4.3 Seed-Based Variation

Within each archetype, individual enemy stats vary slightly using the run seed:

```
actual_stat = floor(mid_stat × stage_multiplier × (0.9 + seed_rand × 0.2))
```

This gives ±10% variation per enemy, so two Brutes in the same stage are not identical.

---

# 5. Enemy Naming

Enemies are displayed with archetype + stage indicator for player readability:

```
Stage 1-2: Brute, Ranger (plain names)
Stage 3-4: Veteran Brute, Veteran Ranger
Stage 5:   Boss Brute, Elite Guard, Elite Ranger
```

Naming is cosmetic only — no mechanical difference beyond stat scaling.

---

# 6. Enemy Position Assignment

Default positions by archetype:

```
Brute:     FRONT
Guard:     FRONT
Ranger:    BACK
Disruptor: FRONT
```

Enemies do not change their starting positions between stages.

---

# 7. Future Expansion (Not MVP)

Potential additions after MVP validation:

- New archetypes (Healer, Assassin-type)
- Elite variants with upgraded action slots
- Randomized encounter pools
- Mini-boss encounters at Stage 3
- Environmental modifiers per stage

---

# 8. Interaction with Run System

## 8.1 Enemy Generation

A `generateEncounter(stage, seed)` function produces the enemy team:

```
Input:  stage number (1~5), seed
Output: CharacterDefinition[] with positions
```

Uses archetype definitions + stat scaling + seed-based variation.

## 8.2 Battle Integration

Generated enemies are passed to `createBattleState()` as the ENEMY team, same as current flow. No battle engine changes needed.

## 8.3 Retry

On retry, the same encounter is regenerated (same seed + stage = same enemies). Player faces the identical enemy composition but can adjust their own formation and cards.
