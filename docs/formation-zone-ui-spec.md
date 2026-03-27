# 편성 화면 영역 배치 UI 명세

## 목적

고정 슬롯(BACK 1, FRONT 1, FRONT 2) 방식을 **영역(zone) 기반 자유 배치**로 변경한다.
전열/후열 영역에 캐릭터를 자유롭게 올려놓고, 영역 내에서는 자동 균등 배치(UnitLayoutCalculator 재사용).

## §1. 영역 구조

```
┌─────────────┐  ┌─────────────┐
│             │  │             │
│  BACK 영역  │  │ FRONT 영역  │
│  (후열)     │  │  (전열)     │
│  max 4      │  │  max 4      │
│             │  │             │
└─────────────┘  └─────────────┘

총 출전 인원: 최대 4명 (FRONT + BACK 합산, 자유 배치)
```

### §1.1 제약

- FRONT + BACK 합계 최대 4명
- 같은 캐릭터 중복 배치 불가
- 최소 1명은 배치해야 출격 가능

## §2. 인터랙션

### §2.1 배치

1. 좌측 로스터에서 캐릭터 클릭 → 선택됨
2. FRONT 또는 BACK 영역 클릭 → 해당 영역에 배치
3. 이미 총 4명이면 영역 클릭 시 토스트 안내

### §2.2 제거/이동

- 영역 내 캐릭터 클릭 → 선택 + 상세 패널 표시
- 선택된 캐릭터를 다른 영역 클릭 → 이동
- 선택된 캐릭터를 로스터 영역으로 드래그 또는 제거 버튼 → 편성 해제

### §2.3 영역 시각화

- 영역 배경: 반투명 사각형 + 점선 테두리
- 비어있을 때: "캐릭터를 배치하세요" 안내 텍스트
- 캐릭터: 유닛 박스(이름, 클래스, 스탯) — UnitLayoutCalculator로 자동 균등 배치
- 선택된 캐릭터: 금색 테두리

## §3. 순수 함수

### §3.1 기존 재사용

- `calculateColumnLayout()` — UnitLayoutCalculator.ts
  영역 내 캐릭터를 Y축 균등 배치

### §3.2 신규

```typescript
// src/systems/FormationValidator.ts

interface FormationValidation {
  valid: boolean;
  errors: string[];
}

function validateFormation(formation: FormationData): FormationValidation
```

## §4. 데이터 구조

```typescript
interface FormationData {
  slots: FormationSlot[];  // {characterId, position}[]
  heroType: HeroType;
}
```

position이 FRONT/BACK이므로 영역 기반과 자연스럽게 대응.
