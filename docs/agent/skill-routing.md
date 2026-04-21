# Skill Routing

이 문서는 로컬 `.codex/skills`를 언제 쓰는지 정리한다.
루트 `AGENTS.md`에는 짧은 트리거만 남기고, 세부 경계는 여기서 관리한다.

## Core Flow Skills

### `spec-to-implementation`

사용 시점:
- primary spec이 있고 구현으로 바로 들어갈 수 있을 때
- 테스트를 먼저 쓰고 구현해야 할 때

하지 말 것:
- 스펙이 빈 상태에서 억지로 구현하지 않는다.
- 범위가 계속 커지면 `feature-cut-mvp`로 전환한다.

### `task-closeout`

사용 시점:
- 구현과 검증이 끝났고 다음 모델이 이어받을 수 있게 정리할 때
- `WORKLOG.md`, 체크리스트, source spec을 최신화할 때

하지 말 것:
- 긴 회고나 개발 로그를 `WORKLOG.md`에 넣지 않는다.

## Planning Skills

### `meta-loop-spec-writer`

사용 시점:
- 기능 규칙 자체가 아직 흐릴 때
- 저장 구조, UI 책임, 진입/종료 조건을 새로 정해야 할 때
- 예: 영입 상점, 런 종료 메타, 전술 유물 같은 새 루프

결과:
- 구현 가능한 source spec 초안
- MVP 범위
- save/load 영향
- abuse prevention

### `feature-cut-mvp`

사용 시점:
- 방향은 정해졌지만 1차 구현 범위가 커질 때
- 유저 아이디어가 여러 단계로 번질 때

경계:
- `meta-loop-spec-writer`는 “무엇인지 정하기”
- `feature-cut-mvp`는 “어디까지 할지 자르기”

### `spec-reconciliation`

사용 시점:
- 여러 문서가 서로 다를 때
- 코드와 스펙이 다른데 어느 쪽이 맞는지 결정해야 할 때
- stale spec을 정리해야 할 때

결과:
- source of truth 선언
- stale/superseded 정리
- 구현자가 바로 테스트를 쓸 수 있는 계약

## Quality Skills

### `bug-fix`

사용 시점:
- 시작점이 기능 요청이 아니라 깨진 동작일 때

필수:
- 재현 먼저
- 회귀 테스트
- 원인 설명

### `scene-boundary-refactor`

사용 시점:
- 씬이 상수, 그래픽, HUD, 오버레이, 상태 계산을 모두 들고 있을 때
- 기능을 더 얹기 전에 경계를 정리해야 할 때

권장 순서:
1. constants/style
2. graphics helper
3. overlay
4. board/roster/HUD view
5. pure state selector

### `ui-polish-guardrail`

사용 시점:
- 화면이 개발툴, 관리자 화면, 문서형 UI처럼 보일 때
- UI copy가 길거나 괄호/설명문이 많을 때
- 패널이 너무 많아 게임 화면의 초점이 사라질 때

기준:
- 세부 시각 기준은 [DESIGN.md](/Users/jhkim/Project/tactical-auto-battler/DESIGN.md)를 따른다.

### `balance-tuning`

사용 시점:
- 스탯, 보상, 비용, 인카운터 난이도 같은 숫자를 조정할 때

필수:
- `npx tsx src/sim-run.ts` 기반 before/after 비교
- seed 기록
- 한 번에 하나의 레버 우선

## Failure Routing

- 스펙이 약함 → `meta-loop-spec-writer`
- 스펙 충돌 → `spec-reconciliation`
- 범위가 비대해짐 → `feature-cut-mvp`
- 구현 중 깨진 동작 발견 → 현재 작업 중단 후 `bug-fix` 범위 분리
- 씬 구조 리스크 → `scene-boundary-refactor`
- 게임 UI 톤 리스크 → `ui-polish-guardrail`
- 숫자 밸런스 이슈 → `balance-tuning`
- 구현 완료 후 마감 → `task-closeout`
