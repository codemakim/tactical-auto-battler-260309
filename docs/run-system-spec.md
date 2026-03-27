# Tactical Auto Battler

## Run System Specification (MVP)

This document defines the run loop structure for the MVP.

A run is a sequence of battles with rewards and formation management between them.

---

# 1. Run Overview

A run consists of:

```
4 normal battles + 1 boss battle
```

The player progresses through stages, acquiring action cards and guest members along the way.

Run goal: defeat the boss at Stage 5.

---

# 2. Pre-Run Setup

## 2.1 Roster

The player has a persistent roster of characters.

```
Starting roster slots: 6
Expandable with gold (post-run)
```

## 2.2 Run Party Selection

Before starting a run, the player selects a party from their roster:

```
Party size: 4
```

All 4 members participate in combat.

These 4 characters and their current action slot configurations are **snapshotted** at run start.

## 2.3 Hero Selection

The player's hero is fixed for the run. Hero abilities do not grow during the run.

---

# 3. Run State

```
RunState {
  currentStage: number          // 1~5
  maxStages: number             // 5 (4 normal + 1 boss)
  seed: number                  // 결정론적 시드

  party: CharacterDefinition[]  // 출전 멤버 (4 combat)
  bench: CharacterDefinition[]  // 벤치 (객원 등, 출전하지 않는 캐릭터)
  cardInventory: CardInstance[] // 런 중 획득한 카드 인벤토리

  gold: number                  // 런 중 누적 골드
  retryAvailable: boolean       // 현재 스테이지 재도전 가능 여부

  status: 'IN_PROGRESS' | 'VICTORY' | 'DEFEAT'
}
```

---

# 4. Card Inventory System

## 4.1 Card Instance

Cards in the inventory are concrete instances generated from templates:

```
CardInstance {
  instanceId: string            // 고유 ID
  templateId: string            // 원본 템플릿 참조
  action: Action                // 확정된 액션 (multiplier, target 등 롤링 완료)
  classRestriction?: string     // 클래스 제한 (없으면 공용)
  rarity: Rarity
}
```

## 4.2 Slot Layer Structure

Each character slot has a layered structure:

```
Slot = Base Action (permanent, class-defined)
       └─ Override: CardInstance from inventory (optional)
```

Rules:

- **Equip**: Take a card from inventory → place on a slot → base action is hidden underneath
- **Unequip**: Remove the override card → card returns to inventory → base action is restored
- **Swap**: Replace one override with another → old card returns to inventory
- Base actions never enter the inventory. They are intrinsic to the character.

## 4.3 Class Filtering

When viewing equippable cards for a character in the formation UI:

- Show cards with matching `classRestriction`
- Show cards with no `classRestriction` (universal)
- Hide cards restricted to other classes

---

# 5. Run Flow

## 5.1 Stage Loop

```
for each stage (1 to 5):

  1. FORMATION PHASE
     - View/modify party composition (swap party ↔ bench)
     - View/modify action card assignments
     - Confirm ready

  2. BATTLE PHASE
     - All party members restored to full HP
     - Execute battle (existing combat engine)
     - Battle result: VICTORY or DEFEAT

  3. RESULT PHASE
     - If VICTORY → proceed to §5.2 Reward
     - If DEFEAT → proceed to §5.3 Retry

  4. REWARD PHASE (victory only)
     - Receive rewards (§6)
     - Return to stage loop (next stage)
```

## 5.2 Reward Phase

After a victory:

```
1. Gold reward (existing calculateGoldReward)
2. Card reward: 5 cards presented, pick 1 → added to cardInventory
3. Guest member chance (stages 2~4 only)
```

## 5.3 Retry on Defeat

```
First defeat at a stage:
  - retryAvailable = true → consume retry
  - Return to FORMATION PHASE (same stage)
  - Player can rearrange party and cards before retrying

Second defeat at the same stage:
  - Run ends with status DEFEAT
```

Retry resets per stage — clearing a stage restores retry availability.

Note: retry returns to FORMATION PHASE, not directly to battle. The player can adjust their strategy.

---

# 6. Reward Details

## 6.1 Gold

Calculated by existing `calculateGoldReward()`.

Gold accumulates across the run and is kept after run completion (win or lose).

## 6.2 Card Reward

5 cards are presented. The player picks 1.

Card generation pool:

```
For each living party member's class:
  - Add class-specific templates (weighted)
For all:
  - Add universal templates (lower weight)

Rarity roll applied per card.
Variant axes (multiplier, target) rolled from template.
```

The card display must clearly show:
- Whether the card is universal or class-restricted
- Which class it belongs to (if restricted)

Seed-based deterministic generation.

## 6.3 Guest Member

After certain stages (2~4), a guest character may appear:

```
- Probability-based (existing generateCharacterReward logic)
- Guest joins the bench (not auto-deployed)
- Guest is temporary: leaves when the run ends
- Guest can be moved to party via formation screen
```

Guests use the same `CharacterDefinition` structure but are tagged as temporary.

---

# 7. HP Between Battles

```
Full HP reset before every battle.
All units: HP restored to maxHp.
Dead units: revived at full HP.
Shield: cleared.
Buffs: cleared.
```

No HP carry-over between stages. Tension comes from increasing enemy difficulty, not resource attrition.

---

# 8. Run Completion

## 8.1 Victory

Boss (Stage 5) defeated.

```
- Gold earned during run is added to persistent gold
- All temporary cards are removed
- Guest members leave
- Original 4 party members return with their pre-run action slot configuration restored
```

## 8.2 Defeat

Second defeat at any stage.

```
- Gold earned during run is still kept (partial or full — TBD)
- All temporary cards are removed
- Guest members leave
- Original 4 party members return with pre-run configuration restored
```

## 8.3 Post-Run Restoration

At run end (victory or defeat):

```
1. Remove all CardInstance overrides from party member slots
   → base actions are automatically restored
2. Remove guest members from bench
3. cardInventory is cleared
4. Party members return to roster
```

---

# 9. Enemy Composition

Enemy composition per stage is defined in `enemy-encounter-spec.md`.

Summary (see enemy spec for full details):

```
Stage 1: Brute x2                                  (1 archetype, 2 enemies)
Stage 2: Brute x1 + Ranger x2                      (2 archetypes, 3 enemies)
Stage 3: Guard x1 + Ranger x2                      (2 archetypes, 3 enemies)
Stage 4: Disruptor x1 + Brute x2 or Ranger x2      (2 archetypes, 3 enemies, variant)
Stage 5: Boss Brute x1 + Guard x1 + Ranger x1      (3 archetypes, 3 enemies)
```

Enemy stats are derived from player class stat ranges × stage multiplier (§4 of enemy spec).

Each stage introduces at most one new enemy archetype. Enemy action sets are fixed per archetype (not randomized per run).

---

# 10. Gold Usage (Post-Run)

Gold earned from runs is spent outside of runs:

```
- Character training (existing TrainingSystem)
- Roster slot expansion (unlock slots beyond initial 6)
- Character acquisition (future — details TBD)
```

Gold is NOT spent during a run in MVP.

---

# 11. Stage Difficulty Scaling

Stat scaling multipliers are defined in `enemy-encounter-spec.md` §4.

Design intent per stage:

```
Stage 1: Introduction — winnable with base actions
Stage 2: Pressure — encourages first card optimization (new threat: Ranger)
Stage 3: Challenge — tests build coherence (new obstacle: Guard + COVER)
Stage 4: Gate — requires solid composition and cards (new threat: Disruptor + PUSH)
Stage 5: Boss — requires full preparation (all mechanics combined)
```

---

# 12. Constraints and Non-Goals (MVP)

Included:
- 5-stage run loop (4 normal + 1 boss)
- Card inventory with equip/unequip
- Formation screen (member swap + card management)
- Guest members (temporary)
- Full HP reset between battles
- Retry on first defeat per stage
- Gold accumulation

NOT included in MVP:
- Relics / artifacts
- Hero ability upgrades during run
- In-run shops or gold spending
- Multiple run paths or branching
- Difficulty selection per run (uses fixed scaling)
- Action card upgrades or fusion

---

# 13. Interaction with Existing Systems

## 13.1 BattleEngine

No changes needed. `createBattleState()` receives units as before.

## 13.2 ActionCardSystem

`replaceActionSlot()` is used during formation phase for equipping cards.
`resetRunActions()` is used at run end for restoration.

New: `generateRewardFromTemplates()` needs pool parameter change (party-wide class pool instead of single unit).

## 13.3 BattleRewardSystem

`generateBattleRewards()` needs refactoring:
- Accept full party class list instead of first surviving unit
- Generate from combined pool

`generateCharacterReward()` used as-is for guest member generation.

`applyReward()` simplified: card goes to inventory, not directly to unit slot.

## 13.4 HeroInterventionSystem

No changes. Hero state is initialized at run start, reset per battle as existing.

## 13.5 TrainingSystem

Used post-run. No interaction with run flow.
