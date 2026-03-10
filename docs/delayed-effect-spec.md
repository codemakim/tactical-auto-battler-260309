# Delayed Effects Specification (§7.2)

## 개요

지연 효과(Delayed Effect)는 턴 중 예약되어, 지정된 라운드 수 경과 후 라운드 종료 시 해석(resolve)되는 효과다.

기존 즉시 효과와 달리 **시간차 전략**을 가능하게 한다.

---

## 데이터 모델

```typescript
interface DelayedEffect {
  id: string;              // 고유 식별자
  sourceId: string;        // 효과를 생성한 유닛 ID
  targetId: string;        // 효과 대상 유닛 ID
  effectType: 'DAMAGE' | 'HEAL' | 'BUFF';  // 발동 시 적용할 효과
  value: number;           // 데미지량 / 힐량 / 버프 수치
  remainingRounds: number; // 남은 라운드 수 (0이 되면 발동)
  buffType?: BuffType;     // effectType이 BUFF일 때 버프 종류
  buffDuration?: number;   // effectType이 BUFF일 때 버프 지속시간
}
```

`BattleState`에 `delayedEffects: DelayedEffect[]` 필드를 추가한다.

---

## 라이프사이클

### 1. 생성 (턴 중)

액션 효과 타입 `DELAYED`가 실행되면 DelayedEffect를 BattleState에 등록한다.

ActionEffect 확장:
```typescript
{
  type: 'DELAYED',
  value: number,           // 데미지/힐/버프 수치
  target: ActionTargetType,
  delayedType: 'DAMAGE' | 'HEAL' | 'BUFF',  // 발동 시 효과
  delayRounds: number,     // 몇 라운드 후 발동 (1 = 이번 라운드 종료 시)
  buffType?: BuffType,     // BUFF일 때
  buffDuration?: number,   // BUFF일 때 지속시간
}
```

생성 시 `DELAYED_EFFECT_APPLIED` 이벤트를 기록한다.

### 2. 카운트다운 (라운드 종료 시)

`endRound()`에서 §7.1 버프 틱 이후, 모든 DelayedEffect의 `remainingRounds`를 1 감소한다.

### 3. 발동 (remainingRounds === 0)

카운트다운 결과 `remainingRounds`가 0이 된 효과를 해석한다:

- **DAMAGE**: `applyDamage(target, value, sourceId, round, turn)` 호출
  - 대상이 이미 죽었으면 무시
  - 사망 처리 포함
- **HEAL**: `applyHeal(target, value, round, turn)` 호출
  - 대상이 이미 죽었으면 무시
- **BUFF**: `applyBuff(target, buff, round, turn)` 호출
  - 대상이 이미 죽었으면 무시

발동 시 `DELAYED_EFFECT_RESOLVED` 이벤트를 기록한다.

### 4. 제거

발동 완료된 효과는 `delayedEffects` 배열에서 제거한다.
발동되지 않은 효과(remainingRounds > 0)는 유지한다.

---

## 엣지 케이스

1. **대상 사망**: 발동 시점에 대상이 죽었으면 효과 무시, 이벤트에 `{ skipped: true, reason: 'target_dead' }` 기록
2. **소스 사망**: 효과 생성자가 죽어도 예약된 효과는 정상 발동 (시한폭탄 컨셉)
3. **같은 대상에 복수 지연 효과**: 모두 독립적으로 해석, 순서는 등록 순
4. **전투 종료**: 전투가 이미 종료된 상태면 지연 효과 해석하지 않음
5. **delayRounds = 1**: 예약된 바로 그 라운드의 종료 시 발동

---

## 이벤트 타입

```typescript
// BattleEventType에 추가
| 'DELAYED_EFFECT_APPLIED'   // 지연 효과 등록 시
| 'DELAYED_EFFECT_RESOLVED'  // 지연 효과 발동 시
```

### DELAYED_EFFECT_APPLIED 이벤트 data
```typescript
{
  delayedEffectId: string,
  effectType: 'DAMAGE' | 'HEAL' | 'BUFF',
  value: number,
  delayRounds: number,
}
```

### DELAYED_EFFECT_RESOLVED 이벤트 data
```typescript
{
  delayedEffectId: string,
  effectType: 'DAMAGE' | 'HEAL' | 'BUFF',
  value: number,
  skipped?: boolean,
  reason?: string,
}
```

---

## 처리 순서 (endRound 내)

1. §7.1: 버프/디버프 지속시간 감소
2. §7.2: 지연 효과 카운트다운 및 발동
3. 사망 처리 (지연 효과 데미지로 인한 사망 포함)
4. 예비 유닛 투입
5. ROUND_END 이벤트
