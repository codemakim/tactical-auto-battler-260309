# WORKFLOW.md

이 문서는 이 저장소에서 Claude/Codex가 공통으로 따르는 작업 표준이다.

## 1. Default Flow

작업은 아래 순서로 진행한다.

1. 기준 스펙 확인
2. 계획 수립
3. 스펙 기반 테스트 작성 또는 기존 테스트 보강
4. 테스트를 만족하도록 구현
5. 테스트 재검증
6. staged diff 기준으로 [.codex/agents/senior-reviewer.md](/Users/jhkim/Project/tactical-auto-battler/.codex/agents/senior-reviewer.md) 독립 리뷰 에이전트 1회 점검
7. 리뷰 반영 및 필요 시 리팩터링
8. `prettier` / `tsc` 확인
9. 관련 문서와 체크리스트 반영
10. 커밋 / 푸시

## 2. Spec Priority

문서가 여러 개일 때는 아래 순서로 우선순위를 판단한다.

1. 최신 `Source of Truth`로 표시된 스펙
2. 최신 체크리스트/운영 문서
3. 구현 코드와 테스트
4. 구버전 또는 일부 섹션이 대체된 스펙

문서 상단 표기 규칙:

- `Source of Truth`: 현재 기준 문서
- `Superseded`: 전부 또는 일부가 더 최신 문서로 대체됨
- `Draft`: 초안, 구현 기준으로 바로 쓰지 않음

## 3. Task Handoff Template

세션이 바뀔 때는 아래 형식으로 남긴다.

최근 작업 이력은 루트 [WORKLOG.md](/Users/jhkim/Project/tactical-auto-battler/WORKLOG.md)에 남긴다.
읽은 모델은 최신 작업 기준으로 갱신할 수 있다.

```md
## Current Task
- 예: P1-2 런 중 편성 조정

## Source Specs
- primary: docs/run-map-and-battle-intro-spec.md
- secondary: docs/formation-card-ui-spec.md
- checklist: docs/combat-impl-checklist.md

## Done
- 무엇을 끝냈는지

## Next
- 바로 다음 액션 1개

## Guardrails
- 이번 작업에서 건드리지 말 것

## Verification
- 실행한 테스트/검증 명령
```

핵심은 `primary` 스펙 1개를 명시하는 것이다.

## 4. Checklist Rule

체크리스트를 갱신하면 작업자와 날짜를 함께 남긴다.

예:

- `[x] 런 중 편성 조정 (RunMap→Formation→RunMap 왕복 확인, Codex, 2026-03-30)`
- `[x] 리트라이 흐름 연결 (Claude, 2026-03-31)`

형식은 기존 문서 스타일을 우선하되, 최소한 작업자와 날짜는 유지한다.

## 5. Commit Rule

- 기능 코드와 직접 관련된 문서 갱신은 가능하면 같은 작업 단위로 묶는다.
- 운영 문서(`AGENTS.md`, `WORKFLOW.md`, 루트 인덱스)는 별도 커밋으로 분리해도 된다.
- 사용자가 만든 미관련 변경은 포함하지 않는다.

## 6. Review Gate

구현이 끝나면 최종 커밋 전에 독립 리뷰를 한 번 거친다.

기본 규칙:

1. 메인 구현자가 직접 셀프 승인하지 않는다.
2. 별도 리뷰 에이전트가 [.codex/agents/senior-reviewer.md](/Users/jhkim/Project/tactical-auto-battler/.codex/agents/senior-reviewer.md) 프로필 기준으로 한 번 점검한다.
3. 리뷰는 칭찬보다 버그, 회귀, 테스트 누락, 스펙 드리프트를 우선 본다.
4. 리뷰 결과가 없으면 `명시적으로 no findings`를 남긴다.
5. 리뷰 반영 후에만 `format` / `tsc` / 커밋 단계로 간다.
6. 리뷰 범위는 `git diff --cached` 기준으로 제한한다.
7. staged diff 밖의 제안은 리뷰가 아니라 리팩터링 후속으로 분리한다.
8. 현재 세션에서 별도 리뷰 에이전트를 실제로 스폰할 수 없으면, 구현자는 셀프 리뷰로 대체하지 않는다.
9. 그 경우 구현자는 staged scope, primary spec, 실행한 검증 명령만 정리해서 사용자에게 `별도 리뷰 필요` 상태로 넘기고 멈춘다.

리뷰 에이전트 실행 시 주의:

- 로컬 스킬 본문이 서브에이전트에 자동 주입된다고 가정하지 않는다.
- 리뷰 스폰 시에는 [.codex/agents/senior-reviewer.md](/Users/jhkim/Project/tactical-auto-battler/.codex/agents/senior-reviewer.md) 계약을 프롬프트에 직접 반영한다.
- 별도 리뷰 에이전트를 실제로 띄울 수 없는 환경이면, 메인 구현자가 같은 턴에서 리뷰를 대신 수행하지 않는다.
- 특히 아래를 반드시 포함한다:
  - review only
  - findings first
  - file references required
  - implementation summary is forbidden
  - if none, start with `No actionable findings.`
  - review only the provided scope
  - review the staged diff only
  - return quickly; do not do broad repo exploration

## 7. Current Mapping

- 프로젝트 개요: [CLAUDE.md](/Users/jhkim/Project/tactical-auto-battler/CLAUDE.md)
- 작업 인덱스: [AGENTS.md](/Users/jhkim/Project/tactical-auto-battler/AGENTS.md)
- 작업 표준: [WORKFLOW.md](/Users/jhkim/Project/tactical-auto-battler/WORKFLOW.md)
- 작업 이력: [WORKLOG.md](/Users/jhkim/Project/tactical-auto-battler/WORKLOG.md)
- 프로젝트 전용 스킬: [.codex/skills](/Users/jhkim/Project/tactical-auto-battler/.codex/skills)

## 8. Project Skills

이 저장소에서는 전역 스킬보다 로컬 스킬을 우선 사용한다.

- `spec-to-implementation`
  구현 작업 기본 루프
- `meta-loop-spec-writer`
  느슨한 메타 루프 아이디어를 MVP 스펙으로 정리
- `task-closeout`
  WORKLOG / 체크리스트 / 관련 스펙 마감
- `spec-reconciliation`
  충돌하는 문서들 정리
- `ui-polish-guardrail`
  게임 UI가 개발툴처럼 흐르는 것 방지
- `feature-cut-mvp`
  커진 기능 범위를 MVP로 자르기
- `scene-boundary-refactor`
  비대해진 씬을 단계적으로 분리
- `bug-fix`
  버그 재현 → 원인 → 수정 → 회귀 테스트 루프
- `balance-tuning`
  시뮬레이션 기반 숫자 튜닝 (스탯, 보상, 비용, 인카운터)
- `senior-reviewer`
  최종 검증 전 독립 리뷰 기준
  서브에이전트 리뷰는 `.codex/agents/senior-reviewer.md` 프로필을 우선 사용

## 9. Skill Escalation

작업 도중 상태가 바뀌면 스킬도 즉시 전환한다.

- 스펙이 약함
  `meta-loop-spec-writer`
- 스펙 충돌 발견
  `spec-reconciliation`
- 범위가 비대해짐
  `feature-cut-mvp`
- 구조 리스크가 커짐
  `scene-boundary-refactor`
- 버그 리포트 들어옴
  `bug-fix`
- 숫자 밸런스 조정 필요
  `balance-tuning`
- 구현 완료
  `senior-reviewer`
- 리뷰 반영 후 마감
  `task-closeout`
