# 전장 진행 시스템 스펙 (Battlefield Progression Specification)

> Draft
> 여러 전장을 선택할 수 있는 구조를 실제 메타 진행 시스템으로 바꾸기 위한 MVP 스펙.
> 현재 `SortieScene`의 전장 선택 UI와 `RunState.battlefieldId`를
> 저장/해금/적 구성 데이터와 연결하는 기준 문서다.

---

## §1. 목적

현재 전장 선택은 UI 선택에 가깝고, 실제 게임 차이는 일부 배경 연결밖에 없다.

이 작업의 목적은 아래 3가지를 완성하는 것이다.

1. 전장 선택이 실제 런 데이터 분기를 만든다
2. 전장 클리어가 메타 진행(해금/기록)에 반영된다
3. 나중에 전장 수가 늘어나도 코드 구조를 크게 바꾸지 않도록 한다

이 스펙은 **전장 확장 가능한 데이터 구조**를 먼저 잡는 데 집중한다.

---

## §2. MVP 범위

### §2.1 이번 작업에 포함

- 전장 정의를 공용 데이터 레지스트리로 관리
- `RunState.battlefieldId` 기반으로 런 내부 데이터가 분기
- 전장별:
  - 이름
  - 테마
  - 난이도
  - 적 편성 세트
  - 잠금 조건
  - 전투 배경 키
  를 하나의 데이터 소스에서 관리
- 영속 저장되는 전장 진행 상태 추가
- 첫 클리어 기반 해금
- `SortieScene`에서 실제 잠금/해금 상태 반영
- 런 종료 시 전장 클리어 기록 갱신

### §2.2 이번 작업에서 제외

- 전장별 고유 전투 규칙
- 전장별 보상 테이블 차등
- 전장별 상점/경제 규칙
- 스토리/대사/이벤트
- 썸네일, 컷신, 별도 브리핑 연출
- 다중 세이브 슬롯 기준의 전장 기록 비교

---

## §3. 핵심 원칙

### §3.1 전장은 데이터 우선

전장 차이는 Scene if/else로 흩어지지 않고,
공용 전장 레지스트리에서 읽어야 한다.

즉:
- `SortieScene`은 전장 데이터를 표시
- `RunManager`는 선택된 전장의 런을 생성
- `EnemyGenerator`는 전장 데이터 기준으로 적 편성 생성
- `BattleScene`은 전장 배경 키만 사용

### §3.2 해금은 메타 상태

전장 잠금/해금은 UI 임시 상태가 아니라
영속 저장되는 Town 메타 상태여야 한다.

### §3.3 기록은 간단하게 시작

MVP에서는 아래만 기록한다.
- `unlocked`
- `clearedOnce`
- `bestStageReached`

이 3개면 잠금/해금과 최소 진행 표시가 가능하다.

---

## §4. 데이터 모델

### §4.1 BattlefieldDefinition

전장 레지스트리의 각 항목은 아래를 가진다.

```ts
interface BattlefieldDefinition {
  id: BattlefieldId;
  name: string;
  description: string;
  difficulty: number;
  theme: string;
  enemyPreview: string;
  color: number;
  bgColor: number;
  battleBackgroundKey?: string;

  unlock: BattlefieldUnlockRule;
  runConfig: BattlefieldRunConfig;
}
```

### §4.2 BattlefieldUnlockRule

```ts
type BattlefieldUnlockRule =
  | { type: 'STARTER' }
  | { type: 'CLEAR_BATTLEFIELD_ONCE'; battlefieldId: BattlefieldId };
```

MVP 기준:
- `plains`: `STARTER`
- `dark_forest`: `plains` 첫 클리어 후 해금
- `ruined_fortress`: `dark_forest` 첫 클리어 후 해금

### §4.3 BattlefieldRunConfig

```ts
interface BattlefieldRunConfig {
  maxStages: number;
  encounterSetId: BattlefieldId;
}
```

MVP에서는 `maxStages`와 `encounterSetId`만 사용한다.

### §4.4 BattlefieldProgress

영속 저장되는 전장 진행 상태:

```ts
interface BattlefieldProgress {
  unlocked: boolean;
  clearedOnce: boolean;
  bestStageReached: number;
}
```

전체 저장 구조:

```ts
type BattlefieldProgressState = Record<BattlefieldId, BattlefieldProgress>;
```

### §4.5 GameState 영속 데이터

`GameStateData` / `SaveData`에 아래 필드를 추가한다.

```ts
battlefieldProgress: BattlefieldProgressState;
```

초기값:
- `plains`: unlocked=true
- 나머지: unlocked=false
- 모든 전장 `clearedOnce=false`
- 모든 전장 `bestStageReached=0`

---

## §5. 전장 적 데이터 구조

### §5.1 현재 문제

현재 `EnemyGenerator`는 `STAGE_ENCOUNTERS`를 단일 전장 기준으로 직접 읽는다.
이 구조에서는 전장이 늘어날수록 조건문이 늘어나기 쉽다.

### §5.2 목표 구조

적 편성 세트를 전장 키로 분리한다.

```ts
type BattlefieldEncounterSet = {
  stages: StageEncounter[];
  stageMultipliers: Record<number, number>;
  bossMultiplier: number;
  namingStyle?: 'DEFAULT' | 'FOREST' | 'FORTRESS';
};

type BattlefieldEncounterRegistry = Record<string, BattlefieldEncounterSet>;
```

그리고 `BattlefieldDefinition.runConfig.encounterSetId`로 연결한다.

### §5.3 MVP 적용 범위

이번 MVP에서는 최소한 아래를 보장한다.

- `plains`는 기존 적 구성을 기준 세트로 사용
- `dark_forest`는 레인저 비중이 높은 세트로 분기
- `ruined_fortress`는 가드/디스럽터 비중이 높은 세트로 분기
- 구조상 이후 전장도 `encounterSetId`만 추가하면 안전하게 붙일 수 있다

---

## §6. 런 생성과 진행

### §6.1 Sortie → Run 생성

`SortieScene`에서 전장 선택 후 `createRunState()` 호출 시
선택한 `battlefieldId`가 반드시 런 상태에 들어가야 한다.

### §6.2 Run 진행 중 참조

런 내부에서 전장 데이터가 필요한 곳:

- `BattleScene` 배경 선택
- `EnemyGenerator` 인카운터 세트 선택
- `RunResult` / 기록 갱신 시 어떤 전장을 완료했는지 판별

### §6.3 저장/로드

진행 중 런 저장 시 `runState.battlefieldId`도 저장되어야 한다.
이어하기 후 같은 전장 컨텍스트로 복귀해야 한다.

---

## §7. 해금 규칙

### §7.1 기본 규칙

- 전장 해금은 **첫 클리어 기준**
- 중도 포기나 1스테이지 미만 종료는 해금 조건을 충족하지 않음
- 해금은 런 종료 시점에 메타 상태에 반영

### §7.2 MVP 해금 표

| 전장 | 초기 상태 | 해금 조건 |
|------|-----------|-----------|
| 변방 초원 | 해금 | 없음 |
| 어둠의 숲 | 잠금 | 변방 초원 첫 클리어 |
| 폐허 요새 | 잠금 | 어둠의 숲 첫 클리어 |

### §7.3 클리어 판정

`clearedOnce=true` 조건:
- 해당 전장의 최종 스테이지까지 승리하여 런 `VICTORY`

`bestStageReached` 갱신:
- 런 종료 시점 기준 최대 도달 스테이지 반영

예:
- Stage 3에서 패배 → `bestStageReached = max(old, 2)`
- 최종 스테이지 클리어 → `bestStageReached = max(old, maxStages)`, `clearedOnce = true`

---

## §8. SortieScene 표시 규칙

### §8.1 표시 데이터

각 카드에서 보여줄 수 있는 메타 정보:
- 잠금/해금 여부
- 첫 클리어 여부
- 최고 도달 스테이지

### §8.2 MVP 표시 원칙

이번 작업에서는 아래 정도면 충분하다.
- 잠금 여부
- `CLEAR` 또는 `FIRST CLEAR` 같은 짧은 상태
- `Best: Stage N / 5` 정도의 짧은 기록

상세 통계는 넣지 않는다.

---

## §9. 런 결과 반영

런 종료 시 `RunResultCalculator.finalizeRun()` 또는 그와 같은 메타 반영 지점에서
아래가 같이 처리되어야 한다.

1. 전장 진행 상태 갱신
2. 해금 조건 검사
3. 새로 해금된 전장 있으면 메타 상태에 반영

이 처리는 전투 엔진이 아니라 메타 레이어 책임이다.

---

## §10. 테스트 기준

최소 계약 테스트:

1. `createRunState()`가 `battlefieldId`를 저장한다
2. 저장/로드 round-trip에서 `battlefieldId`와 `battlefieldProgress`가 유지된다
3. 전장 progress 초기값이 starter/unlocked 규칙에 맞다
4. 특정 전장 클리어 시 다음 전장이 해금된다
5. 중도 패배/포기로는 `clearedOnce`가 올라가지 않는다
6. `SortieScene` 표시 모델이 잠금 상태를 progress 기준으로 읽는다
7. `EnemyGenerator`가 `battlefieldId` 또는 encounter set id를 기준으로 세트를 고른다

---

## §11. 구현 순서

1. 전장 진행 상태 타입/저장 구조 추가
2. 전장 레지스트리에 unlock/runConfig 추가
3. 전장 progress 초기값 + 저장/로드 테스트
4. 런 종료 시 progress 갱신 + 해금 테스트
5. `SortieScene` 잠금/기록 표시 연결
6. `EnemyGenerator`를 encounter set registry 구조로 이동
7. 이후 다른 전장용 실제 encounter set 추가

---

## §12. 보류 사항

- 전장별 고유 보상 테이블
- 전장별 고유 룰 modifier
- 전장별 스토리/브리핑
- 전장별 상점 품목 차이
- 전장 썸네일/배경 아트 파이프라인
