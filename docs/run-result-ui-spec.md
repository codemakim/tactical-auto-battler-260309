# 런 결과 UI 스펙 (Run Result UI Specification)

> game-flow-spec.md §7 기반.
> 런 전체 결과를 요약하고 Town으로 복귀하는 화면.

---

## §1. 개요

런이 종료되면(승리 또는 패배) RunResultScene에서 결과를 요약 표시한다.
이 화면은 런의 최종 성과를 보여주고, 골드를 영속 자원에 반영한 뒤 마을로 복귀시킨다.

---

## §2. 순수 함수 레이어

### §2.1 RunResultData 인터페이스

```typescript
interface RunResultData {
  victory: boolean;
  stagesCleared: number;    // 클리어한 스테이지 수
  maxStages: number;
  goldEarned: number;       // 런 중 획득한 총 골드
  cardsAcquired: number;    // 런 중 획득한 카드 수
}
```

### §2.2 calculateRunResult() 순수 함수

```
입력: runState: RunState (endRun 호출 전 상태)
출력: RunResultData

로직:
1. victory = runState.status === RunStatus.VICTORY
2. stagesCleared = victory ? maxStages : currentStage - 1
   (현재 스테이지에서 패배했으므로 클리어한 건 이전까지)
3. maxStages = runState.maxStages
4. goldEarned = runState.gold
5. cardsAcquired = runState.cardInventory.length
```

### §2.3 finalizeRun() — 런 정산 + 영속 반영

```
입력: runState: RunState, gameState: GameStateManager
출력: void (gameState에 직접 반영)

로직:
1. 골드 반영: gameState.addGold(runState.gold)
2. 런 종료: endRun(runState) → 파티 복원, 인벤토리 초기화
3. gameState.setRunState(undefined) — 런 상태 제거
```

주의: endRun()은 RunManager에 이미 있음. finalizeRun()은 gameState와의 연결만 담당.

---

## §3. UI 레이아웃

별도 Scene(`RunResultScene`).

### §3.1 결과 타이틀 (상단)
- "런 완료!" (금색) 또는 "런 실패" (붉은색)

### §3.2 성과 요약 (중앙)
- 클리어 스테이지: "N / M 스테이지 클리어"
- 획득 골드: "+N Gold"
- 획득 카드: "N장 획득" (런 중 선택한 카드 수)

### §3.3 하단 버튼
- "마을로 돌아가기" → TownScene

---

## §4. Scene 전이

| 진입 | 조건 |
|------|------|
| RewardScene "런 완료!" | 5스테이지 클리어 시 |
| BattleScene "런 종료" / "포기" | 패배 시 |

| 나가기 | 대상 |
|--------|------|
| "마을로 돌아가기" | TownScene |

진입 시 전달 데이터: `{ runState }` (endRun 호출 전 상태)

---

## §5. 구현 범위

### 이번 작업:
1. `RunResultData` 타입 (types/index.ts)
2. `calculateRunResult()`, `finalizeRun()` 순수 함수 (systems/RunResultCalculator.ts)
3. 순수 함수 테스트
4. `RunResultScene` (scenes/RunResultScene.ts)
5. 기존 Scene 전이 수정 — RewardScene, BattleScene에서 RunResultScene으로 전이
6. main.ts에 RunResultScene 등록

---

## §6. 의존성

- `endRun()` — RunManager.ts (기존)
- `gameState` — GameState.ts (골드 반영, runState 제거)
- `RunState`, `RunStatus` — types/index.ts (기존)
