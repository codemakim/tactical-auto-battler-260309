# 전투 플로팅 텍스트 명세

## 목적

전투 중 발생하는 수치 변화(데미지, 쉴드, 힐 등)를 해당 유닛 근처에 RPG 스타일 플로팅 숫자로 표시한다.
기존 토스트 기반 "누가 누굴 때렸다" 메시지를 대체한다.

## 플로팅 텍스트 타입

| 타입 | 표시 | 색상 | 예시 |
|------|------|------|------|
| DAMAGE | `-{값}` | `#ff4444` (빨강) | `-23` |
| SHIELD | `+{값} 🛡` | `#4a9eff` (파랑) | `+15 🛡` |
| HEAL | `+{값}` | `#44cc44` (초록) | `+10` |
| MISS | `MISS` | `#888899` (회색) | `MISS` |
| BUFF | `{버프명}` | `#ffcc00` (노랑) | `ATK UP` |
| DEBUFF | `{디버프명}` | `#cc44cc` (보라) | `ATK DOWN` |
| DEATH | `💀` | `#ff4444` | `💀` |

## 동작

1. **출현 위치**: 대상 유닛 컨테이너 기준 상단 중앙 (y = -UNIT_H/2 - 30)
2. **애니메이션**:
   - 0ms: alpha 0 → 1, y 시작 위치
   - 0~400ms: y -= 30 (위로 떠오름)
   - 400~800ms: alpha 1 → 0 (페이드아웃)
   - 800ms: destroy
3. **다중 텍스트 처리**: 같은 유닛에 동시 다발 시 x 오프셋 랜덤(-20~+20)으로 겹침 방지
4. **fontSize**: 데미지/쉴드/힐 = 20px (볼드), MISS/BUFF/DEBUFF = 14px

## 이벤트 매핑

| BattleEvent.type | 플로팅 타입 | 대상 유닛 |
|-----------------|------------|----------|
| DAMAGE_DEALT | DAMAGE | targetId |
| SHIELD_APPLIED | SHIELD | targetId |
| HEAL_APPLIED | HEAL | targetId |
| UNIT_DIED | DEATH | targetId |
| BUFF_APPLIED | BUFF | targetId |
| DEBUFF_APPLIED | DEBUFF | targetId |

## 토스트 변경

기존 `processEvents()`의 토스트 메시지 중 전투 수치 관련(DAMAGE_DEALT, ACTION_EXECUTED 등)은 플로팅 텍스트로 대체한다.
라운드 시작, 전투 종료 등 전역 정보는 토스트를 유지한다.

## 순수 함수

```typescript
// src/systems/FloatingTextCalculator.ts

interface FloatingTextData {
  type: 'DAMAGE' | 'SHIELD' | 'HEAL' | 'MISS' | 'BUFF' | 'DEBUFF' | 'DEATH';
  value?: number;
  label?: string;
  targetUnitId: string;
}

function extractFloatingTexts(events: BattleEvent[]): FloatingTextData[]
```

## UI 컴포넌트

```typescript
// src/ui/UIFloatingText.ts

class UIFloatingText {
  constructor(scene: Phaser.Scene, x: number, y: number, data: FloatingTextData)
  // 생성 즉시 애니메이션 시작, 800ms 후 자동 파괴
}
```
