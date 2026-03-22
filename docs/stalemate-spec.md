# Stalemate Prevention — 교착 방지 시스템

## 개요

전투에서 플레이어 측 생존 유닛이 **공격 수단을 완전히 상실**한 경우,
승리가 불가능한 교착 상태에 빠진다.

이를 방지하기 위해 **"관리자의 진노" (Overseer's Wrath)** 시스템을 도입한다.

---

## §22.1 발동 조건

라운드 시작 시 (startRound, §6 이후) 다음을 검사한다:

```
아군(PLAYER) 생존 유닛 전원의 모든 액션 슬롯을 순회
→ DAMAGE 타입 효과가 단 하나도 존재하지 않는가?
```

**발동 O:**
- 생존 유닛 전원의 액션 슬롯에 `type: 'DAMAGE'` 효과가 없음
- 예: Guardian만 생존, 모든 슬롯이 SHIELD/MOVE/BUFF만 보유

**발동 X (제외):**
- DAMAGE 효과가 있으나 조건(condition)이 현재 충족되지 않는 경우 → 히어로 개입이나 적의 행동으로 조건이 충족될 수 있으므로 교착이 아님
- DAMAGE 효과가 하나라도 존재하면 발동하지 않음

판정은 **액션 데이터의 정적 분석**이다. 실행 시점의 조건 평가가 아니다.

---

## §22.2 경고 및 카운트다운

발동 조건 충족 시:

1. `OVERSEER_WRATH_WARNING` 이벤트 발행
2. BattleState에 `stalemateCountdown: 3` 설정
3. 매 라운드 시작 시 재검사:
   - 여전히 조건 충족 → `stalemateCountdown -= 1`
   - 조건 해소 (DAMAGE 효과 보유 유닛 등장) → `stalemateCountdown` 제거, `OVERSEER_WRATH_LIFTED` 이벤트

---

## §22.3 강제 패배

`stalemateCountdown`이 0에 도달하면:

- `BATTLE_END` 이벤트 발행 (`reason: 'overseer_wrath'`)
- 승자: `Team.ENEMY`
- 전투 즉시 종료

---

## §22.4 해제 방법

카운트다운 중 플레이어는 다음으로 교착을 해소할 수 있다:

1. **히어로 EDIT_ACTION**: 생존 유닛의 액션 슬롯에 DAMAGE 포함 카드를 장착
2. **히어로 EFFECT로 적 처치**: 적 전멸 시 승리로 종료 (카운트다운 무관)

해소 시점: 라운드 시작 시 재검사에서 DAMAGE 효과가 감지되면 해제.

---

## §22.5 UI 연출 (참고)

- 경고 발동 시: 화면 연출 + "관리자가 진노하고 있습니다" 메시지
- 카운트다운: "심판까지 N라운드" 표시
- 강제 패배 시: 특수 패배 연출

---

## §22.6 기존 시스템과의 관계

- **§22 Victory Conditions**: 기존 승리 조건(전멸) 유지. 교착 방지는 추가 종료 조건
- **maxRoundsPerBattle (20라운드)**: 교착 방지가 먼저 발동하면 20라운드 이전에 종료 가능. 20라운드 제한은 여전히 최종 안전장치
- **§17~§18 Hero Intervention**: 교착 카운트다운 중 히어로 개입은 정상 작동. 개입으로 교착 해소 가능
- **§4.1 Defensive Action Priority**: 영향 없음. 방어 우선권은 턴 순서 규칙이며 교착 판정과 독립

---

## 데이터 변경

### BattleState 확장

```typescript
export interface BattleState {
  // ... 기존 필드 ...
  stalemateCountdown?: number; // 교착 카운트다운 (없으면 교착 아님)
}
```

### BattleEventType 추가

```typescript
| 'OVERSEER_WRATH_WARNING'  // 교착 경고 발동
| 'OVERSEER_WRATH_LIFTED'   // 교착 해소
```

### BATTLE_END data 확장

```typescript
data: { winner: Team, reason: 'all_dead' | 'max_rounds_exceeded' | 'overseer_wrath' | 'poison_death' }
```
