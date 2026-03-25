# 전투 유닛 균등 배치 명세

## 목적

전투 화면에서 유닛들이 열(column)별로 **균등 간격**으로 배치되도록 한다.
유닛 수 변동(사망, 넉백, 예비 투입) 시 나머지 유닛이 부드럽게 재배치된다.

## 배치 규칙

### §1. 열 구조

전투 화면은 4개 열로 구성:
- PLAYER_BACK, PLAYER_FRONT, ENEMY_FRONT, ENEMY_BACK

각 열의 X 좌표는 고정, Y 축 범위 내에서 유닛을 균등 배치한다.

### §2. 균등 배치 알고리즘 (space-evenly)

열 내 유닛 수가 N일 때, Y 범위 [yMin, yMax] 안에서:

```
N=0: 배치 없음
N=1: |     O     |  → 중앙
N=2: |   O   O   |  → 1/3, 2/3 지점
N=3: |  O  O  O  |  → 1/4, 2/4, 3/4 지점
N=4: | O O O O   |  → 1/5, 2/5, 3/5, 4/5 지점

일반화: position[i] = yMin + (i + 1) * (yMax - yMin) / (N + 1)
```

### §3. 재배치 트리거

다음 이벤트 발생 시 해당 열의 유닛을 재배치:
- UNIT_DIED: 사망 유닛 열에서 생존 유닛 재배치
- UNIT_MOVED / UNIT_PUSHED: 이동한 유닛의 출발/도착 열 모두 재배치
- RESERVE_ENTERED: 예비 유닛이 들어온 열 재배치

### §4. 애니메이션

재배치 시 tween으로 부드럽게 이동:
- duration: 300ms
- ease: 'Power2'
- 기존 이동 tween과 충돌 시 새 tween이 덮어씀

### §5. 순수 함수

```typescript
// src/systems/UnitLayoutCalculator.ts

interface UnitPosition {
  unitId: string;
  x: number;
  y: number;
}

/**
 * 열 X 좌표와 Y 범위를 받아 유닛들의 균등 배치 좌표를 계산
 */
function calculateColumnLayout(
  unitIds: string[],
  colX: number,
  yMin: number,
  yMax: number,
): UnitPosition[]

/**
 * 전체 전투 유닛의 배치 좌표를 한번에 계산
 */
function calculateBattleLayout(
  units: Array<{ id: string; team: string; position: string; isAlive: boolean }>,
  config: LayoutConfig,
): UnitPosition[]
```

### §6. 재사용

이 레이아웃 함수는 전투 화면뿐 아니라 편성 화면 미리보기 등에서도
재사용 가능하도록 순수 함수로 분리한다.
