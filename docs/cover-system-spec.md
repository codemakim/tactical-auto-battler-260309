# Cover System Spec (§25)

## 개요

전열 유닛이 후열 아군을 대신 피격하는 "커버" 메커니즘.
Guardian 등 방어 특화 캐릭터가 실드를 쌓고 아군을 보호하는 전술적 역할을 부여한다.

## 핵심 규칙

### §25.1 COVER 버프

- 새 BuffType: `COVER`
- COVER 버프를 가진 유닛은 **커버 상태** (= 수비 모드)
- COVER 버프는 다른 버프와 동일하게 `duration` 라운드 후 만료
- COVER 버프의 `value`는 사용하지 않음 (존재 여부만 판정)
- **중첩 불가**: 같은 유닛에 COVER를 재적용하면 기존 COVER의 duration을 갱신(리프레시)한다. 새로운 COVER 인스턴스가 추가되지 않는다.

### §25.2 커버 발동 조건

적이 **후열(BACK) 아군**을 공격할 때, 같은 팀에 다음 조건을 모두 충족하는 유닛이 있으면 커버 발동:

1. **전열(FRONT)에 위치**
2. **COVER 버프 보유** (수비 모드)
3. **생존 상태** (isAlive === true)

### §25.3 커버 동작

커버 발동 시:
1. **피격 대상이 커버 유닛으로 변경** — 원래 타겟 대신 커버 유닛이 데미지를 받음
2. **데미지 계산은 그대로** — 공격자의 ATK × 배율로 계산, 커버 유닛의 실드가 흡수
3. **COVER_TRIGGERED 이벤트 기록** — sourceId: 공격자, targetId: 커버 유닛, data.originalTargetId: 원래 타겟
4. **커버는 1회 발동 후 COVER 버프 소멸하지 않음** — duration이 남아있는 한 라운드 내 여러 번 발동 가능

### §25.4 커버 유닛이 여러 명일 때

- COVER 버프를 가진 전열 유닛이 여러 명이면 **AGI가 가장 높은 유닛**이 커버
- 동률 시 유닛 배열 순서 (먼저 등장한 유닛)

### §25.5 커버가 발동하지 않는 경우

- 공격 대상이 **전열(FRONT)**에 있으면 커버 발동 안 함 (전열은 스스로 싸움)
- 커버 유닛 자신이 공격 대상이면 발동 안 함 (무한 루프 방지)
- ENEMY_ANY 타겟으로 전열 유닛이 선택된 경우도 커버 안 함 (이미 전열)

### §25.6 COVER 부여 액션 예시

Guardian의 Shield Wall 효과에 COVER 버프 추가:
```
effects: [
  { type: 'SHIELD', value: 1.0, stat: 'grd', target: 'SELF' },
  { type: 'SHIELD', value: 0.8, stat: 'grd', target: 'ALLY_LOWEST_HP' },
  { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: 'SELF' },
]
```

Advance Guard에도 COVER 부여:
```
effects: [
  { type: 'MOVE', target: 'SELF', position: 'FRONT' },
  { type: 'SHIELD', value: 1.2, stat: 'grd', target: 'SELF' },
  { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: 'SELF' },
]
```

### §25.7 이벤트

- `COVER_TRIGGERED`: 커버 발동 시 기록
  - `sourceId`: 공격자 ID
  - `targetId`: 커버 유닛 ID (실제 피격자)
  - `data.originalTargetId`: 원래 타겟 ID
  - `data.coverId`: 커버 유닛 ID

### §25.8 라운드 종료 시

- COVER 버프는 일반 버프와 동일하게 `tickBuffs()`에서 duration 감소
- duration 0이 되면 BUFF_EXPIRED로 제거

## 구현 위치

- `src/types/index.ts`: BuffType에 COVER 추가
- `src/systems/CoverSystem.ts`: 커버 판정 순수 함수
- `src/systems/DamageSystem.ts`: 데미지 적용 시 커버 체크 호출
- `src/data/ClassDefinitions.ts`: Guardian 액션에 COVER 버프 추가
