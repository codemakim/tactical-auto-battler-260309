# 런 진행 맵 + 전투 인트로 스펙

> 런 중 UX 개선: 노드맵 허브 + 전투 시작 연출 + 자동 전투 기본화
>
> Status: Source of Truth
> `RunMapScene` 허브 구조와 `RunMapScene -> FormationScene -> RunMapScene`,
> `RewardScene -> RunMapScene` 전이는 이 문서를 기준으로 구현/수정한다.

---

## §1. 문제 정의

### 1-1. 전투 화면 조작 동선
- 전투 진입 시 자동 재생이 아닌 수동 버튼 클릭 필요
- 우측 하단(재생) → 상단 중앙(전투 관전) → 하단(영웅 개입) 시선 이동 부자연스러움
- "다음 턴" 버튼은 라이브 전투에서 불필요

### 1-2. 전투 간 흐름
- 보상 → 편성(할 일 없음) → 전투, 강제 일방통행
- 편성에 카드 장착 기능이 없어 경유 의미 없음
- 플레이어에게 선택권 부재

---

## §2. 런 진행 맵 (RunMapScene)

### §2.1 개요

런 중 **허브 역할**을 하는 노드맵 화면.
5개 스테이지를 노드로 표시하고, 현재 진행 상황을 시각화한다.

```
[1] ──── [2] ──── [3] ──── [4] ──── [★]
 ✓        ✓        ●
완료     완료     현재
```

### §2.2 노드 시각화

| 상태 | 표시 | 색상 |
|------|------|------|
| 완료 (승리) | ✓ 체크 | 회색 (0x888899) |
| 현재 (다음 전투) | ● 강조 | 금색 (0xffcc00), 펄스 |
| 미진행 | ○ 빈 원 | 어두운 회색 (0x444455) |
| 보스 (5번째) | ★ 별 | 미진행: 붉은색, 현재: 금색 |

- 노드 간 연결선: 완료 구간은 밝은 선, 미진행은 어두운 점선
- 현재 노드가 화면 중앙에 오도록 카메라/뷰 조정
- 각 노드 아래에 "Stage N" 라벨

### §2.3 하단 버튼

| 버튼 | 동작 | 조건 |
|------|------|------|
| **전투 시작** | 현재 스테이지 전투 진입 (BattleScene) | 항상 표시, primary 스타일 |
| **편성 수정** | FormationScene으로 이동 | 항상 표시, secondary 스타일 |
| **포기** | 런 포기 → RunResultScene | secondary, 확인 모달 |

### §2.4 전투 리플레이 (향후)

- 완료된 노드 클릭 → 리플레이 모드로 BattleScene 진입
- 이번 작업 범위 밖 (노드 클릭은 미구현, 추후 확장)

### §2.5 Scene 전이

| 진입 | 출발지 |
|------|--------|
| SortieScene "출격!" | 런 생성 후 첫 진입 |
| RewardScene "다음" | 보상 선택 후 |
| FormationScene "편성 완료" | 편성 수정 후 복귀 |

| 나가기 | 대상 |
|--------|------|
| "전투 시작" | BattleScene |
| "편성 수정" | FormationScene |
| "포기" | RunResultScene |

---

## §3. 전투 인트로 연출

### §3.1 시퀀스

전투 화면 진입 시 아래 순서로 연출:

```
[0.0s] 화면 전체 어둡게, 유닛/UI 표시
[0.3s] "BATTLE" 텍스트 페이드인 (화면 중앙, 큰 글씨)
[1.3s] "BATTLE" 페이드아웃
[1.5s] "START!" 텍스트 페이드인 (금색, 약간 확대 효과)
[2.3s] "START!" 페이드아웃
[2.5s] 자동 전투 시작 (doStep 루프)
```

- 인트로 중 모든 버튼 비활성화
- 인트로 완료 후 영웅 개입 버튼만 활성화

### §3.2 스킵

- 화면 아무 곳이나 클릭/탭 → 인트로 즉시 종료, 자동 전투 시작

---

## §4. 전투 화면 UI 개편

### §4.1 라이브 전투 모드 (기본)

전투 진입 시 기본 모드. 인트로 후 자동 전투가 바로 시작.

**하단 UI 구성:**
- **퇴각** (좌측) — 포기 확인 후 RunResultScene (기존과 동일하나 RunMapScene 경유 가능)
- **영웅 개입 (N)** (중앙, 크게) — 기존과 동일
- **배속** (우측) — 1x / 2x / 스킵 (향후 구현, 이번엔 1x 고정)

**제거/숨김:**
- "다음 턴 >" 버튼 — 라이브 전투에서 제거
- "▶ 자동 전투" 버튼 — 자동이 기본이므로 제거

### §4.2 자동 전투 타이밍

- 기존 1200ms → 유지 (§20 전투 템포에서 추후 조정 가능)
- 영웅 개입 시 자동 전투 일시정지 (기존 로직 유지)
- 개입 완료 후 자동 재개 (기존 로직 유지)

---

## §5. 변경되는 Scene 흐름

### 변경 전:
```
SortieScene → BattleScene → RewardScene → FormationScene → BattleScene → ...
```

### 변경 후:
```
SortieScene → RunMapScene → BattleScene → RewardScene → RunMapScene → ...
                  ↕                                          ↑
            FormationScene                                   │
                                                    (보상 후 자동 복귀)
```

- **RunMapScene**이 런 중 허브
- 편성은 RunMapScene에서 선택적으로 진입
- RewardScene 후 RunMapScene으로 복귀 (FormationScene 강제 경유 제거)

---

## §6. 순수 함수

### §6.1 노드 상태 계산

```typescript
interface StageNodeState {
  stage: number;
  status: 'COMPLETED' | 'CURRENT' | 'UPCOMING' | 'BOSS_UPCOMING' | 'BOSS_CURRENT';
}

function calculateStageNodes(runState: RunState): StageNodeState[]
```

입력: RunState (currentStage, maxStages, status)
출력: 각 스테이지의 노드 상태 배열

로직:
- stage < currentStage → COMPLETED
- stage === currentStage → CURRENT (또는 BOSS_CURRENT if stage === maxStages)
- stage > currentStage && stage === maxStages → BOSS_UPCOMING
- stage > currentStage → UPCOMING

---

## §7. 구현 범위

### 이번 작업:
1. `StageNodeState` 타입 (types/index.ts)
2. `calculateStageNodes()` 순수 함수 (systems/RunMapCalculator.ts)
3. 순수 함수 테스트
4. `RunMapScene` (scenes/RunMapScene.ts) — 노드맵 + 버튼
5. 전투 인트로 연출 (BattleScene 내 playIntro 메서드)
6. BattleScene 하단 UI 개편 — "다음 턴"/"자동 전투" 제거, 자동 전투 기본
7. Scene 전이 수정:
   - SortieScene → RunMapScene (BattleScene 대신)
   - RewardScene → RunMapScene (FormationScene 대신)
   - FormationScene "편성 완료" (런 중) → RunMapScene (BattleScene 대신)
   - RunMapScene "전투 시작" → BattleScene
   - RunMapScene "편성 수정" → FormationScene
   - RunMapScene "포기" → RunResultScene
8. main.ts에 RunMapScene 등록

### 기존 유지:
- 영웅 개입 UI (이전 작업에서 완료)
- BattleScene 전투 로직 (엔진 그대로)
- RewardScene 카드/게스트 선택 (그대로)

### 향후:
- 완료 노드 클릭 → 리플레이
- 배속 조절 (1x / 2x / 스킵)
- 전투 템포 세부 조정 (§20)

---

## §8. 의존성

- `RunState` — types/index.ts (currentStage, maxStages, status)
- `UIButton`, `UITheme` — ui/ (기존)
- `UIModal` — ui/ (포기 확인용)
- `gameState` — core/GameState.ts (runState 접근)
