# 런 루프 연결 스펙 (Run Loop Wiring Specification)

> game-flow-spec.md §6 + run-system-spec.md §5 기반.
> 개별 Scene들을 5스테이지 런 루프로 연결하는 배선 작업.
>
> Status: Partially Superseded
> Scene 전이 중 `RunMapScene` 허브, `RewardScene -> RunMapScene`,
> `FormationScene -> RunMapScene` 흐름은
> [docs/run-map-and-battle-intro-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/run-map-and-battle-intro-spec.md)가 최신 기준이다.
> 이 문서는 런 초기화/전투 생성 배선과 일부 흐름 설명 참고용으로 유지한다.

---

## §1. 개요

현재 개별 Scene(Sortie, Battle, Reward, Formation)과 순수 함수(RunManager)는 구현되어 있으나,
**런이라는 컨텍스트 안에서 순환하는 흐름**이 약하다.

현재 기준 흐름은 `RunMapScene`을 런 허브로 두는 구조다.
이 문서는 런 초기화와 전투 상태 생성 배선을 설명하고,
최신 Scene 전이 기준은 `run-map-and-battle-intro-spec.md`를 따른다.

현재 기준 흐름:

```
SortieScene ──[런 생성]──→ RunMapScene ──[전투 시작]──→ BattleScene
                               ↑                           │
                               │                           │
                               │                    [승리] ↓
                         FormationScene ←──────── RewardScene
                               │                           │
                               └────[편성 완료]────────────┘

[패배+리트라이] BattleScene → FormationScene (같은 스테이지)
[패배+종료]    BattleScene → RunResultScene
[런 완료]      BattleScene → RunResultScene
```

---

## §2. 순수 함수 레이어

### §2.1 createRunFromFormation() — 런 초기화

```
입력: gameState (formation, characters)
출력: RunState

로직:
1. formation.slots에서 characterId → CharacterDefinition 매핑
2. formation.reserveId가 있으면 4번째 파티원으로 추가
3. createRunState(party, seed) 호출
4. 반환된 RunState를 gameState.setRunState()로 저장
```

### §2.2 initBattleFromRun() — 런 전투 초기화

```
입력: runState: RunState, heroType: HeroType
출력: BattleState

로직:
1. 파티 → BattleUnit 변환 (createUnit)
2. runState.equippedCards 적용 (카드 오버라이드)
3. 적 생성 (generateEncounter(runState.currentStage, seed))
4. createBattleState() 호출
5. 풀 HP 리셋 (run-system-spec §7: 매 전투 시작 시 풀 HP)
```

이미 RunManager.executeStageBattle()에 대부분 있으나, Scene 통합에 필요한 형태로 분리.
실제로는 executeStageBattle()이 runFullBattle()까지 실행하므로,
Scene용으로는 **BattleState만 생성하고 stepBattle은 Scene이 수행**해야 한다.

→ 새 함수 `createStageBattleState(runState, heroType): BattleState` 필요.

---

## §3. Scene 배선 변경

### §3.1 SortieScene — 런 시작

현재 기준:
`SortieScene`은 런 생성 후 `RunMapScene`으로 진입한다.

변경:
```
1. formation에서 파티 추출
2. createRunState(party, seed) 호출
3. gameState.setRunState(runState) 저장
4. scene.start('RunMapScene')
```

### §3.2 BattleScene — 런 모드 전투

현재: `initBattle()`에서 gameState.formation 직접 읽어 독립 전투 실행

변경:
```
initBattle():
  if (gameState.runState 존재):
    → createStageBattleState(runState, heroType)로 BattleState 생성
    → stepBattle 루프는 기존과 동일
  else:
    → 기존 독립 전투 로직 (폴백)
```

### §3.3 FormationScene — 런 중 편성

현재 기준:
- 일반 편성: "편성 완료" → TownScene
- 런 중 편성: "편성 완료" → RunMapScene
- 패배 후 재도전 편성: "재도전 출격!" → RunMapScene

변경:
```
"편성 완료" 버튼:
  if (runState 존재 && returnScene === 'RunMapScene'):
    → scene.start('RunMapScene')
  else:
    → scene.start('TownScene')

"재도전 출격!" 버튼:
  if (isRetry):
    → scene.start('RunMapScene')
```

---

## §4. 구현 범위

### 이번 작업:
1. `createStageBattleState()` 순수 함수 (RunManager.ts에 추가)
2. 순수 함수 테스트
3. SortieScene 배선 — 런 생성 + RunMapScene 전이
4. BattleScene 배선 — runState 기반 전투 초기화
5. FormationScene 배선 — 런 중이면 RunMapScene으로 복귀

### 이번 작업에서 제외:
- RunResultScene (별도 스펙)
- 전투 애니메이션/템포
- 런 중 편성 UI 고도화 (카드 장착/해제)

---

## §5. 의존성

- `createRunState()` — RunManager.ts (기존)
- `createBattleState()` — BattleEngine.ts (기존)
- `createUnit()` — UnitFactory.ts (기존)
- `generateEncounter()` — EnemyGenerator.ts (기존)
- `gameState.runState` — GameState.ts (기존)
