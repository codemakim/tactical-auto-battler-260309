# Hero System Spec

## 개요

영웅은 전투 유닛으로 참전하지 않는 **지휘관** 역할이다.
매 라운드 제한된 횟수만큼 개입하여 전장에 영향을 준다.

영웅의 능력은 두 계층으로 나뉜다:
- **공통 능력**: 모든 영웅이 공유하는 기본 능력 (액션 카드 편집)
- **특화 능력**: 영웅 유형별 고유 능력 (예: 버프, 직접 타격, 회복 등)

매 턴 공통 능력 또는 특화 능력 중 **하나만 선택**하여 사용한다.
둘 다 같은 개입 횟수 풀을 소모한다.

---

## §26. 개입 기본 규칙

combat-spec.md §17~§19를 기반으로 한다.

```
라운드당 개입 횟수: 1회 (기본값, GameConfig.heroInterventionsPerRound)
라운드 시작 시 충전
```

개입 프로세스 (§18):
1. 플레이어가 개입 버튼 클릭
2. 공통 능력 또는 특화 능력 선택
3. 대상 선택 (능력에 따라)
4. 개입이 큐잉됨
5. 다음 유닛 행동 직전에 발동

---

## §27. 공통 능력: 액션 카드 편집

### §27.1 개요

영웅의 핵심 공통 능력. 아군 유닛 1명의 액션 슬롯 1개를 새 액션 카드로 교체한다.

### §27.2 규칙

- 대상: **아군(PLAYER) 생존 유닛만** 편집 가능
- 범위: actionSlots[0~2] 중 하나 (유효 인덱스만)
- 교체 시 조건(condition)과 액션(action)을 함께 지정
- **전투 중 영구**: 교체된 슬롯은 해당 전투가 끝날 때까지 유지
- **전투 후 원복**: 전투 종료 시 모든 유닛의 actionSlots가 전투 시작 전 상태로 복원됨
- 개입 1회 소모

### §27.3 전투 시작 시 스냅샷

전투 시작(createBattleState) 시:
- 모든 유닛(전투 유닛 + 예비 유닛)의 현재 actionSlots를 `preBattleActionSlots`에 복사
- 이 스냅샷은 전투 종료 후 원복의 기준이 됨

### §27.4 전투 종료 후 원복

전투 종료(restorePreBattleActions) 시:
- 모든 유닛의 actionSlots를 preBattleActionSlots로 복원
- preBattleActionSlots 필드를 제거 (undefined)
- 예비 유닛도 동일하게 처리

### §27.5 설계 의도

시스템 폴백(자동 전진 등)을 두지 않는다.
편성 실수(예: 후열에서 행동 불가한 근접 유닛)는 **플레이어가 영웅 개입으로 직접 교정**한다.

- 교정에 개입 1회가 소모되므로 **기회비용**이 존재
- 잘 짠 편성 → 특화 능력에 개입을 투자 → 이득
- 허술한 편성 → 카드 수정에 개입을 소모 → 손해
- 전투 후 원복되므로, 유저는 다음 전투 전에 편성을 미리 개선하는 학습 루프가 형성됨

### §27.6 이벤트

- `ACTION_EDITED`: 액션 카드 편집 시 기록
  - `targetId`: 편집 대상 유닛 ID
  - `data.slotIndex`: 교체된 슬롯 번호
  - `data.newActionId`: 새 액션 ID
  - `data.newActionName`: 새 액션 이름
  - `data.newCondition`: 새 조건 타입

---

## §28. 특화 능력

영웅은 유형별로 고유한 특화 능력을 가진다.
공통 능력과 같은 개입 횟수 풀을 사용하므로, 매 턴 공통/특화 중 하나를 선택해야 한다.

### §28.1 능력 구조

각 능력은 두 축으로 분류된다:

- **AbilityCategory**: `COMMON` (공통) | `UNIQUE` (고유)
- **AbilityType**: `EFFECT` (즉시 효과) | `EDIT_ACTION` (액션 카드 편집)

모든 영웅은 COMMON + EDIT_ACTION 능력 1개를 공유하며, 유형별 UNIQUE + EFFECT 능력 2~3개를 추가로 보유한다.

### §28.2 영웅 유형별 특화 능력 (플레이스홀더)

| 영웅 유형 | 이름 | 능력 ID | 효과 |
|-----------|------|---------|------|
| COMMANDER | Rally | `commander_rally` | 아군 ATK_UP (3, 2라운드) |
| COMMANDER | Shield Order | `commander_shield_order` | 아군 실드 20 |
| MAGE | Fireball | `mage_fireball` | 적 데미지 (x1.5) |
| MAGE | Weaken | `mage_weaken` | 적 ATK_DOWN (3, 2라운드) |
| SUPPORT | Heal | `support_heal` | 아군 HP 15 회복 |
| SUPPORT | Haste | `support_haste` | 아군 턴 앞당김 |

### §28.3 큐잉 흐름

모든 능력(EFFECT, EDIT_ACTION)은 동일한 큐잉 흐름을 따른다:

1. `queueIntervention(state, ability, targetId?, editData?)` — 큐에 저장
2. `executeTurn()` 내부에서 `executeQueuedAbility()` 호출
3. `abilityType`에 따라 분기:
   - `EFFECT` → `executeIntervention()` 위임
   - `EDIT_ACTION` → `queuedEditData`로 `heroEditAction()` 실행

### §28.4 지원하는 효과 타입

`executeIntervention()`이 처리하는 ActionEffect 타입:

- `SHIELD` — 실드 부여
- `DAMAGE` — 직접 데미지 (히어로 기본 공격력 15 × multiplier)
- `PUSH` — 포지션 밀기
- `HEAL` — HP 회복
- `BUFF` — 버프 부여 (buffType, value, duration)
- `DEBUFF` — 디버프 부여
- `DELAY_TURN` — 턴 순서 뒤로 밀기
- `ADVANCE_TURN` — 턴 순서 앞으로 당기기

---

## 구현 위치

- `src/types/index.ts`: HeroType, AbilityCategory, AbilityType, QueuedEditData, HeroAbility, HeroState
- `src/data/HeroDefinitions.ts`: HERO_DEFINITIONS 레지스트리, COMMON_EDIT_ACTION, getHeroDefinition()
- `src/systems/HeroInterventionSystem.ts`: executeIntervention(), executeQueuedAbility(), heroEditAction()
- `src/systems/ActionCardSystem.ts`: resetBattleActions() — 전투 후 원복
- `src/core/BattleEngine.ts`: createBattleState() 스냅샷 + abilities 채우기, queueIntervention() + editData
- `src/core/RoundManager.ts`: executeTurn() 내 executeQueuedAbility() 호출
