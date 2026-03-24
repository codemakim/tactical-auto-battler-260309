# 영웅 개입 UI 상태 렌더링 스펙

> combat-impl-checklist.md §17~§19 보완.
> 영웅 개입 버튼의 시각적 상태 전환을 명확히 정의한다.

---

## §1. 개요

영웅 개입 기능은 이미 동작하지만, UI에서 현재 상태(사용 가능 / 큐잉됨 / 사용 완료)를
시각적으로 구분하지 않는다. 이 스펙은 버튼의 상태 전환 규칙과 렌더링을 정의한다.

---

## §2. 상태 정의

### §2.1 HeroButtonState

```typescript
type HeroButtonState = 'READY' | 'QUEUED' | 'USED' | 'TARGETING' | 'DISABLED';
```

| 상태 | 조건 | 설명 |
|------|------|------|
| READY | `canIntervene() && !queuedAbility` | 사용 가능, 클릭하면 능력 패널 열림 |
| QUEUED | `queuedAbility !== undefined` | 능력이 큐잉됨, 다음 턴에 자동 발동 |
| USED | `interventionsRemaining === 0 && !queuedAbility` | 이번 라운드 개입 완료 |
| TARGETING | Scene 내부 targetMode 플래그 | 타겟 선택 중 (기존 구현) |
| DISABLED | `isFinished` | 전투 종료 |

### §2.2 순수 함수

```
getHeroButtonState(hero: HeroState, isFinished: boolean, isTargeting: boolean): HeroButtonState

로직:
1. isFinished → DISABLED
2. isTargeting → TARGETING
3. hero.queuedAbility !== undefined → QUEUED
4. hero.interventionsRemaining > 0 → READY
5. else → USED
```

---

## §3. 버튼 렌더링

### §3.1 READY 상태
- 라벨: `"영웅 개입 (N)"` (N = interventionsRemaining)
- 스타일: primary (기존과 동일)
- 클릭: 능력 패널 열림

### §3.2 QUEUED 상태
- 라벨: `"[능력명] 대기중"`
- 스타일: 금색 테두리 강조 (borderColor: 0xffcc00)
- 펄스 애니메이션: 밝기 0.8 ↔ 1.0 반복 (500ms 주기)
- 클릭: 큐 취소 (queuedAbility 제거) → READY로 복귀

### §3.3 USED 상태
- 라벨: `"개입 완료"`
- 스타일: 비활성 (btnDisabled)
- 클릭: 불가

### §3.4 TARGETING 상태
- 라벨: `"취소"` (기존 구현)
- 스타일: secondary
- 클릭: 타겟 선택 취소

### §3.5 DISABLED 상태
- 라벨: `"영웅 개입"` (횟수 표시 없음)
- 스타일: 비활성
- 클릭: 불가

---

## §4. 상태 전이 흐름

```
[라운드 시작] → READY
    ↓ (버튼 클릭)
[능력 패널] → 능력 선택 → TARGETING → 타겟 선택 → QUEUED
    ↓ (다음 턴 진행 = doStep)
[개입 발동] → USED (interventionsRemaining === 0이면)
           → READY (interventionsRemaining > 0이면, 향후 확장용)
    ↓
[라운드 종료 → 다음 라운드 시작] → READY (충전)
```

QUEUED 상태에서 버튼 클릭 시:
- queuedAbility 제거 (큐 취소)
- interventionsRemaining 복원 (차감 전이므로 변경 없음)
- READY로 복귀

---

## §5. 큐 취소 로직

현재 `queueIntervention()`은 `interventionsRemaining`을 차감하지 않는다
(차감은 `executeIntervention()` 시점). 따라서 큐 취소는:

```
cancelQueuedIntervention(state: BattleState): BattleState
→ hero.queuedAbility = undefined
→ hero.queuedTargetId = undefined
→ hero.queuedEditData = undefined
```

순수 함수로 구현. 횟수 복원 불필요 (아직 차감 안 됨).

---

## §6. 구현 범위

### 이번 작업:
1. `HeroButtonState` 타입 (types/index.ts)
2. `getHeroButtonState()` 순수 함수 (systems/HeroInterventionSystem.ts)
3. `cancelQueuedIntervention()` 순수 함수 (systems/HeroInterventionSystem.ts)
4. 순수 함수 테스트
5. BattleScene 버튼 렌더링 업데이트 (상태별 라벨/스타일/애니메이션)
6. BattleScene QUEUED 클릭 → 큐 취소

### 기존 유지:
- TARGETING 상태 처리 (이미 구현됨)
- HERO_INTERVENTION 이벤트 토스트 (이미 구현됨)

---

## §7. 의존성

- `HeroState` — types/index.ts (기존)
- `canIntervene()` — HeroInterventionSystem.ts (기존, 내부 참조 가능)
- `UIButton` — ui/UIButton.ts (기존, 스타일 커스터마이징 필요할 수 있음)
