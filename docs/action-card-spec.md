# Tactical Auto Battler

## Action Card System Specification (MVP)

This document defines the system for acquiring and managing temporary actions during a run.

Actions represent conditional behaviors that determine how units act in combat.

These actions are temporary and exist only for the duration of the run.

---

# 1. Action Card Concept

Action Cards represent **behavior rules** that can be assigned to units.

Structure:

```
Condition → Action
```

Example:

```
IF POSITION = FRONT → ATTACK
IF POSITION = BACK → MOVE_FORWARD
IF HP < 30% → DEFEND
```

Each unit has **3 action slots**.

---

# 2. Action Slot Rules

Each combat unit has exactly:

```
3 Action Slots
```

Rules:

- Slots are evaluated in order
- Slot 1 has highest priority
- Only the first valid action executes

Example:

```
Slot 1 → Charge Attack
Slot 2 → Basic Attack
Slot 3 → Defend
```

---

# 3. Temporary Nature

Action Cards are **temporary run-based upgrades**.

Rules:

- Actions are obtained during a run
- Actions disappear after the run ends
- Actions do not permanently modify characters

Characters keep their base stats and identity.

---

# 4. Action Card Rewards

After certain battles, players receive action rewards.

Reward format:

```
Choose 1 from multiple options
```

Unlike typical roguelikes with 3 options, this system provides **more options**.

Example:

```
Choose 1 of 5 actions
```

Purpose:

- reduce randomness frustration
- increase strategic selection

---

# 5. Class Restrictions

Some actions are restricted by character class.

Example:

```
Charge Attack → Lancer only
Heavy Shield → Guardian only
Backstab → Assassin only
```

Other actions may be universal.

Example:

```
Basic Attack
Defend
Move Forward
```

---

# 6. Action Replacement

When acquiring a new action, the player must choose:

```
Replace an existing action slot
or
Discard the new action
```

All 3 slots can be replaced — including the character's original base actions.

Example:

```
Current Slots:
1 Charge      ← replaceable
2 Attack      ← replaceable
3 Defend      ← replaceable

Reward:
Backstab

Player chooses to replace slot 2.
```

---

# 7. Action Rarity

Action Cards have rarity tiers.

```
Common
Rare
Epic
Legendary
```

Higher rarity actions may include:

- stronger effects
- unique mechanics
- complex conditions

### Card Templates & Variant Generation

Cards are defined as **templates** with variant axes. When a card is obtained as a reward, each axis is randomly resolved:

```
CardTemplate:
  id, name, rarity, condition
  classRestriction?                        ← class-specific card
  defensivePriority?                       ← if true, unit acts before attackers (§4.1)
  effectTemplates:
    - type, stat
      multiplierPool: [1.0, 1.1, 1.2]    ← pick one
      targetPool: [ENEMY_FRONT, ...]       ← pick one
```

This creates **horizontal differentiation** — the same card concept can appear with different trade-offs (e.g., higher damage but limited targeting, or lower damage but flexible targeting).

Variant generation is seed-based (deterministic).

### Rarity Distinction

Rare/Epic cards also use templates but with:

- **Higher multiplier ranges** (e.g., 1.3–1.5 vs Common's 1.0–1.2)
- **Wider target pools** (e.g., ENEMY_ANY access)
- **Additional effects** (e.g., PUSH, DEBUFF attached)

A single-option template behaves identically to a fixed card.

Example:

```
Execution Cut (Common template)
  Condition: ENEMY_HP_BELOW 30
  multiplierPool: [1.3]
  targetPool: [ENEMY_FRONT]

Execution Cut (Rare template)
  Condition: ENEMY_HP_BELOW 30
  multiplierPool: [1.3]
  targetPool: [ENEMY_ANY]
```

---

# 8. Example Action Cards

Example actions:

### Basic Attack

```
Condition: POSITION_FRONT
Effect: ATTACK
Power: 1.0
```

---

### Charge Attack

```
Condition: POSITION_BACK
Effect: CHARGE_ATTACK
Power: 1.3
```

---

### Tactical Retreat

```
Condition: HP_BELOW_PERCENT (30)
Effect: MOVE_BACK
```

---

### Guardian Shield

```
Condition: FIRST_ACTION_THIS_ROUND
Effect: DEFEND
Power: 1.5
```

---

# 9. Action Pool System

Each class has its own action pool.

Example:

```
Warrior Pool
Lancer Pool
Archer Pool
Guardian Pool
Controller Pool
Assassin Pool
```

When rewards are generated:

- class-specific actions may appear
- universal actions may appear

## Universal Card Pool (범용 카드 풀)

All classes can use these cards. Defined in `ActionPool.ts`:

```
Advance       (COMMON) — POSITION_BACK → MOVE to FRONT
Withdraw      (COMMON) — POSITION_FRONT → MOVE to BACK
Quick Strike  (COMMON) — POSITION_FRONT → DAMAGE x0.7~0.9 (low ATK multiplier)
Guard         (COMMON) — ALWAYS → SHIELD x0.8~1.2
Recover       (COMMON) — ALWAYS → HEAL 15~25
Rally         (RARE)   — ALWAYS → HEAL ally 10~20
Feint         (RARE)   — POSITION_FRONT → DAMAGE x0.4~0.6 + DELAY_TURN
```

Universal cards have no `classRestriction` and appear in all class reward pools.

---

# 10. Reward Generation Rules

When generating rewards:

```
1. select possible actions from pool
2. filter by class compatibility
3. generate reward list
```

Example:

```
5 candidate actions displayed
player selects 1
```

---

# 11. Strategic Goal

The action system creates **behavior engineering gameplay**.

Players design combat logic such as:

```
if front → attack
if back → reposition
if low hp → defend
```

The goal is to create a **stable action system** that works against enemy behavior.

---

# 12. Run Reset

At run end:

```
All action cards are removed.
Characters return to their original 3 base action slots.
```

Each character has a fixed set of 3 base action slots defined by their class.
Run-time replacements are temporary — they do not permanently modify the character.

This ensures each run remains unique.

---

# 13. MVP Scope

Initial implementation includes:

```
3 action slots
action replacement
class restrictions
rarity tiers
reward selection (5 options)
```

Future expansions may include:

```
action upgrades
combo actions
conditional chains
```
