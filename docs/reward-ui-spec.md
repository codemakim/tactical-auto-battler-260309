# 보상 UI 스펙 (Reward UI Specification)

> game-flow-spec.md §6-3 + run-system-spec.md §5.2/§6 기반.
> 전투 승리 후 보상 처리 화면. BattleScene 결과 오버레이에서 전이.

---

## §1. 개요

전투 승리 시 보상 처리를 담당하는 화면.
순서대로 세 단계를 거친다:

```
1. 골드 확정 표시
2. 카드 선택 (5장 → 1장 또는 건너뛰기)
3. 게스트 멤버 등장 시 수락/거절 (Stage 2~4만)
→ "다음 스테이지" 또는 "런 완료" 버튼
```

---

## §2. 보상 데이터 계산 (순수 함수 레이어)

### §2.1 RewardPhaseData 인터페이스

```typescript
interface RewardPhaseData {
  goldEarned: number;
  cardOptions: CardInstance[];     // 5장 (빈 배열 가능)
  guestReward: CharacterReward | null;  // Stage 2~4에서만 발생
  currentStage: number;
  maxStages: number;
  isLastStage: boolean;            // currentStage >= maxStages
}
```

### §2.2 calculateRewardPhase() 순수 함수

```
입력: runState: RunState, battleState: BattleState
출력: RewardPhaseData

로직:
1. processVictory(runState, battleState) 호출 → RewardResult
2. goldEarned = reward.gold
3. cardOptions = reward.cardOptions
4. guestReward = rewardResult.guestReward
5. currentStage / maxStages = runState 값
6. isLastStage = runState.currentStage >= runState.maxStages
```

### §2.3 applyRewardSelections() 순수 함수

```
입력: runState: RunState, selectedCard: CardInstance | null, acceptGuest: boolean
출력: RunState

로직:
1. selectedCard가 있으면 selectCardReward(runState, selectedCard)
2. acceptGuest=false이면 bench에서 게스트 제거 (processVictory가 이미 추가했으므로)
3. isLastStage면 advanceStage() (→ RunStatus.VICTORY + endRun)
4. 아니면 advanceStage() (→ 다음 스테이지)
```

---

## §3. UI 레이아웃

별도 Scene(`RewardScene`)으로 구현. BattleScene에서 전이.

### §3.1 골드 표시 (상단)
- 브리핑 바 안에 `Stage N / M`
- 중앙 대형 `+N GOLD`
- 서브카피: `TACTICAL SPOILS SECURED` / `FINAL CLEAR`

### §3.2 카드 선택 영역 (중앙)
- 5장 카드를 가로로 배치
- 상단 카피: `CHOOSE ONE TACTIC`
- 보조 카피: 전투 후 회수한 전술 카드라는 맥락 안내
- 각 카드 표시:
  - 카드 이름
  - 희귀도 (색상: COMMON=흰, RARE=파랑, EPIC=보라)
  - 클래스 제한 표시 (있으면 클래스명, 없으면 "공용")
  - 효과 요약 (첫 번째 효과의 type + multiplier)
- 카드 클릭 → 선택 상태 (하이라이트)
- 선택된 카드가 있을 때 `SECURE <카드명>` 버튼 활성화
- `PASS` 버튼으로 카드 미선택 허용

### §3.3 게스트 멤버 (카드 선택 아래, 존재 시만)
- 게스트 캐릭터 정보: 이름, 클래스, 주요 스탯
- "영입" / "거절" 버튼
- 영입 시 벤치에 추가됨 (processVictory에서 이미 처리)
- 거절 시 벤치에서 제거

### §3.4 하단 버튼
- 카드 선택 + 게스트 결정 완료 후:
  - 마지막 스테이지가 아니면: "다음 스테이지 →"
  - 마지막 스테이지면: "런 완료!" → RunResultScene (미구현 시 TownScene)

---

## §4. Scene 전이

| 진입 | BattleScene "보상 확인" 버튼 클릭 |
|------|----------------------------------|
| 전달 데이터 | runState, battleState (scene.start data) |

| 조건 | 버튼 | 전이 대상 |
|------|------|-----------|
| Stage < maxStages | "다음 스테이지" | FormationScene (`returnScene: RunMapScene` 전달 후 편성 완료 시 RunMap 복귀) |
| Stage = maxStages | "런 완료!" | RunResultScene |

---

## §5. 구현 범위

### 이번 작업:
1. `RewardPhaseData` 타입 (types/index.ts)
2. `calculateRewardPhase()`, `applyRewardSelections()` 순수 함수 (systems/RewardCalculator.ts)
3. 순수 함수 테스트 (높은 커버리지)
4. `RewardScene` (scenes/RewardScene.ts) — 카드 선택 + 게스트 + 전이
5. BattleScene "보상 확인" 버튼 → RewardScene 전이 연결

### 이번 작업에서 제외:
- 카드 애니메이션/연출
- RunResultScene (별도 스펙)

---

## §6. 의존성

- `processVictory()` — RunManager.ts (기존, 골드 + 카드 + 게스트 생성)
- `selectCardReward()` — RunManager.ts (기존, 카드 인벤토리 추가)
- `advanceStage()` — RunManager.ts (기존, 다음 스테이지 / 런 완료)
- `CardInstance`, `CharacterReward`, `RunState` — types/index.ts (기존)
- `gameState` — core/GameState.ts (runState 보관)
