# 편성 화면 카드 장착 UI 스펙

> game-flow-spec.md §4-3 구현.
> 편성 화면에서 캐릭터 액션 슬롯을 카드 형태로 시각화하고,
> 런 중 획득한 카드를 장착/해제할 수 있도록 한다.

---

## §1. 개요

편성 화면(FormationScene) 우측 상세 패널을 개편한다:
- 캐릭터 액션 슬롯을 **카드 UI**로 시각화 (텍스트 리스트 → 시각적 카드)
- 런 중: 인벤토리 카드를 슬롯에 장착/해제 가능
- 마을(런 없음): 기본 슬롯만 카드 형태로 표시 (장착 불가)
- 런 중: 영웅 선택 비활성화 (잠금)

---

## §2. 카드 비주얼

### §2.1 카드 컴포넌트

단일 카드를 표현하는 시각 단위. RewardScene 카드 스타일과 통일.

```
┌─────────────┐
│ RARE         │ ← 레어리티 (색상 텍스트)
│              │
│ Power Strike │ ← 액션 이름 (중앙)
│              │
│ 공용 / 전사  │ ← 클래스 제한 (파란/회색)
│ DAMAGE ×1.2  │ ← 효과 요약
│ ENEMY_FRONT  │
└─────────────┘
  테두리 색 = 레어리티 색상
```

### §2.2 레어리티 색상

| 레어리티 | 테두리 | 텍스트 |
|----------|--------|--------|
| COMMON | 0x888899 | #888899 |
| RARE | 0x4a9eff | #4a9eff |
| EPIC | 0xaa44ff | #aa44ff |
| LEGENDARY | 0xffcc00 | #ffcc00 |

### §2.3 기본 액션 카드 (장착 카드 아님)

기본 액션 슬롯도 카드로 표시하되, 레어리티 대신 "기본"으로 표시.
테두리 색: 0x555566 (어두운 회색).

---

## §3. 상세 패널 개편 (우측)

### §3.1 구성 (위에서 아래)

```
┌────────────────────────────────┐
│ 캐릭터 이름 + 클래스            │
│ HP: 100  ATK: 15  GRD: 8  AGI: 12 │
├────────────────────────────────┤
│         [ 액션 슬롯 ]          │
│  [카드1]  [카드2]  [카드3]     │ ← 3개 카드 가로 배치
│                                │
│ (런 중) 슬롯 클릭 → 카드 선택  │
├────────────────────────────────┤
│ (런 중) [ 미장착 카드 인벤토리 ] │
│ [카드A] [카드B] [카드C] ...    │ ← 장착 가능한 카드 목록
│ [카드D] [카드E]                │
│ 스크롤 또는 페이지              │
└────────────────────────────────┘
```

### §3.2 슬롯 영역 (3칸)

- 가로 배치, 카드 크기: 110 × 150
- 각 슬롯에 기본 액션 또는 장착된 카드 표시
- 장착된 카드: 레어리티 색상 테두리
- 기본 액션: 회색 테두리 + "기본" 라벨

### §3.3 슬롯 인터랙션 (런 중만)

- **슬롯 클릭**: 해당 슬롯 선택 상태 (금색 테두리 하이라이트)
  → 인벤토리에서 카드 클릭하면 해당 슬롯에 장착
- **장착된 카드 슬롯 우클릭 또는 해제 버튼**: 카드 해제 → 기본 액션 복원
- 마을(런 없음): 클릭 불가, 시각적 표시만

### §3.4 인벤토리 영역 (런 중만)

- 런 상태의 `cardInventory` 중 **장착 가능한 카드**만 표시
  (`getEquippableCards(runState, characterDefId)` 사용)
- 이미 다른 캐릭터에 장착된 카드는 표시하지 않음
- 카드 크기: 90 × 130 (슬롯보다 약간 작게)
- 가로 3열 그리드, 넘치면 스크롤 영역
- 런이 없으면 이 영역 비표시

---

## §4. 영웅 선택 잠금 (런 중)

### §4.1 규칙

- 마을 편성: 영웅 선택 가능 (기존과 동일)
- 런 중 편성: 영웅 선택 **비활성화** (잠금)
  - 영웅 버튼들 dimmed + 클릭 불가
  - 현재 선택된 영웅만 강조 표시
  - "런 중에는 영웅을 변경할 수 없습니다" 안내 텍스트

---

## §5. 순수 함수 (기존 활용 + 신규)

### §5.1 기존 함수 (RunManager.ts)

- `equipCard(runState, charDefId, slotIndex, cardInstanceId)` → RunState
- `unequipCard(runState, charDefId, slotIndex)` → RunState
- `getEquippableCards(runState, charDefId)` → CardInstance[]
- `getEffectiveActionSlots(runState, charDefId)` → ActionSlot[]

### §5.2 신규 순수 함수

```typescript
// 카드 렌더링 데이터 계산
interface SlotDisplayData {
  slotIndex: number;
  action: Action;
  condition: ActionCondition;
  equippedCard: CardInstance | null;  // null이면 기본 액션
  isBase: boolean;
}

function getSlotDisplayData(
  charDef: CharacterDefinition,
  runState: RunState | undefined,
): SlotDisplayData[]
```

런 상태가 없으면 기본 슬롯만 반환.
런 상태 있으면 equippedCards 참조하여 장착된 카드 정보 포함.

---

## §6. 구현 범위

### 이번 작업:
1. `SlotDisplayData` 타입 (types/index.ts)
2. `getSlotDisplayData()` 순수 함수
3. 순수 함수 테스트
4. FormationScene 상세 패널 개편:
   - 텍스트 리스트 → 카드 비주얼 (3개 슬롯)
   - 인벤토리 카드 목록 (런 중)
   - 슬롯 클릭 → 카드 장착, 해제
5. 영웅 선택 런 중 잠금
6. gameState.runState 변경 시 반영

### 기존 유지:
- 좌측 캐릭터 로스터 (그대로)
- 중앙 슬롯 배치 (그대로)
- "편성 완료"/"마을로" 버튼 (그대로)

---

## §7. 의존성

- `equipCard()`, `unequipCard()`, `getEquippableCards()` — RunManager.ts
- `CardInstance`, `RunState`, `CharacterDefinition` — types/index.ts
- `UITheme` — ui/UITheme.ts (색상/폰트)
- `gameState` — core/GameState.ts (runState 접근)
