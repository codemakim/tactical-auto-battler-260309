# 액션 카드 상세 표시 개선 스펙

> Source of Truth — 2026-04-02 v2

## 문제

편성/병영/상점에서 캐릭터의 액션 카드가 **이름만** 표시되어, 플레이어가 각 카드의 조건/효과/대상을 알 수 없다.
전투 전략을 세우려면 "이 캐릭터가 언제, 무엇을, 누구에게 하는지"가 핵심인데 현재 UI에서 이 정보가 누락되어 있다.

### 현재 상태

| 위치 | 조건 | 효과 | 대상 | 비고 |
|------|------|------|------|------|
| Formation HUD (우측 패널) | X | X | X | 이름만: `1. Shield Bash  2. Fortify` |
| 병영 오버레이 | enum 이름만 | X | X | `POSITION_FRONT -> Shield Bash` |
| 상점 오버레이 | X | X | X | 스탯만 표시, 액션 정보 전무 |
| 카드 편집 오버레이 | O (배지) | O (배지) | O (배지) | UICardVisual 사용, 이미 완성 |

### 목표 상태

모든 위치에서 **배지/태그 기반 미니 카드**로 액션 정보를 표시한다.
텍스트 나열이 아닌, 카드 편집 오버레이와 동일한 시각 언어(색상 배지)를 사용한다.

| 위치 | 표시 방식 | 마우스 오버 |
|------|-----------|-------------|
| Formation HUD | 미니 카드 (이름 + 배지) | 확대 카드 팝업 |
| 병영 오버레이 | 미니 카드 (이름 + 배지) | 확대 카드 팝업 |
| 상점 오버레이 | 미니 카드 (이름 + 배지) | 확대 카드 팝업 |

## 디자인 컨셉: 미니 액션 카드

### 미니 카드 레이아웃 (UIActionMiniCard)

```
┌──────────────────────────────────┐
│  Shield Bash      공격x1.2      │ ← 카드 이름 + 메인 수치 (한 줄)
│ ┌────┐┌──────────┐             │
│ │나전열││적 전열 공격x1.2│             │ ← 배지 태그 — 섹션 구분 없이 쭉 나열
│ └────┘└────┘└────┘└──────┘      │    색상만으로 조건/대상/효과 구분
└──────────────────────────────────┘
```

- **크기**: 폭 ~170px, 높이 ~56px (공간에 따라 조정 가능)
- **배경**: `0x1a1a2e` (UITheme.colors.bgPanel), 테두리 `0x334466`, 라운드 6px
- **1행 — 카드 이름 + 메인 수치**:
  - 좌측: 카드 이름, 14px, `textPrimary` (#e0e0e0)
  - 우측: 메인 수치 (첫 번째 효과의 모노 아이콘 + 요약), 14px, 효과별 색상
    - DAMAGE: `✦ 공격x1.2` (빨강 #ff4444)
    - SHIELD: `◈ 실드x0.8` (파랑 #4a9eff)
    - HEAL: `✚ 회복15` (초록 #44cc44)
    - MOVE: `△ 전열 이동` (노랑 #ffcc00)
    - BUFF/DEBUFF: `▲ 엄호 1T` / `▼ 방어 약화 2T` (초록/보라)
    - `getStructuredEffect(action.effects[0])` 사용
- **2행 — 배지 태그 (플랫 나열)**:
  - 모든 배지를 **구역 구분 없이** 한 줄로 쭉 나열 (폭 초과 시 줄바꿈)
  - 순서: `selfBadges` → `targetBadges` → `effectBadges` 를 하나의 배열로 concat
  - 각 배지의 **색상**이 곧 구분자 역할:
    - 조건(selfBadges): 초록 — fill `0x1a3a2a`, border `0x44cc88`, text `#88ddaa`
    - 대상(targetBadges): 기존 tone 그대로 (self=파랑, ally=밝은파랑, enemy=빨강)
    - 효과(effectBadges): 보라 — fill `0x2e2948`, border `0xc29bff`, text `#e3d4ff`
  - 배지 크기: 높이 16px, 폰트 10px, 가로 패딩 6px, 간격 3px
  - ALWAYS 조건(`condition.type === 'ALWAYS'`)이면 조건 배지 생략
  - 섹션 라벨(상황/대상/효과) **없음** — 색상만으로 직관적 구분

### 확대 카드 팝업 (UIActionCardTooltip)

미니 카드에 마우스를 올리면 **같은 태그 문법을 유지한 확대 상세 카드**가 뜬다.
팝업도 `상황 / 대상 / 효과` 섹션으로 나누지 않고, 색상으로 구분된 태그를 **플랫하게 나열**한다.

```
┌──────────────────────────────┐
│ 기본            Shield Bash │
│ Guardian        공격x1.2     │
│ ┌────┐┌──────────┐           │
│ │나전열││적 전열 공격x1.2│           │
│ └────┘└────┘└────────┘       │
└──────────────────────────────┘
```

- 팝업 위치: 미니 카드 위 또는 옆 (화면 밖으로 나가지 않도록 clamp)
- 팝업 크기: 미니 카드보다 크게, 배지 2~3줄까지 수용 가능
- interactive: false (클릭 불가, 호버 표시 전용)
- 마우스가 미니 카드에서 벗어나면 즉시 파괴
- 핵심 원칙: **미니 카드와 팝업이 같은 읽기 방식**을 유지해야 한다

## 기존 인프라 (이미 있는 것)

변환 유틸은 이미 구현되어 있다. **새로 만들 유틸 함수는 없다.**

- `src/utils/actionCardBadges.ts`:
  - `buildActionCardBadgeModel(condition, effects)` → `{ selfBadges, targetBadges, effectBadges }`
  - `ActionBadge { text, tone }` — tone: `'self' | 'ally' | 'enemy' | 'effect' | 'neutral'`
- `src/utils/actionText.ts`:
  - `formatCondition(condition)` → `"자신 전열"`, `"HP 50% 이하"` 등
  - `formatEffect(effect)` → `"ATK×1.2 피해"`, `"GRD×0.8 실드"` 등
  - `getStructuredEffect(effect)` → `{ icon, color, valueText, targetText }` — 메인 수치 렌더링용
  - `getStructuredCondition(condition)` → `{ text, isAlways }` — ALWAYS 조건 판별용
- `src/ui/UICardVisual.ts`: 카드 편집 오버레이의 기존 상세 카드. 배지 색상/간격 참고용

## 구현 항목

### 항목 0: UIActionMiniCard 컴포넌트 생성

**새 파일**: `src/ui/UIActionMiniCard.ts`

미니 액션 카드 Phaser 컴포넌트. 병영/상점/HUD에서 공용 사용.

```typescript
export interface UIActionMiniCardConfig {
  x: number;
  y: number;
  width?: number;         // 기본 170
  height?: number;        // 기본 70
  action: Action;
  condition: ActionCondition;
  rarity?: string;
  classRestriction?: string;
  showTooltip?: boolean;  // 마우스 오버 팝업 표시 여부 (기본 true)
}

export class UIActionMiniCard {
  readonly container: Phaser.GameObjects.Container;
  private tooltip: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, cfg: UIActionMiniCardConfig) { ... }
  destroy(): void { ... }
}
```

**렌더링 로직**:

1. **배경**: `fillRoundedRect(0, 0, w, h, 6)`, fill `0x1a1a2e`, stroke `0x334466`
2. **1행 — 이름 + 수치** (y: 4):
   - 좌측 (padX, 4): 카드 이름, 14px, `textPrimary`
   - 우측 (w - padX, 4): 메인 수치, 14px, `.setOrigin(1, 0)`
     - 첫 번째 효과 기준의 문장형 요약 표시
     - 텍스트 색상: `effect.color` 값을 hex string으로 변환
3. **2행 — 배지 플랫 나열** (y: 24):
   - `buildActionCardBadgeModel(condition, action.effects)` 호출
   - `selfBadges` + `targetBadges` + `effectBadges`를 **하나의 배열로 concat**
   - ALWAYS 조건이면 `selfBadges` 제외
   - concat된 배열을 순서대로 가로 나열 (폭 초과 시 줄바꿈)
   - 각 배지의 색상 결정:
     - `selfBadges` 항목 → 조건 전용 초록 팔레트 (fill `0x1a3a2a`, border `0x44cc88`, text `#88ddaa`)
     - `targetBadges` / `effectBadges` 항목 → 기존 `getBadgePalette(badge.tone)` 사용
   - 배지 크기: 높이 16px, 폰트 10px, 가로 패딩 6px, 간격 3px
   - 구역 라벨/구분선 **없음**
   - 표기 원칙:
     - `자신`, `내 전열`, `내 후열` 대신 `나`, `나 전열`, `나 후열`
     - `SHIELD`는 `GRD`를 반복하지 않고 `실드x1.0` 형식 사용
     - `MOVE` / `PUSH`는 화살표 대신 `나 전열 이동`, `적 후열 밀침`처럼 문장형 사용
     - 복수 대상 효과는 `나 실드x1`, `아군 최저 HP 실드x0.8`처럼 **대상을 포함한 효과 태그**로 구분
     - 효과 태그와 메인 요약 모두 같은 모노 아이콘 세트 사용:
       - DAMAGE `✦`
       - SHIELD `◈`
       - HEAL `✚`
       - MOVE `△`
       - PUSH `▷`
       - BUFF `▲`
       - DEBUFF `▼`
       - DELAY `◷`
       - ADVANCE `◶`
       - REPOSITION `◇`
       - SWAP `⇄`

5. **마우스 오버 (showTooltip=true 시)**:
   - hitArea 전체에 `pointerover` / `pointerout` 이벤트
   - `pointerover`: 플랫 태그 기반 상세 카드 생성, 미니 카드 위에 표시
     - rarity / classRestriction / action / condition 표시
     - 위치: 미니 카드 상단 중앙 기준, 화면 밖 clamp 처리
     - depth: 현재 depth + 100
   - `pointerout`: tooltip `.destroy()` 후 null

**배지 tone 확장 (미니 카드/상세 팝업 공통)**:
- UIActionMiniCard 내부에서 `condition` tone의 팔레트를 자체적으로 정의
- 기존 `ActionBadgeTone` 타입에 `'condition'`을 추가할 필요 **없음** — selfBadges를 렌더링할 때 tone만 override하여 초록 팔레트 적용
- 즉, `selfBadges`를 그리는 시점에 `getBadgePalette` 대신 조건 전용 초록 팔레트를 직접 사용

### 항목 1: 병영 오버레이 — 미니 카드 표시

**파일**: `src/systems/BarracksDetail.ts`, `src/scenes/TownScene.ts`

**BarracksDetail ViewModel 변경**:

현재:
```typescript
actionsLabel: character.baseActionSlots.map(
  (slot, index) => `${index + 1}. ${slot.condition.type} -> ${slot.action.name}`,
),
```

변경 — ViewModel에서 텍스트 대신 슬롯 데이터를 직접 전달:
```typescript
// 기존 actionsLabel 제거
actionSlots: character.baseActionSlots,  // ActionSlot[] 그대로 전달
```

`CharacterDetailViewModel` 타입 변경:
```typescript
export interface CharacterDetailViewModel {
  title: string;
  classLabel: string;
  trainingLabel: string;
  statsLabel: string;
  actionSlots: ActionSlot[];  // actionsLabel: string[] → actionSlots: ActionSlot[]
}
```

**TownScene 렌더링 변경** (병영 오버레이 부분):
- 기존 `actionsLabel` 텍스트 렌더링 제거
- `actionSlots`를 순회하며 `UIActionMiniCard`를 생성
- 미니 카드를 세로로 나열 (gap: 6px)
- 마우스 오버 팝업 활성화 (`showTooltip: true`)

**테스트**: `src/__tests__/barracks-detail.spec.ts`
- `getCharacterDetailViewModel()`이 `actionSlots` 배열을 반환하는지 검증
- 각 슬롯에 `condition`, `action` (name, effects) 속성이 있는지 검증

### 항목 2: 상점 오버레이 — 캐릭터 카드에 미니 카드 추가

**파일**: `src/scenes/TownScene.ts` (openRecruitShopPanel 메서드)

**현재**: 이름, 클래스, 스탯(HP/ATK/GRD/AGI), 가격만 표시. 카드 높이 222px.

**변경**:
- 스탯 아래에 각 액션 슬롯의 `UIActionMiniCard`를 표시
- 미니 카드 크기 조정: 폭 220px (cardWidth-32), 높이 56px (상점 공간 제한)
  - 메인 수치 + 배지를 한 줄로 압축 (배지 높이 14px, 폰트 9px)
- 카드 높이를 확장: 222px → 350px (3슬롯 × 56px + 간격)
- 패널 높이도 확장: 430px → 560px
- 마우스 오버 팝업 활성화 (`showTooltip: true`)

**상점 카드 레이아웃 변경**:
```
┌──── 252px ────┐
│ Shield Knight │ ← 이름
│ Guardian      │ ← 클래스
│ HP 80 ATK 12  │ ← 스탯 (기존)
│ GRD 15 AGI 8  │
│               │
│ ┌ Mini Card ┐ │ ← 액션 슬롯 1
│ └───────────┘ │
│ ┌ Mini Card ┐ │ ← 액션 슬롯 2
│ └───────────┘ │
│ ┌ Mini Card ┐ │ ← 액션 슬롯 3
│ └───────────┘ │
│               │
│  120 Gold     │ ← 가격
│ [  영입  ]    │ ← 버튼
└───────────────┘
```

**테스트**: `src/__tests__/recruit-shop.spec.ts`
- 상점 offer에 캐릭터의 `baseActionSlots` 데이터가 포함되는지 확인 (이미 `CharacterDefinition` 포함이므로 접근 가능)

### 항목 3: Formation HUD — 미니 카드 세로 나열

**파일**: `src/systems/FormationHudState.ts`, `src/ui/FormationHudView.ts`

**HudState ViewModel 변경**:

현재:
```typescript
tactics: actionNames.map((name, index) => `${index + 1}. ${name}`).join('   '),
```

변경 — 텍스트 대신 슬롯 데이터 전달:
```typescript
export interface FormationSelectionHudCopy {
  meta: string;
  actionSlots: ActionSlot[];  // tactics: string → actionSlots: ActionSlot[]
}
```

`getFormationSelectionHudCopy` 변경:
```typescript
export function getFormationSelectionHudCopy(input: {
  character?: CharacterDefinition;
  zoneLabel?: string;
}): FormationSelectionHudCopy {
  if (!input.character) {
    return {
      meta: '선택한 유닛 없음',
      actionSlots: [],
    };
  }
  const { character, zoneLabel = 'UNASSIGNED' } = input;
  const stats = character.baseStats;
  return {
    meta: `${character.name} / ${character.characterClass}  HP ${stats.hp}  ATK ${stats.atk}  GRD ${stats.grd}  AGI ${stats.agi}  LINE ${zoneLabel}`,
    actionSlots: character.baseActionSlots,
  };
}
```

**HudView 렌더링 변경** (`FormationHudView.ts`):

- `unitTactics` Text 오브젝트 제거
- 대신 `UIActionMiniCard[]` 배열을 관리
- `refreshSelection()` 호출 시:
  - 기존 미니 카드 `.destroy()` 후 비움
  - `actionSlots`를 순회하며 `UIActionMiniCard` 생성
  - 위치: `hud.x + 18, hud.y + 250`부터 세로 나열 (gap: 6px)
  - 미니 카드 폭: `hud.width - 36` = 354px
  - 마우스 오버 팝업 활성화 (`showTooltip: true`)

**참고**: `actionNames` 파라미터 제거. 호출부(`FormationScene.ts`)에서 `actionNames`를 전달하던 코드도 수정 필요.

**호출부 변경 확인**:
- `FormationScene.ts`에서 `refreshSelection({ character, zoneLabel, actionNames })` 호출하는 곳을 찾아서 `actionNames` 제거

**테스트**: `src/__tests__/formation-presentation.spec.ts` 또는 새 테스트 파일
- `getFormationSelectionHudCopy()`가 `actionSlots` 배열을 반환하는지 검증
- 빈 선택 시 `actionSlots`가 빈 배열인지 검증

## 작업 순서

1. **UIActionMiniCard** 컴포넌트 생성 + 단위 테스트 (핵심 공용 컴포넌트)
2. **BarracksDetail** ViewModel 변경 + TownScene 병영 렌더링 수정 + 테스트
3. **FormationHudState/View** 수정 + 호출부 정리 + 테스트
4. **상점 오버레이** 수정 (레이아웃 확장 포함) + 테스트
5. `npm test` / `npx tsc --noEmit` / `npm run format` 전체 검증
6. HANDOFF.md 갱신 + 커밋

## 범위 외 (하지 않는 것)

- 카드 편집 오버레이의 `UICardVisual`은 수정하지 않는다
- `actionCardBadges.ts`의 `ActionBadgeTone` 타입을 수정하지 않는다
- 카드 편집 오버레이는 건드리지 않는다 (이미 완성)
- 새로운 유틸 함수를 만들지 않는다 (기존 actionText.ts / actionCardBadges.ts 활용)
- 폰트 변경 없음 (monospace 유지)
- 이미지/스프라이트 에셋 추가 없음 (텍스트 이모지 아이콘 사용, 기존 EFFECT_STYLE 참조)

## 핵심 참조 파일

| 역할 | 파일 | 사용할 함수/클래스 |
|------|------|--------------------|
| 배지 모델 | `src/utils/actionCardBadges.ts` | `buildActionCardBadgeModel()`, `ActionBadge` |
| 구조화 데이터 | `src/utils/actionText.ts` | `getStructuredEffect()`, `getStructuredCondition()` |
| 기존 상세 카드 참고 | `src/ui/UICardVisual.ts` | 배지 간격/팔레트 참고 |
| UI 테마 | `src/ui/UITheme.ts` | `UITheme.colors`, `UITheme.font` |
| 병영 ViewModel | `src/systems/BarracksDetail.ts` | `CharacterDetailViewModel` |
| HUD ViewModel | `src/systems/FormationHudState.ts` | `FormationSelectionHudCopy` |
| 상점 렌더링 | `src/scenes/TownScene.ts` | `openRecruitShopPanel()` (L624~) |
| HUD 렌더링 | `src/ui/FormationHudView.ts` | `FormationHudView` |
| 타입 정의 | `src/types/index.ts` | `ActionSlot`, `Action`, `ActionCondition` |

## 배지 색상 팔레트 정리

| 용도 | tone | fill | border | text |
|------|------|------|--------|------|
| 조건 (자신/상황) | condition (미니카드 전용) | `0x1a3a2a` | `0x44cc88` | `#88ddaa` |
| 대상: 자신 | self | `0x16324d` | `0x4a9eff` | `#9ad2ff` |
| 대상: 아군 | ally | `0x17344a` | `0x68b8ff` | `#b6ddff` |
| 대상: 적 | enemy | `0x4a1d26` | `0xff6677` | `#ffb3be` |
| 효과 | effect | `0x2e2948` | `0xc29bff` | `#e3d4ff` |

## 검증 기준

- 병영: 캐릭터 선택 시 각 액션 슬롯이 미니 카드로 표시됨 (이름 + 수치 + 배지)
- 상점: 캐릭터 카드에 액션 슬롯 미니 카드가 스탯 아래 표시됨
- Formation HUD: 유닛 선택 시 각 슬롯이 미니 카드로 세로 나열됨
- 모든 미니 카드에서 마우스 오버 시 확대 카드 팝업이 표시됨
- 팝업도 미니 카드와 동일하게 플랫 태그 나열 방식으로 읽힘
- 기존 테스트 전체 통과
- tsc / prettier 통과
