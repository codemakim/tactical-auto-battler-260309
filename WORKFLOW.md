# WORKFLOW.md

이 문서는 이 저장소에서 Claude/Codex가 공통으로 따르는 작업 표준이다.

## 1. Default Flow

작업은 아래 순서로 진행한다.

1. 기준 스펙 확인
   - non-trivial work는 먼저 `npm run agent:context`를 실행한다.
2. 계획 수립
3. 스펙 기반 테스트 작성 또는 기존 테스트 보강
4. 테스트를 만족하도록 구현
5. 테스트 재검증
6. `npm run format`, `npm test`, `npx tsc --noEmit`
7. 관련 문서와 체크리스트 반영
8. 사용자가 요청하면 커밋 / 푸시

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
- 현재 기본값은 `검증 후 대기`다. 사용자가 커밋을 요청하기 전에는 커밋하지 않는다.
- 푸시는 커밋과 별도 지시가 있을 때만 한다.

## 6. Verification Gate

구현이 끝나면 커밋 전에 로컬 검증을 통과시킨다.

기본 규칙:

1. 관련 테스트를 먼저 실행한다.
2. 전체 마감 시 `npm run format`, `npm test`, `npx tsc --noEmit`을 실행한다.
3. 실패하면 원인 수정 후 같은 명령을 다시 실행한다.
4. 검증 결과와 남은 리스크는 `WORKLOG.md` 또는 최종 응답에 짧게 남긴다.

## 7. Current Mapping

- 프로젝트 개요: [CLAUDE.md](/Users/jhkim/Project/tactical-auto-battler/CLAUDE.md)
- 짧은 작업 런북: [AGENTS.md](/Users/jhkim/Project/tactical-auto-battler/AGENTS.md)
- 작업 표준: [WORKFLOW.md](/Users/jhkim/Project/tactical-auto-battler/WORKFLOW.md)
- 작업 이력: [WORKLOG.md](/Users/jhkim/Project/tactical-auto-battler/WORKLOG.md)
- 하네스 구조: [docs/agent/harness.md](/Users/jhkim/Project/tactical-auto-battler/docs/agent/harness.md)
- 코드/스펙/테스트 색인: [docs/agent/code-index.md](/Users/jhkim/Project/tactical-auto-battler/docs/agent/code-index.md)
- 스킬 라우팅: [docs/agent/skill-routing.md](/Users/jhkim/Project/tactical-auto-battler/docs/agent/skill-routing.md)
- 자동화 후보: [docs/agent/automation-roadmap.md](/Users/jhkim/Project/tactical-auto-battler/docs/agent/automation-roadmap.md)
- 게임 UI 기준: [DESIGN.md](/Users/jhkim/Project/tactical-auto-battler/DESIGN.md)
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
- 구현 완료 후 마감
  `task-closeout`
