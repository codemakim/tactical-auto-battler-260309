# Tactical Auto Battler

## Combat System Specification (MVP)

This document defines the detailed combat system rules for the game.

The goal is to remove ambiguity so that the combat engine can be implemented deterministically.

---

# 1. Combat Overview

Combat is a **semi-automated tactical battle**.

Players do not manually control attacks.

Instead they influence battle through:

- team composition
- action pattern configuration
- hero intervention timing

Battles are fast-paced.

Target duration:

- 20~30 actions
- about 30 seconds

---

# 2. Battlefield Structure

The battlefield has only two positional states.

```
FRONT
BACK
```

Rules:

- Any number of units may occupy the same position.
- There is no slot grid.
- Position affects available actions.

Example:

- some attacks require FRONT position
- some abilities trigger only from BACK

---

# 3. Team Structure

Combat format:

```
3 vs 3
```

Each team also has:

```
1 reserve unit
```

Reserve unit enters if an active unit dies.

---

# 4. Turn Order System

Turn order is dynamic.

Each living unit is assigned an order indicator.

Displayed above the unit.

Example:

```
NOW
1
2
3
4
```

Meaning:

```
NOW = currently acting unit
1   = next unit
2   = second next unit
```

Rules:

- Turn indicators update immediately after every action.
- If an effect changes turn order, indicators update instantly.
- Dead units are removed from order.

---

# 5. Round Definition

A **round** is defined as:

> A cycle in which every living unit receives one action opportunity.

Important rules:

- An action opportunity counts even if the unit fails to act.
- If a unit cannot execute any action, the turn is still consumed.
- Units that die during the round are excluded from future turns.

Round ends when all living units have used their action opportunity.

---

# 6. Round Start Processing

When a new round begins:

1. determine all living units
2. reset `hasActedThisRound`
3. calculate new turn order
4. recharge hero intervention
5. process round-start status effects
6. update UI round indicator

---

# 7. Round End Processing

At round end:

1. reduce duration of temporary buffs/debuffs
2. resolve delayed effects
3. process death resolution
4. insert reserve units if needed
5. begin next round

---

# 8. Action Slots

Each unit has **3 action slots**.

```
slot 1 = highest priority
slot 2
slot 3
```

Action structure:

```
Condition → Action
```

Example:

```
1. IF position = FRONT → Attack
2. IF position = BACK → Move Forward
3. IF HP < 30% → Defend
```

---

# 9. Action Evaluation Logic

When a unit's turn begins:

Algorithm:

```
for action in actionSlots:
    if condition satisfied:
        execute action
        stop
if no action executed:
    turn lost
```

Only one action can execute.

---

# 10. Turn Lost

If no action condition is satisfied:

The unit loses the turn.

Rules:

- turn opportunity is consumed
- unit performs no action
- replay log records reason

Example replay event:

```
actor: Logan
result: TURN_LOST
reason: no valid action
```

Visual feedback should display briefly above the unit.

---

# 11. Action Conditions (MVP)

Allowed conditions:

```
POSITION_FRONT
POSITION_BACK
HP_BELOW_PERCENT
ALLY_HP_BELOW_PERCENT
ENEMY_IN_FRONT
ENEMY_IN_BACK
LOWEST_HP_ENEMY
FIRST_ACTION_THIS_ROUND
HAS_HERO_BUFF
```

Additional conditions may be added later.

---

# 12. Action Effects (MVP)

Available effects:

```
Attack
Defend (gain shield)
MoveForward
MoveBack
ChargeAttack
PushEnemy
Reposition
ApplyBuff
DelayTurn
AdvanceTurn
```

Effects must be deterministic.

---

# 13. Position Change Rules

Position change affects action availability.

Rules:

- units may move between FRONT and BACK
- position change happens immediately
- action condition checks always use current position

---

# 14. Charge / Push Interaction

Example charge behavior:

```
condition: actor in BACK

effect:
move actor to FRONT
deal damage
push target to BACK
```

Rules:

- if target already in BACK, push has no additional effect
- charge does not automatically change turn order

---

# 15. Unit Death

When HP ≤ 0:

Rules:

- unit dies immediately
- removed from turn order
- death event recorded in replay
- unit cannot act further this round

---

# 16. Reserve Unit Deployment

If an active unit dies:

```
reserve unit enters battle
```

Rules:

- reserve enters at BACK
- reserve cannot act in the current round
- reserve participates starting next round

---

# 17. Hero Intervention

Hero does not appear as a combat unit.

Instead hero may intervene.

Rule:

```
minimum 1 intervention per round
```

Intervention refreshes at round start.

---

# 18. Intervention Trigger

Intervention process:

1. player presses intervention button
2. choose hero ability
3. choose target
4. intervention is queued
5. ability triggers before the next unit action

This allows strategic timing.

---

# 19. Intervention UI State

Button states:

```
READY
USED
QUEUED
```

Reset to READY at round start.

---

# 20. Combat Tempo

Default pacing:

```
action animation: 0.6~0.8 sec
result delay: 0.2 sec
next action delay: 0.4~0.6 sec
```

Average cycle ≈ 1.2~1.5 seconds.

Replay supports:

```
pause
step forward
step backward
fast forward
```

---

# 21. Replay System

Combat events are recorded as a sequence.

Replay can reconstruct the battle.

Supported navigation:

```
play
pause
next tick
previous tick
jump to round
```

Each tick records:

```
actor
action
target
position change
damage
turn order changes
turn lost events
hero interventions
```

---

# 22. Victory Conditions

Battle ends when:

```
all enemy units dead
```

or

```
all player units dead
```

---

# 23. Battle Rewards

After battle:

Players receive rewards such as:

```
gold
temporary action rewards
new character chance
progress rewards
```

---

# 24. Character Training

Training occurs outside combat.

Rules:

- training consumes gold
- provides small permanent stat increases
- training does not modify action slots
- action slots remain fixed at 3 for standard characters

---

# 25. MVP Combat Scope

Initial implementation includes:

```
3 vs 3 combat
front/back positions
dynamic turn order
3 action slots
hero intervention
reserve unit deployment
combat replay
```

Focus is verifying **combat depth and clarity**.
