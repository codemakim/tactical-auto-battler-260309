# 전술 유물 시스템 스펙 (Tactical Artifact Specification)

> Implemented MVP — Codex, 2026-04-21
> 런 중 빌드 다양성을 만들기 위한 MVP 스펙.
> `run-system-spec.md`의 기존 non-goal인 `Relics / artifacts`를 다음 구현 후보로 끌어올리는 문서다.

---

## §1. 목적

현재 런의 선택지는 주로 액션 카드 교체에 집중되어 있다.
액션 카드는 캐릭터의 행동 우선순위를 바꾸지만, 런 전체의 빌드 방향을 크게 바꾸는 패시브 선택은 아직 없다.

전술 유물의 목적은 아래 3가지다.

1. 한 런 안에서 플레이 스타일이 달라지는 장기 선택 제공
2. 액션 카드와 다른 축의 보상 제공
3. 전장/파티/카드 조합을 반복 플레이할 이유 강화

---

## §2. 용어

### §2.1 전술 유물

전술 유물은 **런 중에만 유지되는 패시브 보너스**다.

예:
- 전열 아군이 전투 시작 시 실드 획득
- 첫 라운드 아군 ATK 증가
- 후열 아군 공격 피해 증가
- 전투 승리 골드 증가

### §2.2 전술 특성

`전술 특성`은 향후 캐릭터/영웅/전장에 붙을 수 있는 더 넓은 개념으로 예약한다.

MVP에서는 구현하지 않는다.
이번 작업에서는 `전술 유물`만 다룬다.

---

## §3. MVP 범위

### §3.1 포함

- `RunState`에 런 한정 전술 유물 목록 추가
- 전술 유물 정의 레지스트리 추가
- 전투 시작/보상/경제 계산 중 일부에 유물 효과 적용
- 보상 단계에서 유물 선택지 제공
- 저장/로드 시 진행 중 런의 유물 상태 유지
- 런 종료 시 유물 제거
- 순수 함수 테스트 우선 작성

### §3.2 제외

- 영구 유물 컬렉션
- 유물 강화/합성/판매
- 캐릭터 장비 슬롯
- 영웅 성장 특성
- 전장별 고유 유물 풀
- 희귀도별 복잡한 드랍 테이블
- 유물 간 시너지 키워드 시스템
- 유물 UI 리디자인 대공사

---

## §4. 핵심 원칙

### §4.1 런 한정

전술 유물은 액션 카드 인벤토리와 마찬가지로 런 종료 시 사라진다.
런 결과 화면에서 영구 보상처럼 표시하지 않는다.

### §4.2 액션 카드와 역할 분리

- 액션 카드: 특정 캐릭터의 행동 슬롯을 바꿈
- 전술 유물: 런 전체의 규칙이나 수치를 바꿈

유물은 액션 슬롯을 직접 교체하지 않는다.

### §4.3 작은 효과부터 시작

MVP 유물은 전투 엔진을 크게 흔드는 새 규칙보다,
이미 존재하는 계산 지점에 작은 보정값을 주는 방식으로 시작한다.

우선 적용 가능한 축:
- 전투 시작 실드
- 첫 라운드 버프
- 포지션 기반 피해 보정
- 보상 골드 보정

---

## §5. 데이터 모델

### §5.1 TacticalArtifactId

```ts
type TacticalArtifactId =
  | 'frontline_plates'
  | 'opening_drill'
  | 'backline_focus'
  | 'spoils_map';
```

### §5.2 TacticalArtifactDefinition

```ts
interface TacticalArtifactDefinition {
  id: TacticalArtifactId;
  name: string;
  description: string;
  rarity: Rarity;
  effect: TacticalArtifactEffect;
}
```

### §5.3 TacticalArtifactEffect

MVP 효과 타입:

```ts
type TacticalArtifactEffect =
  | { type: 'STARTING_SHIELD_BY_POSITION'; position: Position; amount: number }
  | { type: 'ROUND_ONE_ATK_BUFF'; value: number; duration: number }
  | { type: 'DAMAGE_MULTIPLIER_BY_POSITION'; position: Position; multiplier: number }
  | { type: 'GOLD_REWARD_MULTIPLIER'; multiplier: number };
```

### §5.4 RunState 확장

```ts
interface RunState {
  // existing fields...
  artifactIds: TacticalArtifactId[];
}
```

MVP에서는 `artifactIds`만 저장한다.
정의 데이터는 레지스트리에서 조회한다.

---

## §6. 획득 규칙

### §6.1 보상 단계

MVP에서는 전투 승리 후 보상 단계에서 카드 보상과 유물 보상을 모두 매번 제공하지 않는다.
보상 화면이 너무 무거워지고 파워 상승이 과해지기 때문이다.

권장 MVP:

| 클리어한 스테이지 | 보상 타입 |
|------------------|-----------|
| Stage 1 | 액션 카드 선택 |
| Stage 2 | 전술 유물 선택 |
| Stage 3 | 액션 카드 선택 |
| Stage 4 | 전술 유물 선택 |
| Stage 5 | 런 종료 |

즉 한 런에서 최대 2개의 유물을 얻는다.

### §6.2 선택지 수

- 액션 카드: 기존처럼 5장 중 1장
- 전술 유물: 3개 중 1개

유물 선택지는 이미 보유한 유물을 제외한다.

### §6.3 건너뛰기

MVP에서는 유물 보상을 건너뛸 수 있다.
건너뛰면 아무 유물도 추가하지 않고 다음 스테이지로 진행한다.

---

## §7. 효과 적용 규칙

### §7.1 전투 시작 실드

`STARTING_SHIELD_BY_POSITION`

- 전투 시작 직후 해당 포지션 아군에게 실드 추가
- 매 전투마다 적용
- 기존 실드 초기화 후 적용
- 예: `frontline_plates` → 전열 아군 실드 +6

### §7.2 첫 라운드 ATK 버프

`ROUND_ONE_ATK_BUFF`

- 라운드 1 시작 시 아군 전체에게 ATK_UP 버프 부여
- duration은 1 권장
- 기존 BuffSystem을 사용한다

### §7.3 포지션 기반 피해 보정

`DAMAGE_MULTIPLIER_BY_POSITION`

- 해당 포지션의 아군이 DAMAGE 효과를 줄 때 multiplier 추가 적용
- 방어/실드/힐에는 적용하지 않는다
- MVP에서는 아군 공격에만 적용한다

### §7.4 골드 보상 보정

`GOLD_REWARD_MULTIPLIER`

- 전투 승리 골드 계산 후 multiplier 적용
- 소수점은 내림한다
- 최소 0 유지

---

## §8. 저장/로드

진행 중 런 저장에는 `artifactIds`가 포함된다.

저장 규칙:
- 새 런 시작: `artifactIds: []`
- 유물 선택: `artifactIds`에 id 추가
- 이어하기: 같은 유물 목록 복원
- 런 종료: `runState`와 함께 제거

영속 메타 저장에는 유물을 남기지 않는다.

---

## §9. UI 책임

### §9.1 RewardScene

보상 타입이 유물인 스테이지에서는 카드 대신 유물 선택지를 보여준다.

표시 정보:
- 이름
- 희귀도
- 짧은 효과 설명
- 이미 보유 중인 유물은 선택지에 나오지 않음

MVP에서는 기존 RewardScene의 구조를 재사용하되,
카드 문구와 혼동되지 않도록 `CHOOSE ONE ARTIFACT` 계열 카피를 사용한다.

### §9.2 Formation / RunMap

현재 보유한 유물 목록을 작게 확인할 수 있어야 한다.

MVP 최소안:
- RunMap 또는 Formation 하단/사이드에 유물 이름 목록 표시
- 상세 팝업은 후속

### §9.3 RunResultScene

런 결과 화면에서는 유물을 영구 보상처럼 표시하지 않는다.
필요하면 "이번 런 전술" 요약으로만 표시할 수 있으나 MVP에서는 제외한다.

---

## §10. 후보 유물 MVP

### §10.1 Frontline Plates

- id: `frontline_plates`
- 효과: 전투 시작 시 전열 아군 실드 +6
- 목적: 전열 유지/탱커 빌드 강화

### §10.2 Opening Drill

- id: `opening_drill`
- 효과: 첫 라운드 아군 ATK +2
- 목적: 빠른 전투/선공 빌드 강화

### §10.3 Backline Focus

- id: `backline_focus`
- 효과: 후열 아군 DAMAGE x1.1
- 목적: 아처/메이지/후열 중심 빌드 강화

### §10.4 Spoils Map

- id: `spoils_map`
- 효과: 전투 승리 골드 x1.15
- 목적: 상점/훈련 경제 빌드 강화

---

## §11. 테스트 기준

구현 최소 테스트:

1. 새 런은 `artifactIds: []`로 시작한다
2. 유물 선택 시 중복 없이 `artifactIds`에 추가된다
3. 유물 선택지는 이미 보유한 유물을 제외한다
4. Stage 2/4는 유물 보상, Stage 1/3은 카드 보상으로 판정된다
5. 진행 중 저장/로드에서 `artifactIds`가 유지된다
6. 런 종료 후 영속 상태에는 유물이 남지 않는다
7. `frontline_plates`는 전투 시작 시 전열 아군에게만 실드를 준다
8. `spoils_map`은 승리 골드에 multiplier를 적용한다
9. `opening_drill`은 아군에게 1라운드 ATK_UP을 부여한다
10. `backline_focus`는 후열 아군의 최종 DAMAGE 배율을 올린다

---

## §12. 구현 순서

1. 타입 추가
   - `TacticalArtifactId`
   - `TacticalArtifactDefinition`
   - `TacticalArtifactEffect`
   - `RunState.artifactIds`
2. 데이터 레지스트리 추가
   - `src/data/TacticalArtifacts.ts`
3. 순수 시스템 추가
   - `src/systems/TacticalArtifactSystem.ts`
   - 보상 타입 판정, 선택지 생성, 유물 추가
4. 저장/로드 반영
   - `SaveSystem`
   - `GameState`
5. 보상 계산 연결
   - RewardCalculator / BattleRewardSystem 중 최소 지점
6. 전투 시작 효과 연결
   - createStageBattleState 또는 BattleState 생성 직후
7. UI 최소 표시
   - RewardScene 유물 선택
   - RunMap 또는 Formation의 보유 유물 목록
8. 테스트/문서/WORKLOG 갱신

---

## §13. 결정 사항

- Stage 2/4 고정
- 건너뛰기 허용
- 일단 `전술 유물`로 시작
