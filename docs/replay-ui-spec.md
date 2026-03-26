# 리플레이 UI 스펙 (Replay UI Specification)

> combat-spec.md §21 기반. 전투 종료 후 전투 과정을 틱 단위로 되돌려 볼 수 있는 시스템.

---

## §1. 개요

전투가 끝나면 결과 패널에 **"리플레이"** 버튼이 표시된다. 클릭하면 ReplayScene으로 전환되어 전투 과정을 처음부터 틱 단위로 탐색할 수 있다.

- **틱(Tick)**: 유닛 1명이 행동하는 단위. BattleScene의 `doStep()` 1회 = 1틱.
- 틱 0은 전투 시작 직후(첫 유닛 행동 전) 초기 상태.
- 모든 탐색은 즉시 반영 (애니메이션 없음).

---

## §2. 데이터 모델

### TickSnapshot

매 틱마다 캡처되는 전투 상태 스냅샷.

| 필드 | 타입 | 설명 |
|------|------|------|
| tickIndex | number | 0-based 순차 인덱스 |
| round | number | 현재 라운드 |
| turn | number | 현재 턴 |
| phase | BattlePhase | 전투 페이즈 |
| units | BattleUnit[] | 모든 유닛 상태 (deep copy) |
| turnOrder | string[] | 턴 순서 (unit id 배열) |
| events | BattleEvent[] | 이 틱에서 발생한 새 이벤트만 |
| hero | HeroState | 영웅 상태 |
| delayedEffects | DelayedEffect[] | 지연 효과 목록 |

### ReplaySessionData

BattleScene → ReplayScene으로 전달되는 데이터.

| 필드 | 타입 | 설명 |
|------|------|------|
| snapshots | TickSnapshot[] | 전체 틱 스냅샷 배열 |
| totalRounds | number | 전투 총 라운드 수 |
| winner | Team \| null | 승자 |

---

## §3. 스냅샷 수집

BattleScene에서 전투 진행 중 자동 수집:

1. **틱 0**: `advanceToFirstTurn()` 완료 직후, 첫 유닛 행동 전 상태 캡처.
2. **틱 1~N**: `doStep()` 실행 후 매번 상태 캡처. 해당 틱에서 발생한 새 이벤트를 함께 저장.
3. 전투 종료 시 최종 스냅샷 포함.

스냅샷은 **deep copy**여야 한다 (원본 BattleState 변이와 무관하게 보존).

---

## §4. 리플레이 네비게이션

### ReplayState (순수 상태)

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| snapshots | TickSnapshot[] | - | 전체 스냅샷 |
| currentTick | number | 0 | 현재 보고 있는 틱 인덱스 |
| playing | boolean | false | 자동 재생 중 여부 |
| playbackSpeed | number | 1 | 재생 배속 (1, 2) |

### 네비게이션 함수 (순수 함수)

| 함수 | 동작 |
|------|------|
| `nextTick(state)` | currentTick + 1. 끝이면 playing = false로 전환. |
| `prevTick(state)` | currentTick - 1. 최소 0. |
| `jumpToTick(state, tick)` | 지정 틱으로 이동. 범위 클램핑. |
| `jumpToRound(state, round)` | 해당 라운드 첫 번째 틱으로 이동. 없으면 가장 가까운 라운드. |
| `togglePlay(state)` | playing 토글. |
| `setSpeed(state, speed)` | playbackSpeed 변경. |
| `getCurrentSnapshot(state)` | 현재 틱의 TickSnapshot 반환. |
| `isAtStart(state)` | currentTick === 0 |
| `isAtEnd(state)` | currentTick === snapshots.length - 1 |
| `getRoundList(state)` | 고유 라운드 번호 정렬 배열. |
| `getTicksForRound(state, round)` | 해당 라운드의 틱 인덱스 배열. |

---

## §5. ReplayScene 레이아웃

```
+---------------------------------------------------+
| Round N    Tick M / Total              [마을로]    |  상단 바
+---------------------------------------------------+
|                                                   |
|  [BACK]  [FRONT]  |  [FRONT]  [BACK]             |  유닛 시각화
|   아군     아군    |    적군     적군              |  (BattleScene과 동일 구조)
|                                                   |
+---------------------------------------------------+
| 이벤트: "Warrior가 Brute에게 45 데미지"            |  이벤트 로그
+---------------------------------------------------+
| [|◀] [◀]  [▶ / ⏸]  [▶] [▶|]    [1x] [2x]       |  컨트롤 바
| [라운드: 1  2  3  4  5]                           |  라운드 점프
+---------------------------------------------------+
```

### §5.1 상단 바

- 왼쪽: "Round N" + "Tick M / Total"
- 오른쪽: "마을로" 버튼 (ReplayScene 종료 → TownScene)

### §5.2 유닛 시각화 영역

BattleScene과 동일한 4열 구조 (PLAYER_BACK, PLAYER_FRONT, ENEMY_FRONT, ENEMY_BACK).
- 유닛 사각형 + 이름 + HP 바 + 실드 바
- 사망 유닛은 반투명(alpha 0.3) 처리
- 턴 배지: 현재 스냅샷의 turnOrder 기반 NOW / 1 / 2 / ... 표시
- 애니메이션 없음 — 틱 전환 시 즉시 갱신

### §5.3 이벤트 로그

현재 틱의 이벤트를 텍스트로 표시. 주요 이벤트만 1~2줄 요약:
- ACTION_EXECUTED: "{유닛명}이(가) {액션명} 사용"
- DAMAGE_DEALT: "{타겟}에게 {값} 데미지"
- HEAL_APPLIED: "{타겟} {값} 회복"
- SHIELD_APPLIED: "{타겟} 실드 {값}"
- UNIT_DIED: "{유닛명} 전사"
- HERO_INTERVENTION: "영웅 개입: {능력명}"
- ROUND_START: "라운드 {N} 시작"
- BATTLE_END: "전투 종료"
- 틱 0 (이벤트 없음): "전투 시작 상태"

### §5.4 컨트롤 바

5개 네비게이션 버튼 + 속도 버튼:

| 버튼 | 동작 | 비활성 조건 |
|------|------|------------|
| \|◀ (처음) | jumpToTick(0) | isAtStart |
| ◀ (이전) | prevTick | isAtStart |
| ▶/⏸ (재생/일시정지) | togglePlay | - |
| ▶ (다음) | nextTick | isAtEnd |
| ▶\| (끝) | jumpToTick(max) | isAtEnd |
| 1x / 2x | setSpeed(1) / setSpeed(2) | 현재 속도면 하이라이트 |

### §5.5 라운드 점프

라운드 번호 버튼 가로 나열. 클릭 시 `jumpToRound(N)`.
현재 라운드의 버튼은 하이라이트 표시.

---

## §6. 자동 재생

- ▶ 버튼으로 자동 재생 시작.
- 재생 간격: `1200ms / playbackSpeed`.
- 마지막 틱 도달 시 자동 정지 (playing = false).
- ⏸ 버튼으로 일시 정지.
- 재생 중 ◀/▶ 수동 조작 시 자동 정지.

---

## §7. 진입 / 퇴장

### 진입
- BattleScene 전투 종료 패널에 "리플레이" 버튼 추가.
- 클릭 시 `this.scene.start('ReplayScene', { replayData: ReplaySessionData })`.

### 퇴장
- "마을로" 버튼 → TownScene (런 상태에 따라 적절한 다음 화면으로).
- 또는 전투 결과 화면으로 복귀할 수도 있으나, MVP에서는 마을 복귀로 단순화.
