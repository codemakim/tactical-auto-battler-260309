# AGENTS.md

이 문서는 이 저장소에서 작업하는 보조 에이전트용 운영 인덱스다.
기존 설계 문서를 대체하지 않는다. 우선순위와 진입점을 빠르게 찾기 위한 문서다.

## 1. Working Agreement

- 기존 설계 기준은 먼저 [CLAUDE.md](/Users/jhkim/Project/tactical-auto-battler/CLAUDE.md)를 읽는다.
- 작업 절차와 핸드오프 규칙은 [WORKFLOW.md](/Users/jhkim/Project/tactical-auto-battler/WORKFLOW.md)를 따른다.
- 실시간 작업 상태는 [HANDOFF.md](/Users/jhkim/Project/tactical-auto-battler/HANDOFF.md)에서 확인한다.
- 세부 규칙은 `docs/` 스펙 문서를 기준으로 판단한다.
- 구현 전에는 관련 테스트와 현재 구현 파일을 함께 본다.
- 변경은 가능한 한 작은 단위로 한다.
- 이 저장소는 타입 중심 + 순수 함수 중심 구조다. `class` 추가보다 기존 패턴 확장을 우선한다.
- `enum` 대신 `as const` + union type 패턴을 유지한다.
- 사용자가 만든 기존 변경사항은 되돌리지 않는다.

## 2. First 5 Minutes

작업 시작 시 아래 순서로 컨텍스트를 잡는다.

1. [CLAUDE.md](/Users/jhkim/Project/tactical-auto-battler/CLAUDE.md)
2. 관련 스펙 1~2개
3. 관련 구현 파일
4. 관련 테스트 파일
5. 필요 시 `npm test -- <pattern>` 또는 전체 `npm test`

기능별 대표 검색:

- 전투 엔진: `rg "createBattleState|stepBattle|runFullBattle|executeTurn" src`
- 영웅 개입: `rg "queueIntervention|executeQueuedAbility|canIntervene" src`
- 액션 카드: `rg "replaceActionSlot|resetRunActions|generateBattleRewards" src`
- 런 시스템: `rg "createRun|startNextBattle|completeBattle|RunManager" src`
- UI 씬: `rg "class .*Scene|extends Scene" src/scenes`

## 3. Source Of Truth

### Project overview

- 개요/구조/명령어: [CLAUDE.md](/Users/jhkim/Project/tactical-auto-battler/CLAUDE.md)

### Core specs

- 전투 규칙: [docs/combat-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/combat-spec.md)
- 구현 체크리스트: [docs/combat-impl-checklist.md](/Users/jhkim/Project/tactical-auto-battler/docs/combat-impl-checklist.md)
- 게임 흐름: [docs/game-flow-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/game-flow-spec.md)
- 런 구조: [docs/run-system-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/run-system-spec.md)

### Focused specs

- 액션 카드: [docs/action-card-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/action-card-spec.md)
- 지연 효과: [docs/delayed-effect-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/delayed-effect-spec.md)
- 커버 시스템: [docs/cover-system-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/cover-system-spec.md)
- 영웅 시스템: [docs/hero-system-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/hero-system-spec.md)
- 적 조우: [docs/enemy-encounter-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/enemy-encounter-spec.md)
- 교착 방지: [docs/stalemate-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/stalemate-spec.md)

### UI specs

- 런 루프 UI: [docs/run-loop-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/run-loop-ui-spec.md)
  Scene 전이 일부는 후속 스펙으로 대체됨
- 런 맵/인트로: [docs/run-map-and-battle-intro-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/run-map-and-battle-intro-spec.md)
  RunMap/Formation/Battle 전이의 현재 기준 문서
- 전투 결과 UI: [docs/battle-result-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/battle-result-ui-spec.md)
- 런 결과 UI: [docs/run-result-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/run-result-ui-spec.md)
- 보상 UI: [docs/reward-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/reward-ui-spec.md)
- 리플레이 UI: [docs/replay-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/replay-ui-spec.md)
- 편성 존 UI: [docs/formation-zone-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/formation-zone-ui-spec.md)
- 편성 카드 UI: [docs/formation-card-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/formation-card-ui-spec.md)
- 개입 버튼 상태: [docs/hero-intervention-ui-state-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/hero-intervention-ui-state-spec.md)
- 유닛 레이아웃: [docs/unit-layout-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/unit-layout-spec.md)
- 전투 플로팅 텍스트: [docs/battle-floating-text-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/battle-floating-text-spec.md)

## 4. Code Map

### High-value entry points

- 전투 상태 생성/스텝/전체 실행: [src/core/BattleEngine.ts](/Users/jhkim/Project/tactical-auto-battler/src/core/BattleEngine.ts)
- 라운드/턴 오케스트레이션: [src/core/RoundManager.ts](/Users/jhkim/Project/tactical-auto-battler/src/core/RoundManager.ts)
- 런 오케스트레이션: [src/core/RunManager.ts](/Users/jhkim/Project/tactical-auto-battler/src/core/RunManager.ts)
- 타입 정의 중심: [src/types/index.ts](/Users/jhkim/Project/tactical-auto-battler/src/types/index.ts)

### Rules systems

- 액션 해석: [src/systems/ActionResolver.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/ActionResolver.ts)
- 데미지/실드/힐: [src/systems/DamageSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/DamageSystem.ts)
- 버프/상태이상: [src/systems/BuffSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/BuffSystem.ts)
- 포지션 이동: [src/systems/PositionSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/PositionSystem.ts)
- 커버: [src/systems/CoverSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/CoverSystem.ts)
- 영웅 개입: [src/systems/HeroInterventionSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/HeroInterventionSystem.ts)
- 지연 효과: [src/systems/DelayedEffectSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/DelayedEffectSystem.ts)
- 액션 카드: [src/systems/ActionCardSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/ActionCardSystem.ts)
- 보상: [src/systems/BattleRewardSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/BattleRewardSystem.ts)
- 훈련: [src/systems/TrainingSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/TrainingSystem.ts)

### Data and UI

- 클래스/카드 풀: [src/data/ClassDefinitions.ts](/Users/jhkim/Project/tactical-auto-battler/src/data/ClassDefinitions.ts)
- 영웅 정의: [src/data/HeroDefinitions.ts](/Users/jhkim/Project/tactical-auto-battler/src/data/HeroDefinitions.ts)
- 액션 풀: [src/data/ActionPool.ts](/Users/jhkim/Project/tactical-auto-battler/src/data/ActionPool.ts)
- 전투 씬: [src/scenes/BattleScene.ts](/Users/jhkim/Project/tactical-auto-battler/src/scenes/BattleScene.ts)

## 5. Task Routing

작업 유형별로 먼저 볼 파일:

- 전투 규칙 수정
  - [docs/combat-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/combat-spec.md)
  - [src/core/BattleEngine.ts](/Users/jhkim/Project/tactical-auto-battler/src/core/BattleEngine.ts)
  - [src/core/RoundManager.ts](/Users/jhkim/Project/tactical-auto-battler/src/core/RoundManager.ts)
  - 관련 `src/systems/*.ts`

- 새 액션/카드 추가
  - [docs/action-card-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/action-card-spec.md)
  - [src/data/ClassDefinitions.ts](/Users/jhkim/Project/tactical-auto-battler/src/data/ClassDefinitions.ts)
  - [src/systems/ActionCardSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/ActionCardSystem.ts)
  - [src/systems/ActionResolver.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/ActionResolver.ts)

- 영웅 능력/개입 변경
  - [docs/hero-system-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/hero-system-spec.md)
  - [docs/hero-intervention-ui-state-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/hero-intervention-ui-state-spec.md)
  - [src/systems/HeroInterventionSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/HeroInterventionSystem.ts)
  - [src/data/HeroDefinitions.ts](/Users/jhkim/Project/tactical-auto-battler/src/data/HeroDefinitions.ts)
  - [src/scenes/BattleScene.ts](/Users/jhkim/Project/tactical-auto-battler/src/scenes/BattleScene.ts)

- 런 진행/보상/UI 변경
  - [docs/run-system-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/run-system-spec.md)
  - [docs/run-loop-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/run-loop-ui-spec.md)
  - [docs/reward-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/reward-ui-spec.md)
  - [src/core/RunManager.ts](/Users/jhkim/Project/tactical-auto-battler/src/core/RunManager.ts)
  - [src/systems/BattleRewardSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/BattleRewardSystem.ts)

- 전투 UI/연출 변경
  - [docs/unit-layout-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/unit-layout-spec.md)
  - [docs/battle-floating-text-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/battle-floating-text-spec.md)
  - [docs/replay-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/replay-ui-spec.md)
  - [src/scenes/BattleScene.ts](/Users/jhkim/Project/tactical-auto-battler/src/scenes/BattleScene.ts)
  - [src/ui/](/Users/jhkim/Project/tactical-auto-battler/src/ui)

## 6. Test Map

대표 테스트 위치:

- 전투 흐름/엔진: [src/__tests__/battle-flow.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/battle-flow.spec.ts), [src/__tests__/engine-integration.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/engine-integration.spec.ts)
- 턴 순서: [src/__tests__/turn-order.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/turn-order.spec.ts), [src/__tests__/battle-scene-turnorder.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/battle-scene-turnorder.spec.ts)
- 액션 카드: [src/__tests__/action-card.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/action-card.spec.ts)
- 버프/지연 효과: [src/__tests__/buff-system.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/buff-system.spec.ts), [src/__tests__/delayed-effects.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/delayed-effects.spec.ts)
- 커버: [src/__tests__/cover-system.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/cover-system.spec.ts), [src/__tests__/cover-no-stack.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/cover-no-stack.spec.ts)
- 영웅: [src/__tests__/hero-abilities.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/hero-abilities.spec.ts), [src/__tests__/hero-intervention.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/hero-intervention.spec.ts), [src/__tests__/hero-intervention-queuing.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/hero-intervention-queuing.spec.ts)
- 런/보상: [src/__tests__/run-manager.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/run-manager.spec.ts), [src/__tests__/reward-calculator.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/reward-calculator.spec.ts), [src/__tests__/battle-reward.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/battle-reward.spec.ts)
- 결정론/교착: [src/__tests__/determinism.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/determinism.spec.ts), [src/__tests__/stalemate.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/stalemate.spec.ts)

작업 시에는 관련 테스트만 먼저 좁혀서 돌리고, 마무리 단계에서 전체 `npm test`를 고려한다.

## 7. Commands

- 개발 서버: `npm run dev`
- 전체 테스트: `npm test`
- 감시 테스트: `npm run test:watch`
- 빌드: `npm run build`
- 포맷: `npm run format`
- 시뮬레이션: `npx tsx src/sim.ts`
- 런 시뮬레이션: `npx tsx src/sim-run.ts`

## 8. Current Observations

- 현재 구현 체크리스트 기준으로 UI 상태 전환, 전투 템포 연출 등은 미완 항목이 남아 있다.
- 따라서 UI 작업 전에는 반드시 관련 스펙과 `BattleScene` 현재 구현을 같이 확인해야 한다.
- `.claude/` 디렉터리는 존재하지만 현재 확인된 문서는 설정 파일뿐이다. 실제 작업 기준 문서는 루트 `CLAUDE.md`와 `docs/`가 중심이다.

## 9. When Updating Docs

- 새 기능을 추가하면 관련 스펙 또는 체크리스트도 같이 갱신할지 확인한다.
- 구현이 스펙과 다르면 임의로 코드만 맞추지 말고 차이를 명시한다.
- 체크리스트를 갱신하면 작업자와 날짜를 남긴다. 예: `(Codex, 2026-03-30)`
- 루트 문서 역할 분리:
  - `CLAUDE.md`: 프로젝트 개요와 기본 규칙
  - `AGENTS.md`: 작업 진입용 인덱스와 운영 절차
