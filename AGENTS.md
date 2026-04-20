# AGENTS.md

이 문서는 이 저장소에서 Codex/Claude가 항상 먼저 읽는 **짧은 런북**이다.
자세한 색인과 절차는 링크된 문서에서 just-in-time으로 읽는다.

## Mission

- 전술 오토배틀러의 핵심 루프를 우선 완성한다.
- UI polish는 기능을 막는 문제나 명시 요청이 있을 때만 진행한다.
- 같은 실수를 반복하면 대화로 기억하지 말고 문서, 테스트, 스킬, 리뷰 게이트로 승격한다.

## Always Read

First command for non-trivial work:

```bash
npm run agent:context
```

1. [CLAUDE.md](/Users/jhkim/Project/tactical-auto-battler/CLAUDE.md) — 프로젝트 개요와 명령어
2. [WORKFLOW.md](/Users/jhkim/Project/tactical-auto-battler/WORKFLOW.md) — 작업 순서와 리뷰 게이트
3. [WORKLOG.md](/Users/jhkim/Project/tactical-auto-battler/WORKLOG.md) — 최근 작업과 다음 후보
4. 작업별 primary spec 1개

## Harness Map

- 하네스 구조: [docs/agent/harness.md](/Users/jhkim/Project/tactical-auto-battler/docs/agent/harness.md)
- 코드/스펙/테스트 색인: [docs/agent/code-index.md](/Users/jhkim/Project/tactical-auto-battler/docs/agent/code-index.md)
- 스킬 라우팅: [docs/agent/skill-routing.md](/Users/jhkim/Project/tactical-auto-battler/docs/agent/skill-routing.md)
- 자동화 후보: [docs/agent/automation-roadmap.md](/Users/jhkim/Project/tactical-auto-battler/docs/agent/automation-roadmap.md)
- 게임 UI 기준: [DESIGN.md](/Users/jhkim/Project/tactical-auto-battler/DESIGN.md)
- 독립 리뷰 프로필: [.codex/agents/senior-reviewer.md](/Users/jhkim/Project/tactical-auto-battler/.codex/agents/senior-reviewer.md)

## Default Flow

1. primary spec 확인
2. 범위와 완료 조건 정리
3. 테스트 먼저 작성 또는 보강
4. 구현
5. 관련 테스트와 전체 검증
6. 별도 `senior-reviewer` 에이전트 리뷰
7. 리뷰 반영
8. `npm run format`, `npm test`, `npx tsc --noEmit`
9. 스펙, 체크리스트, WORKLOG 갱신
10. 사용자가 요청할 때만 커밋/푸시

## Hard Rules

- 사용자가 만든 미관련 변경은 되돌리지 않는다.
- `enum` 대신 `as const` + union type 패턴을 유지한다.
- 구현자가 독립 리뷰를 셀프 리뷰로 대체하지 않는다.
- staged diff 밖의 개선은 리뷰 finding이 아니라 후속 작업으로 분리한다.
- 긴 설명을 루트 문서에 계속 쌓지 않는다. 상세는 `docs/agent/`나 기능 스펙으로 이동한다.
- 외부/가변 정보가 필요한 경우에만 웹이나 MCP를 사용한다. 저장소 내부 규칙은 로컬 문서를 우선한다.

## Commands

- 개발 서버: `npm run dev`
- 에이전트 부트스트랩: `npm run agent:context`
- 전체 테스트: `npm test`
- 포맷: `npm run format`
- 타입 체크: `npx tsc --noEmit`
- 전투 시뮬레이션: `npx tsx src/sim.ts`
- 런 시뮬레이션: `npx tsx src/sim-run.ts`

## Skill Triggers

- 스펙이 약함: `meta-loop-spec-writer`
- 스펙 충돌: `spec-reconciliation`
- 기능 범위 비대화: `feature-cut-mvp`
- 구현 작업: `spec-to-implementation`
- 버그 리포트: `bug-fix`
- 숫자 밸런스: `balance-tuning`
- 씬 비대화: `scene-boundary-refactor`
- 게임 UI 감수: `ui-polish-guardrail`
- 마감 정리: `task-closeout`
- 커밋 전 리뷰: `senior-reviewer` 에이전트

## Documentation Rules

- 체크리스트를 갱신하면 작업자와 날짜를 남긴다. 예: `(Codex, 2026-04-20)`
- 구현이 스펙과 다르면 코드만 맞추지 말고 source-of-truth 문서를 갱신한다.
- 기능 코드와 직접 연결된 문서 갱신은 같은 작업 단위로 묶는다.
- 운영 문서 변경은 기능 변경과 분리해도 된다.
