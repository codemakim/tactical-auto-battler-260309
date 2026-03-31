# 런 결과 UI 스펙 (Run Result UI Specification)

> Source of Truth for 런 종료 요약 화면.
> `game-flow-spec.md §7`, `battle-result-ui-spec.md`, `reward-ui-spec.md`와 연결된다.

---

## §1. 목적

RunResultScene은 런의 마지막 장면이다.
이 화면은 단순 요약 패널이 아니라, 플레이어에게 다음 3가지를 분명히 전달해야 한다.

1. 이번 런이 `완주`였는지 `도중 종료`였는지
2. 이번 런에서 무엇을 얼마나 벌었는지
3. 런 상태가 정산되어 이제 Town 메타 루프로 돌아간다는 점

즉 이 화면은 전투/런 루프의 끝과 메타 루프의 재시작을 연결하는 브리지다.

---

## §2. 진입 조건

RunResultScene은 아래 경우에만 진입한다.

### §2.1 승리 종료
- 마지막 스테이지 승리 후 RewardScene에서 `CLAIM VICTORY`
- 이 경우 `runState.status === VICTORY`

### §2.2 패배 종료
- BattleScene에서 리트라이 불가 후 `런 종료`
- BattleScene에서 `포기`
- RunMapScene 또는 FormationScene에서 런 포기 확인
- 이 경우 `runState.status === DEFEAT`

### §2.3 진입 데이터

```typescript
interface SceneData {
  runState: RunState; // endRun 호출 전 최종 런 상태
}
```

진입 시점의 `runState`는 아직 정산 전 상태여야 한다.
즉 런 카드 인벤토리, 장착 카드, 런 골드가 남아 있어야 한다.
다만 이 값들 중 화면에 노출되는 것은 영속적으로 의미가 남는 정보만 사용한다.

---

## §3. 정산 시점

정산은 **RunResultScene 진입 직후 1회** 실행한다.

이렇게 고정하는 이유:
- 새로고침/세션 종료가 발생해도 런 골드가 유실되지 않게 하기 위해
- 결과 화면에서 다시 Town으로 나갈 때 중복 정산이 일어나지 않게 하기 위해
- 런 종료 화면을 "연출용 최종 보고서"로 만들고, 실제 상태는 이미 Town 기준으로 확정하기 위해

### §3.1 순서

```
1. Scene 진입
2. calculateRunResult(runState)로 표시 데이터 생성
3. finalizeRun(runState, gameState)로 영속 상태 반영
4. 결과 화면 렌더링
5. 플레이어가 Town으로 복귀
```

### §3.2 정산 책임

`finalizeRun()`은 아래만 담당한다.
- 런 골드를 영속 골드에 반영
- `endRun(runState)` 호출
- `gameState.setRunState(undefined)`로 활성 런 제거

중요:
- 전투 중 저장은 지원하지 않는다
- RunResultScene은 정산 이후 "현재 활성 런 없음" 상태를 전제로 한다

---

## §4. 결과 데이터 모델

### §4.1 MVP 표시 데이터

```typescript
interface RunResultData {
  victory: boolean;
  stagesCleared: number;
  maxStages: number;
  goldEarned: number;
}
```

### §4.2 필드 의미

- `victory`
  - 완주 여부
  - `runState.status === RunStatus.VICTORY`

- `stagesCleared`
  - 실제 클리어한 스테이지 수
  - 승리면 `maxStages`
  - 패배면 `max(0, currentStage - 1)`

- `maxStages`
  - 해당 런의 총 스테이지 수

- `goldEarned`
  - 런 중 누적 골드
  - Town 정산 전에 표시용으로 캡처

### §4.3 이번 스펙에서 제외

아래는 향후 확장 후보지만 현재 MVP에는 넣지 않는다.
- 전장 이름
- 사용 영웅 종류
- 런 중 획득 카드 수
- 스테이지별 로그
- 업적/최고기록 비교
- 전투 통계(총 피해량, 생존자 수 등)

이유:
- 현재 `RunState`에 안정적으로 집계된 값이 부족하거나
- 별도 집계 구조를 먼저 설계해야 하기 때문
- 특히 런 카드 인벤토리는 런 종료 시 폐기되는 임시 자원이므로, 최종 결과 화면에서 영구 보상처럼 표시하지 않는다

---

## §5. 순수 함수 레이어

### §5.1 calculateRunResult()

입력:
- `runState: RunState` (`endRun` 전 상태)

출력:
- `RunResultData`

로직:
1. `victory = runState.status === RunStatus.VICTORY`
2. `stagesCleared = victory ? runState.maxStages : max(0, runState.currentStage - 1)`
3. `maxStages = runState.maxStages`
4. `goldEarned = runState.gold`

### §5.2 finalizeRun()

입력:
- `runState: RunState`
- `gameState: GameStateManager`

출력:
- 없음

로직:
1. `gameState.addGold(runState.gold)`
2. `endRun(runState)`
3. `gameState.setRunState(undefined)`

주의:
- `finalizeRun()`은 계산용이 아니라 상태 반영용이다
- 화면 표시용 값은 반드시 `calculateRunResult()`에서 먼저 뽑아야 한다

---

## §6. UI 구조

RunResultScene은 게임다운 "작전 보고서" 톤으로 구성한다.
개발용 통계 패널처럼 단순 텍스트 3줄로 끝내지 않는다.

### §6.1 상단 헤더
- 상태 라벨: `RUN COMPLETE` 또는 `RUN FAILED`
- 메인 타이틀:
  - 승리: `OPERATION COMPLETE`
  - 패배: `SQUAD LOST`
- 서브카피:
  - 승리: 완주 보고 느낌의 짧은 문구
  - 패배: 후퇴/작전 종료 느낌의 짧은 문구

### §6.2 중앙 결과 패널
- 최소 표시 항목:
  - `STAGES`
  - `GOLD`
- 각 항목은 단순 문장보다 요약 카드/칩 또는 브리핑 블록에 가깝게 표현
- 숫자가 핵심이므로 수치 강조가 먼저 보이도록 배치
- 임시 런 카드나 객원 멤버는 결과 보상 블록으로 표시하지 않는다

### §6.3 하단 액션
- 기본 버튼 1개:
  - `RETURN TO TOWN`
- MVP에서는 추가 버튼 없음

### §6.4 레이아웃 원칙
- 중앙 정렬된 결과 보고서 구조
- 승리/패배에 따라 포인트 컬러만 바뀌고 레이아웃은 유지
- 텍스트는 짧고 게임 톤 유지
- `N / M 스테이지 클리어` 같은 설명문은 세부 텍스트나 보조 라벨로 내린다

---

## §7. Scene 전이

| 진입 출발점 | 조건 | 전달 |
|------|------|------|
| RewardScene | 마지막 스테이지 승리 | `{ runState }` |
| BattleScene | 패배 후 런 종료 | `{ runState }` |
| BattleScene | 포기 | `{ runState }` |
| RunMapScene | 런 포기 | `{ runState }` |
| FormationScene | 런 포기 | `{ runState }` |

| 나가기 | 대상 |
|--------|------|
| `RETURN TO TOWN` | `TownScene` |

---

## §8. 현재 구현과 목표 차이

현재 구현:
- 결과 타이틀 1줄
- 중앙 박스 안에 텍스트 3줄
- Town 복귀 버튼

보강 필요:
- 헤더 카피 게임화
- 결과 수치 블록화
- 승리/패배 시각 차등 강화
- 결과 화면 자체를 "작전 보고서" 톤으로 재디자인
- 임시 런 카드 수 표시 제거

즉 로직은 대체로 맞지만, 표현과 화면 책임은 아직 MVP 초반 수준이다.

---

## §9. 구현 범위 판단 기준

이 스펙 기준으로 다음 구현 작업은 아래를 목표로 삼는다.

1. `RunResultData`는 현재 필드 유지
2. 정산 시점은 Scene 진입 직후로 유지
3. UI는 "작전 보고서" 스타일로 리디자인
4. Town 복귀 전용 단일 액션 유지
5. 추가 통계나 기록 시스템은 이번 작업에서 제외

---

## §10. 의존성

- `endRun()` — [RunManager.ts](/Users/jhkim/Project/tactical-auto-battler/src/core/RunManager.ts)
- `gameState` — [GameState.ts](/Users/jhkim/Project/tactical-auto-battler/src/core/GameState.ts)
- `calculateRunResult()`, `finalizeRun()` — [RunResultCalculator.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/RunResultCalculator.ts)
- `RunState`, `RunStatus`, `RunResultData` — [index.ts](/Users/jhkim/Project/tactical-auto-battler/src/types/index.ts)
