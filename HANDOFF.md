# HANDOFF.md

이 문서는 Claude와 Codex 사이에서 현재 작업 상태를 짧게 넘기기 위한 실시간 핸드오프 보드다.

## Rules

- 이 문서는 "현재 진행 중인 작업"만 유지한다.
- 내용을 확인한 모델은 필요하면 비우거나 다음 작업 기준으로 갱신한다.
- 긴 설계 문서는 `docs/` 또는 루트 운영 문서에 남기고, 여기에는 실행에 필요한 최소 정보만 적는다.
- `primary` 스펙 1개를 반드시 명시한다.
- 작업 완료 후에는 `Done`, `Next`, `Verification`를 최신 상태로 갱신한다.

## Current Task

- P2 진행 중: 다음 권장 작업은 P2-6 배속 조절

## Source Specs

- primary: [docs/game-flow-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/game-flow-spec.md) (§6-1 전투 화면)
- secondary: [docs/combat-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/combat-spec.md) (§20 전투 템포)
- checklist: [docs/combat-impl-checklist.md](/Users/jhkim/Project/tactical-auto-battler/docs/combat-impl-checklist.md)

## Done

- P1-1 리트라이 흐름 개선 (Claude)
- P1-2 런 중 편성 조정 완료 (Codex)
- P1-3 세이브/로드 시스템 MVP 완료 (Codex)
- P1-4 Town 골드/영웅 정보 표시 완료 (Codex)
- P2-5 전투 템포 상수화 완료 (Codex)

## Next — P2 Plan (전투 체감 개선)

4개 작업, 독립적이므로 순서 무관. 각각 단독 커밋 가능.

### P2-5: 전투 템포 (애니메이션 타이밍)
- 스펙: combat-spec.md §20
- 파일: `src/scenes/BattleScene.ts` (doStep, 애니메이션 타이밍)
- 목표: 액션 0.6~0.8s, 결과 딜레이 0.2s, 다음 액션 딜레이 0.4~0.6s
- 완료: `src/systems/BattleTempo.ts` 추가, 700ms/200ms/500ms 상수 적용

### P2-6: 배속 조절 (1x / 2x / 스킵)
- 스펙: game-flow-spec.md §6-1
- 파일: `src/scenes/BattleScene.ts`
- 목표: 배속 토글 버튼 (1x↔2x↔skip), 타이밍 상수에 배율 적용
- P2-5 이후가 이상적 (타이밍 상수가 있어야 배율 곱하기 가능)

### P2-7: 턴 인디케이터 갱신
- 스펙: combat-spec.md §4
- 파일: `src/scenes/BattleScene.ts` (턴 큐 UI)
- 목표: 유닛 행동 완료 후 즉시 턴 큐 시각적 갱신 (현재 라운드 변경 시에만 갱신될 수 있음)

### P2-8: 히어로 개입 UI 상태 (READY/QUEUED/USED)
- 스펙: [docs/hero-intervention-ui-state-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/hero-intervention-ui-state-spec.md)
- 파일: `src/scenes/BattleScene.ts` (영웅 개입 버튼 영역)
- 목표: 개입 버튼이 상태별로 시각 변화 (READY=활성, QUEUED=펄스, USED=비활성)
- 관련 타입: `HeroButtonState` (이미 정의됨)

### 작업 순서 권장
P2-5 → P2-6 (의존) → P2-7, P2-8 (독립)

## Guardrails

- `.claude/`는 현재 작업 범위 밖이다.
- 스펙 충돌 시 `Source of Truth` 표기가 있는 문서를 우선한다.
- 체크리스트 갱신 시 작업자와 날짜를 남긴다.

## Verification

- 마지막 완료 작업 기준:
  - `npm test -- battle-tempo battle-scene-turnorder engine-integration hero-button-state`
  - `npx tsc --noEmit`

## Notes

- 운영 규칙: [WORKFLOW.md](/Users/jhkim/Project/tactical-auto-battler/WORKFLOW.md)
- 저장소 인덱스: [AGENTS.md](/Users/jhkim/Project/tactical-auto-battler/AGENTS.md)
