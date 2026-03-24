# 전투 결과 UI 스펙 (Battle Result UI Specification)

> game-flow-spec.md §6-2 기반. BattleScene 내 오버레이로 표시.

---

## §1. 개요

전투가 끝나면(`isFinished === true`) BattleScene 위에 **결과 오버레이**가 표시된다.
결과 오버레이는 전투 요약을 보여주고, 다음 단계로의 전이를 담당한다.

전투는 **두 가지 컨텍스트**에서 발생한다:
1. **런 내 전투** — RunState가 존재하며, 승리 시 보상 → 다음 스테이지, 패배 시 리트라이/런 종료
2. **독립 전투** (향후) — RunState 없이 단독 전투, 결과 후 마을 복귀

MVP에서는 런 내 전투만 지원한다.

---

## §2. 결과 데이터 계산 (순수 함수 레이어)

BattleScene은 Phaser에 의존하므로 직접 테스트가 어렵다.
따라서 **결과 데이터 계산을 순수 함수로 분리**하여 테스트 가능하게 한다.

### §2.1 BattleResultData 인터페이스

```typescript
interface BattleResultData {
  victory: boolean;
  roundsElapsed: number;
  survivingAllies: SurvivorInfo[];
  fallenAllies: SurvivorInfo[];
  goldEarned: number;
  // 패배 시
  canRetry: boolean;       // runState.retryAvailable
  // 런 컨텍스트
  currentStage: number;
  maxStages: number;
}

interface SurvivorInfo {
  name: string;
  characterClass: string;
  currentHp: number;
  maxHp: number;
}
```

### §2.2 calculateBattleResult() 순수 함수

```
입력: battleState: BattleState, runState: RunState, difficulty: Difficulty
출력: BattleResultData

로직:
1. victory = battleState.winner === Team.PLAYER
2. roundsElapsed = battleState.round
3. survivingAllies = PLAYER 팀 중 isAlive === true인 유닛 정보
4. fallenAllies = PLAYER 팀 중 isAlive === false인 유닛 정보
5. goldEarned = calculateGoldReward(battleState, difficulty)
6. canRetry = !victory && runState.retryAvailable
7. currentStage = runState.currentStage
8. maxStages = runState.maxStages
```

---

## §3. UI 레이아웃

결과 오버레이는 BattleScene 위에 depth 100+ 로 표시된다.

### §3.1 공통 요소
- **딤 배경**: 전체 화면 반투명 검정 (클릭 방지)
- **결과 타이틀**: "승리!" (금색) 또는 "패배..." (붉은색)
- **라운드 정보**: "라운드 N 클리어" 또는 "라운드 N에서 패배"
- **스테이지 표시**: "Stage N / M"

### §3.2 유닛 생존 현황
- 아군 유닛 목록 (이름 + 클래스 + HP 바)
- 생존 유닛: HP 바 표시 (현재/최대)
- 전사 유닛: 회색 처리 + "전사" 표시

### §3.3 골드 획득
- 획득 골드 표시: "+N Gold"

### §3.4 하단 버튼

**승리 시:**
- "보상 확인" 버튼 → 보상 화면(§6-3)으로 전이

**패배 시 (리트라이 가능):**
- "재도전" 버튼 → 편성 화면으로 전이 (같은 스테이지)
- "포기" 버튼 → 런 종료 → 런 결과 화면

**패배 시 (리트라이 불가):**
- "런 종료" 버튼 → 런 종료 → 런 결과 화면

---

## §4. Scene 전이

| 조건 | 버튼 | 전이 대상 | 데이터 전달 |
|------|------|-----------|------------|
| 승리 | "보상 확인" | 보상 화면 (MVP: 다음 스펙에서 정의) | runState, battleState |
| 패배 + 리트라이 가능 | "재도전" | FormationScene (같은 스테이지) | runState (retryAvailable 소모) |
| 패배 + 리트라이 불가 | "런 종료" | RunResultScene | runState (DEFEAT) |
| 패배 + 포기 | "포기" | RunResultScene | runState (DEFEAT) |

---

## §5. 구현 범위

### 이번 작업에서 구현:
1. `BattleResultData` 타입 정의
2. `calculateBattleResult()` 순수 함수 (src/systems/BattleResultCalculator.ts)
3. 순수 함수에 대한 테스트 (높은 커버리지)
4. BattleScene.onBattleEnd() 리팩토링 — 순수 함수 결과로 오버레이 렌더링

### 이번 작업에서 제외 (후속 작업):
- 보상 화면 (§6-3) — 다음 스펙
- RunResultScene — 별도 스펙
- 전투 애니메이션/템포 (§20)

---

## §6. 의존성

- `calculateGoldReward()` — BattleRewardSystem.ts (기존)
- `processDefeat()` — RunManager.ts (기존)
- `RunState`, `BattleState` — types/index.ts (기존)
- `GameState` — core/GameState.ts (런 상태 보관)
