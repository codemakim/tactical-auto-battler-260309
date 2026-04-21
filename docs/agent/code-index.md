# Code Index

이 문서는 에이전트가 필요할 때 여는 코드/스펙/테스트 색인이다.
항상 읽는 문서가 아니라 작업별 탐색 비용을 줄이기 위한 참조다.

## Source Of Truth

### Core Specs

- 전투 규칙: [docs/combat-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/combat-spec.md)
- 구현 체크리스트: [docs/combat-impl-checklist.md](/Users/jhkim/Project/tactical-auto-battler/docs/combat-impl-checklist.md)
- 게임 흐름: [docs/game-flow-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/game-flow-spec.md)
- 런 구조: [docs/run-system-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/run-system-spec.md)

### Focused Specs

- 액션 카드: [docs/action-card-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/action-card-spec.md)
- 액션 표시: [docs/action-detail-display-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/action-detail-display-spec.md)
- 영입 상점: [docs/recruit-shop-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/recruit-shop-spec.md)
- 전술 유물: [docs/tactical-artifact-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/tactical-artifact-spec.md)
- 전장 진행: [docs/battlefield-progression-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/battlefield-progression-spec.md)
- 전투 유닛 표현: [docs/battle-unit-presentation-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/battle-unit-presentation-spec.md)
- 영웅 시스템: [docs/hero-system-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/hero-system-spec.md)
- 적 조우: [docs/enemy-encounter-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/enemy-encounter-spec.md)
- 교착 방지: [docs/stalemate-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/stalemate-spec.md)

### UI Specs

- 런 루프 UI: [docs/run-loop-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/run-loop-ui-spec.md)
- 런 맵/인트로: [docs/run-map-and-battle-intro-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/run-map-and-battle-intro-spec.md)
- 출격 UI: [docs/sortie-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/sortie-ui-spec.md)
- 보상 UI: [docs/reward-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/reward-ui-spec.md)
- 런 결과 UI: [docs/run-result-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/run-result-ui-spec.md)
- 편성 화면 계획: [docs/formation-scene-rework-plan.md](/Users/jhkim/Project/tactical-auto-battler/docs/formation-scene-rework-plan.md)
- 편성 존 UI: [docs/formation-zone-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/formation-zone-ui-spec.md)
- 편성 카드 UI: [docs/formation-card-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/formation-card-ui-spec.md)

## Code Map

### Core

- 전투 상태 생성/스텝/전체 실행: [src/core/BattleEngine.ts](/Users/jhkim/Project/tactical-auto-battler/src/core/BattleEngine.ts)
- 라운드/턴 오케스트레이션: [src/core/RoundManager.ts](/Users/jhkim/Project/tactical-auto-battler/src/core/RoundManager.ts)
- 런 오케스트레이션: [src/core/RunManager.ts](/Users/jhkim/Project/tactical-auto-battler/src/core/RunManager.ts)
- 전역 상태/저장 연결: [src/core/GameState.ts](/Users/jhkim/Project/tactical-auto-battler/src/core/GameState.ts)
- 타입 정의: [src/types/index.ts](/Users/jhkim/Project/tactical-auto-battler/src/types/index.ts)

### Systems

- 액션 해석: [src/systems/ActionResolver.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/ActionResolver.ts)
- 데미지/실드/힐: [src/systems/DamageSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/DamageSystem.ts)
- 버프/상태이상: [src/systems/BuffSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/BuffSystem.ts)
- 포지션 이동: [src/systems/PositionSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/PositionSystem.ts)
- 커버: [src/systems/CoverSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/CoverSystem.ts)
- 영웅 개입: [src/systems/HeroInterventionSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/HeroInterventionSystem.ts)
- 액션 카드: [src/systems/ActionCardSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/ActionCardSystem.ts)
- 보상: [src/systems/BattleRewardSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/BattleRewardSystem.ts)
- 전술 유물: [src/systems/TacticalArtifactSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/TacticalArtifactSystem.ts)
- 저장: [src/systems/SaveSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/SaveSystem.ts)
- 영입 상점: [src/systems/RecruitShop.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/RecruitShop.ts)
- 훈련: [src/systems/TrainingSystem.ts](/Users/jhkim/Project/tactical-auto-battler/src/systems/TrainingSystem.ts)

### Data And UI

- 클래스/카드 풀: [src/data/ClassDefinitions.ts](/Users/jhkim/Project/tactical-auto-battler/src/data/ClassDefinitions.ts)
- 영웅 정의: [src/data/HeroDefinitions.ts](/Users/jhkim/Project/tactical-auto-battler/src/data/HeroDefinitions.ts)
- 액션 풀: [src/data/ActionPool.ts](/Users/jhkim/Project/tactical-auto-battler/src/data/ActionPool.ts)
- 전술 유물 정의: [src/data/TacticalArtifacts.ts](/Users/jhkim/Project/tactical-auto-battler/src/data/TacticalArtifacts.ts)
- 전투 씬: [src/scenes/BattleScene.ts](/Users/jhkim/Project/tactical-auto-battler/src/scenes/BattleScene.ts)
- 마을 씬: [src/scenes/TownScene.ts](/Users/jhkim/Project/tactical-auto-battler/src/scenes/TownScene.ts)
- 편성 씬: [src/scenes/FormationScene.ts](/Users/jhkim/Project/tactical-auto-battler/src/scenes/FormationScene.ts)
- 공통 UI: [src/ui](/Users/jhkim/Project/tactical-auto-battler/src/ui)

## Task Search

- 전투 엔진: `rg "createBattleState|stepBattle|runFullBattle|executeTurn" src`
- 영웅 개입: `rg "queueIntervention|executeQueuedAbility|canIntervene" src`
- 액션 카드: `rg "replaceActionSlot|resetRunActions|generateBattleRewards" src`
- 런 시스템: `rg "createRun|startNextBattle|completeBattle|RunManager" src`
- 저장: `rg "SaveData|saveToStorage|loadFromStorage|runState" src`
- 영입 상점: `rg "RecruitShop|recruit|refreshShop|shopState" src`
- UI 씬: `rg "class .*Scene|extends Scene" src/scenes`

## Test Map

- 전투 흐름/엔진: [src/__tests__/battle-flow.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/battle-flow.spec.ts), [src/__tests__/engine-integration.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/engine-integration.spec.ts)
- 턴 순서: [src/__tests__/turn-order.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/turn-order.spec.ts), [src/__tests__/battle-scene-turnorder.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/battle-scene-turnorder.spec.ts)
- 액션 카드: [src/__tests__/action-card.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/action-card.spec.ts), [src/__tests__/action-card-badges.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/action-card-badges.spec.ts)
- 버프/지연 효과: [src/__tests__/buff-system.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/buff-system.spec.ts), [src/__tests__/delayed-effects.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/delayed-effects.spec.ts)
- 커버: [src/__tests__/cover-system.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/cover-system.spec.ts), [src/__tests__/cover-no-stack.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/cover-no-stack.spec.ts)
- 영웅: [src/__tests__/hero-abilities.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/hero-abilities.spec.ts), [src/__tests__/hero-intervention.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/hero-intervention.spec.ts)
- 런/보상: [src/__tests__/run-manager.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/run-manager.spec.ts), [src/__tests__/reward-calculator.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/reward-calculator.spec.ts)
- 전술 유물: [src/__tests__/tactical-artifact-system.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/tactical-artifact-system.spec.ts)
- 저장/타이틀: [src/__tests__/save-system.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/save-system.spec.ts), [src/__tests__/title-menu.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/title-menu.spec.ts)
- 영입 상점: [src/__tests__/recruit-shop.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/recruit-shop.spec.ts)
- 결정론/교착: [src/__tests__/determinism.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/determinism.spec.ts), [src/__tests__/stalemate.spec.ts](/Users/jhkim/Project/tactical-auto-battler/src/__tests__/stalemate.spec.ts)
