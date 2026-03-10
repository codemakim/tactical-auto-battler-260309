# Combat Implementation Checklist

스펙(combat-spec.md) 기반 구현 상태 추적.
각 항목은 스펙 섹션 번호에 대응.

## 범례

- [x] 구현 완료 + 테스트 있음
- [~] 부분 구현 (핵심 로직만, 세부 미완)
- [ ] 미구현

---

## 전장 & 팀 구조 (§2, §3)

- [x] FRONT / BACK 두 포지션
- [x] 같은 포지션에 여러 유닛 가능
- [x] 3 vs 3 포맷
- [x] 예비 유닛 1명

## 턴 순서 (§4)

- [x] AGI 기반 동적 턴 순서
- [x] 피아 혼합 정렬
- [x] 죽은 유닛 제외
- [x] 턴 가속 / 지연 함수
- [ ] 행동 후 즉시 턴 인디케이터 갱신 (UI)

## 라운드 (§5, §6, §7)

- [x] 라운드 = 모든 생존 유닛이 1회 행동
- [x] 행동 실패해도 턴 소모
- [x] 라운드 시작: hasActedThisRound 리셋
- [x] 라운드 시작: 턴 순서 재계산
- [x] 라운드 시작: 히어로 개입 횟수 충전
- [x] 라운드 시작: 상태이상 처리 (§6.5) — POISON/REGEN 틱, 사망 처리
- [x] 라운드 종료: 버프/디버프 지속시간 감소 (§7.1) — 만료 시 제거 + 이벤트
- [ ] 라운드 종료: 지연 효과 해석 (§7.2)
- [x] 라운드 종료: 예비 유닛 투입 (항상 BACK 진입)

## 액션 슬롯 (§8, §9, §10)

- [x] 3 슬롯, 우선순위 평가
- [x] 첫 번째 조건 충족 액션 실행 후 중단
- [x] 조건 불충족 시 턴 손실
- [x] 턴 손실 이벤트 기록

## 액션 조건 (§11)

- [x] POSITION_FRONT
- [x] POSITION_BACK
- [x] HP_BELOW_PERCENT
- [x] ALLY_HP_BELOW_PERCENT
- [x] ENEMY_IN_FRONT (= ENEMY_FRONT_EXISTS)
- [x] ENEMY_IN_BACK (= ENEMY_BACK_EXISTS)
- [x] LOWEST_HP_ENEMY
- [x] FIRST_ACTION_THIS_ROUND
- [x] HAS_HERO_BUFF

## 액션 효과 (§12)

- [x] Attack (DAMAGE)
- [x] Defend / Shield
- [x] MoveForward / MoveBack (MOVE)
- [x] PushEnemy (PUSH)
- [x] ChargeAttack (복합 효과 순서 검증 완료)
- [x] Reposition (아군 위치 변경 — ALLY_ANY, ALLY_LOWEST_HP 타겟팅)
- [x] ApplyBuff (BUFF/DEBUFF 효과, BuffType 기반, 지속시간)
- [x] DelayTurn (액션 효과로 연결 완료)
- [x] AdvanceTurn (액션 효과로 연결 완료)

## 포지션 변경 (§13, §14)

- [x] FRONT ↔ BACK 이동
- [x] 즉시 적용
- [x] 이미 같은 위치면 무효과
- [x] Charge 복합 효과 순서 검증

## 유닛 사망 (§15)

- [x] HP ≤ 0 즉시 사망
- [x] 턴 순서에서 제거
- [x] 사망 이벤트 기록
- [x] 사망 유닛 이후 행동 불가

## 예비 유닛 (§16)

- [x] 사망 시 예비 유닛 투입
- [x] 진입 위치: 항상 BACK
- [x] 투입 라운드에는 행동 불가
- [x] 다음 라운드부터 참전

## 히어로 개입 (§17, §18, §19)

- [x] 라운드당 최소 1회
- [x] 라운드 시작 시 충전
- [x] 횟수 소진 시 사용 불가
- [x] 턴 사이에 끼어들기 (효과 즉시 적용)
- [~] 개입 큐잉 (QUEUED 상태) — 타입 정의 있음, 큐 실행 로직 미구현
- [ ] 개입 UI 상태 (READY / USED / QUEUED)

## 결정론 (§19 / data-model-spec)

- [x] BattleState에 seed 필드
- [x] 같은 seed → 동일한 결과 검증
- [x] BattleEvent에 고유 id (uid 카운터 기반)
- [x] 이벤트 id 고유성 검증

## 전투 템포 (§20)

- [ ] 액션 애니메이션 0.6~0.8초
- [ ] 결과 딜레이 0.2초
- [ ] 다음 액션 딜레이 0.4~0.6초

## 리플레이 (§21)

- [x] 이벤트 시퀀스 기록
- [x] 스냅샷 기록 함수
- [x] 이벤트 조회 (인덱스, 라운드)
- [ ] play / pause / step forward / step backward
- [ ] jump to round

## 승리 조건 (§22)

- [x] 적 전멸 = 승리
- [x] 아군 전멸 = 패배
- [x] 최대 라운드 초과 = 패배

## 전투 보상 (§23)

- [ ] 골드
- [ ] 임시 액션 보상
- [ ] 캐릭터 획득 기회

## 캐릭터 훈련 (§24)

- [x] 훈련 레벨에 따른 스탯 증가 (테스트 있음)
- [ ] 골드 소비
- [x] 액션 슬롯 변경 없음

## 액션 카드 시스템 (action-card-spec.md)

- [x] 3 액션 슬롯, 우선순위 평가
- [x] Action 타입에 rarity 필드
- [x] Action 타입에 classRestriction 필드
- [x] 클래스 제한 필터링 (테스트 있음)
- [x] 보상 생성 로직 — 5개 옵션, 결정론적 (테스트 있음)
- [x] 액션 교체 로직 — 기본 액션 보호 (테스트 있음)
- [x] 런 종료 시 임시 액션 제거 (테스트 있음)
- [~] 액션 카드 예시 데이터 (ActionPool에 기본 데이터 있음)

## 버프/디버프 시스템

- [x] BuffType 타입 정의 (ATK_UP/DOWN, DEF_UP/DOWN, AGI_UP/DOWN, POISON, REGEN, STUN)
- [x] Buff 인터페이스 (id, type, value, duration, sourceId)
- [x] BattleUnit.buffs 필드
- [x] getEffectiveStats — 버프 반영 스탯 계산
- [x] 데미지 계산에 유효 스탯 반영
- [x] applyBuff — 버프 적용 + 이벤트 (BUFF_APPLIED / DEBUFF_APPLIED)
- [x] tickBuffs — 라운드 종료 시 duration 감소, 만료 제거 + BUFF_EXPIRED 이벤트
- [x] processStatusEffects — 라운드 시작 시 POISON/REGEN 틱 + 사망 처리
- [x] isStunned — 스턴 판별, 스턴 시 턴 스킵 (ACTION_SKIPPED reason: stunned)
