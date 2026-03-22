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
- [x] 방어 행동 우선권 (§4.1, defensivePriority 플래그 — 방어 유닛 선행 실행)
- [ ] 행동 후 즉시 턴 인디케이터 갱신 (UI)

## 라운드 (§5, §6, §7)

- [x] 라운드 = 모든 생존 유닛이 1회 행동
- [x] 행동 실패해도 턴 소모
- [x] 라운드 시작: hasActedThisRound 리셋
- [x] 라운드 시작: 턴 순서 재계산
- [x] 라운드 시작: 히어로 개입 횟수 충전
- [x] 라운드 시작: 상태이상 처리 (§6.5) — POISON/REGEN 틱, 사망 처리
- [x] 라운드 종료: 버프/디버프 지속시간 감소 (§7.1) — 만료 시 제거 + 이벤트
- [x] 라운드 종료: 지연 효과 해석 (§7.2) — DelayedEffectSystem, 31개 테스트
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
- [x] HP_ABOVE
- [x] ALLY_HP_BELOW_PERCENT
- [x] ENEMY_IN_FRONT (= ENEMY_FRONT_EXISTS)
- [x] ENEMY_IN_BACK (= ENEMY_BACK_EXISTS)
- [x] ENEMY_HP_BELOW (적 HP 임계값 이하 조건 — Archer Focus Fire 등)
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
- [x] Banish (Controller 기본 — 적 전열을 후열로 밀기 + 소량 데미지, PUSH 효과 사용)
- [x] ApplyBuff (BUFF/DEBUFF 효과, BuffType 기반, 지속시간)
- [x] DelayTurn (액션 효과로 연결 완료)
- [x] AdvanceTurn (액션 효과로 연결 완료)
- [x] Swap (두 유닛 위치 교환 — Controller Displace/Break Formation)
- [x] Pull (PUSH + position: FRONT로 구현 — Controller Gravity Pull/Expose Weakness)

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
- [x] 투입 라운드에는 행동 불가 (hasActedThisRound: true로 진입) — battle-flow 테스트로 검증
- [x] 다음 라운드부터 참전

## 히어로 개입 (§17, §18, §19)

- [x] 라운드당 최소 1회
- [x] 라운드 시작 시 충전
- [x] 횟수 소진 시 사용 불가
- [x] 개입 큐잉 (§18 스펙 일치): heroIntervene() = queueIntervention() 래퍼, 다음 유닛 행동 직전 자동 발동 (executeTurn 내), 24개 테스트
- [ ] 개입 UI 상태 전환 (READY → QUEUED → USED) 실제 렌더링
- [ ] 개입 UI 상태 (READY / QUEUED / USED) — BattlePhase/Hero 상태 기반 렌더링

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

- [x] 골드 — calculateGoldReward (기본 + 라운드 보너스 + 난이도 배율, 패배 시 감소)
- [x] 임시 액션 보상 — generateBattleRewards / applyReward (5개 옵션, seed 결정론적)
- [x] 캐릭터 획득 기회 — generateCharacterReward (확률 30%+난이도보너스-로스터패널티, seed 결정론, 11개 테스트)

## 캐릭터 훈련 (§24)

- [x] 훈련 레벨에 따른 스탯 증가 (테스트 있음)
- [x] 골드 소비 — calculateTrainingCost / canAffordTraining / trainCharacter (21개 테스트)
- [x] 액션 슬롯 변경 없음

## 액션 카드 시스템 (action-card-spec.md)

- [x] 3 액션 슬롯, 우선순위 평가
- [x] 각 클래스별 테스트용 3개 슬롯 정의 (ClassDefinitions.testActionSlots, TODO: 제거 예정)
- [x] BattleUnit.baseActionSlots — 런 리셋 참조용
- [x] Action 타입에 rarity 필드
- [x] Action 타입에 classRestriction 필드
- [x] 클래스 제한 필터링 (테스트 있음)
- [x] 보상 생성 로직 — 5개 옵션, 결정론적 (테스트 있음)
- [x] 액션 교체 로직 — 모든 슬롯(0~2) 교체 가능, 유효하지 않은 인덱스만 차단 (테스트 있음)
- [x] 런 종료 시 baseActionSlots로 원래 3개 슬롯 복원 (테스트 있음)
- [x] 액션 카드 템플릿 — 6개 클래스 카드 풀 완비 (ClassDefinitions.cardTemplates)
- [x] 카드 템플릿 랜덤화 — multiplierPool/targetPool에서 seed 기반 결정론적 선택

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

## 영웅 시스템 (§26~§28, hero-system-spec.md)

- [x] 공통 능력: heroEditAction — 전투 중 액션 슬롯 교체 (개입 1회 소모)
- [x] preBattleActionSlots 스냅샷 (createBattleState)
- [x] 전투 종료 후 원복 (restorePreBattleActions)
- [x] ACTION_EDITED 이벤트 타입
- [x] 아군만 편집, 적군/사망 유닛 불가
- [x] 예비 유닛도 스냅샷/원복 대상
- [x] HeroType 타입 정의 (COMMANDER, MAGE, SUPPORT)
- [x] HeroDefinitions.ts — 영웅별 능력 레지스트리 (COMMON_EDIT_ACTION + UNIQUE 능력)
- [x] 특화 능력 구현 — COMMANDER(Rally ATK_UP, Shield Order 실드), MAGE(Fireball 데미지, Weaken ATK_DOWN), SUPPORT(Heal 회복, Haste 턴앞당김)
- [x] 다중 능력 보유: AbilityCategory(COMMON/UNIQUE) × AbilityType(EFFECT/EDIT_ACTION)
- [x] createBattleState에서 HERO_DEFINITIONS 자동 참조
- [x] preBattleActionSlots 스냅샷 + 전투 종료 restorePreBattleActions 원복
- [x] 31개 테스트 (hero-edit-action.spec.ts 13개 + hero-abilities.spec.ts 18개)

## 커버 시스템 (§25, cover-system-spec.md)

- [x] COVER BuffType 추가
- [x] COVER 중첩 불가 — 재적용 시 duration 갱신 (5개 테스트, cover-no-stack.spec.ts)
- [x] COVER_TRIGGERED BattleEventType 추가
- [x] findCoverUnit — 후열 타겟 공격 시 같은 팀 전열 COVER 유닛 탐색 (AGI 우선)
- [x] applyDamageWithCover — 커버 판정 포함 데미지 적용
- [x] ActionResolver DAMAGE 처리에 커버 연결
- [x] Guardian Advance Guard — 후열→전열 복귀 + 실드 + COVER 부여
- [x] Guardian Shield Wall — 자기 실드 + 아군 실드 + COVER 부여
- [x] 커버 발동 조건: 타겟 후열 + 커버 유닛 전열 + COVER 버프 + 생존
- [x] 커버 미발동 조건: 타겟 전열, 본인이 타겟, 다른 팀
- [x] 커버 다회 발동: duration 내 여러 번 가능
- [x] 커버 유닛 사망 가능
- [x] 13개 테스트 (cover-system.spec.ts)

## 포지션 제약 (근접 공격)

- [x] ENEMY_FRONT 타겟: 전열 우선, 없으면 후열 폴백
- [x] ENEMY_BACK 타겟: 후열 우선, 없으면 전열 폴백
- [x] Warrior Strike — POSITION_FRONT 조건 (후열에서 사용 불가)
- [x] Lancer Thrust — POSITION_FRONT 조건
- [x] Controller Strike — POSITION_FRONT 조건
- [x] Assassin Gut Strike — POSITION_FRONT 조건

## 클래스별 카드 풀 현황

6개 클래스 카드 풀 완비 (ClassDefinitions.ts cardTemplates 기준)

### Warrior
- 기본: Shield Bash(딜+실드), Fortify(HP<50 긴급실드), Strike(기본), Advance(후열→전열), Hold Ground(전열 실드)
- 특수: Heavy Slam(RARE 고배율), Iron Wall(전열 실드), Driving Blow(RARE 딜+PUSH), Execution Cut(HP<30 마무리, COMMON/RARE 2종)

### Lancer
- 기본: Charge(후열→전열 돌진), Lance Strike, Thrust, Retreat
- 특수: Piercing Thrust(RARE 고배율), Sweep(딜+PUSH), Skewer(RARE 딜+PUSH)

### Archer
- 설계 철학: "조건부 원거리 딜러" — BACK에서만 강하고, ALWAYS 카드 0장. Controller 시너지로 극대화.
- BACK 카드(4장): Aimed Shot(후열 저격), Volley(범용 사격), Suppressing Shot(딜+DELAY 견제), Poison Arrow(EPIC 딜+GUARD_DOWN)
- FRONT 탈출(3장): Evasive Shot(딜+후퇴), Disengage(즉시 후퇴), Snap Shot(딜+DELAY 버팀)
- 조건부 고배율(2장): Snipe(RARE ENEMY_BACK_EXISTS 킬카드), Focus Fire(RARE HP<30 마무리)

### Guardian
- 기본: Advance Guard(전열 복귀+실드+COVER), Shield Wall(자기+아군 실드+COVER), Heavy Shield(HP<50 긴급 실드)
- 특수: Bulwark(RARE 고실드+COVER), Fortified Wall(전열 실드), Iron Bastion(RARE 고실드)

### Controller
- 기본: Disrupt(전열 딜+DELAY), Mind Jolt(후열 딜+DELAY), Guard(폴백)
- 특수: Gravity Pull(RARE 적 PULL), Expose Weakness(RARE 저HP PULL), Displace(SWAP), Break Formation(RARE 고ATK SWAP), Mind Slow(DELAY 2)

### Assassin
- 설계 철학: "침투형 리스크 딜러" — BACK→FRONT 돌진, 탈출 어려움(의도적). Archer와 후열 제거 역할 공유하되 접근법 상반.
- 침투 카드(2장): Dive(FRONT이동+후열공격), Shadowstep(이동만)
- 전열 공격(3장): Gut Strike(기본), Swift Blade(RARE 딜+ADVANCE_TURN), Venomous Strike(RARE 딜+GUARD_DOWN)
- 탈출(1장): Withdraw(HP<40 딜+후퇴, 의도적으로 적음)
- 핵심 킬(1장): Shadow Strike(EPIC FRONT에서 후열 x1.8~2.0 처형)

## 테스트 현황

- 28개 테스트 파일, 351개 테스트 전체 통과 (2026-03-19 기준)
