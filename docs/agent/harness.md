# Agent Harness

이 문서는 이 프로젝트의 에이전트 하네스 구조를 설명한다.
목표는 프롬프트를 길게 쓰는 것이 아니라, 모델 바깥의 작업 환경을 설계해서 같은 실수를 반복하지 않게 만드는 것이다.

## Layer Model

1. **Root runbook**
   - `AGENTS.md`
   - 항상 읽는 최소 규칙만 둔다.
   - 길어지면 이 문서나 기능 스펙으로 내린다.
   - 실제 작업 시작 시 `npm run agent:context`로 현재 런북 일부를 터미널 컨텍스트에 올린다.

2. **Project overview**
   - `CLAUDE.md`
   - 프로젝트 구조, 명령어, 아키텍처 원칙.

3. **Workflow**
   - `WORKFLOW.md`
   - 스펙 → 테스트 → 구현 → 리뷰 → 검증 → 문서 → 커밋 순서.

4. **Live handoff**
   - `WORKLOG.md`
   - 최근 완료, 현재 작업, 다음 후보만 짧게 유지한다.

5. **Source specs**
   - `docs/*.md`
   - 실제 게임 규칙과 UI 계약.
   - 구현 기준이 되는 문서는 `Source of Truth` 표기를 우선한다.

6. **Local skills**
   - `.codex/skills/*/SKILL.md`
   - 반복 작업 절차를 progressive disclosure 방식으로 분리한다.

7. **Review agent**
   - `.codex/agents/senior-reviewer.md`
   - 구현자와 분리된 커밋 전 게이트.

8. **Design system prompt**
   - `DESIGN.md`
   - 화면이 개발툴처럼 흐르지 않게 하는 게임 UI 기준.

9. **Automation roadmap**
   - `docs/agent/automation-roadmap.md`
   - 아직 hook으로 강제하지 않은 검증 후보.

## Progressive Disclosure Rules

- 루트 문서는 100~200줄 안쪽을 목표로 한다.
- 루트 문서에는 “무엇을 읽을지”와 “절대 어기면 안 되는 규칙”만 둔다.
- non-trivial work의 첫 명령은 `npm run agent:context`다.
- 세부 색인은 [code-index.md](/Users/jhkim/Project/tactical-auto-battler/docs/agent/code-index.md)로 이동한다.
- 스킬 사용 기준은 [skill-routing.md](/Users/jhkim/Project/tactical-auto-battler/docs/agent/skill-routing.md)로 이동한다.
- 기능별 상세 판단은 각 source spec에서 한다.
- 문서가 길어지면 더 똑똑해지는 것이 아니라, 모델이 엉뚱한 맥락을 읽을 확률이 올라간다.

## Failure To Harness Promotion

에이전트가 같은 실수를 두 번 하면 아래 중 하나로 승격한다.

- **테스트**: 깨진 동작을 자동으로 막을 수 있을 때
- **스펙**: 게임 규칙이나 UX 계약이 애매할 때
- **스킬**: 반복 절차가 필요할 때
- **리뷰 게이트**: 구현자가 놓치기 쉬운 위험일 때
- **디자인 규칙**: UI 톤이나 레이아웃 실패가 반복될 때
- **시뮬레이션**: 숫자 감각이 주관적으로 흐를 때

## Verification Harness

기본 검증 순서:

1. 관련 테스트
2. `npm run format`
3. `npm test`
4. `npx tsc --noEmit`
5. 필요한 경우 `npx tsx src/sim-run.ts`

자동 hook이 없더라도, 이 순서를 작업 게이트로 취급한다.
실제 hook을 붙일 때는 먼저 `format:check`, targeted tests, `tsc --noEmit`처럼 실패 비용이 낮은 것부터 붙인다.
후보 목록은 [automation-roadmap.md](/Users/jhkim/Project/tactical-auto-battler/docs/agent/automation-roadmap.md)에 기록한다.

## Subagent Policy

- 구현 전체를 무작정 병렬화하지 않는다.
- 별도 에이전트는 리뷰, 조사, 대안 비교처럼 관점 분리가 명확할 때 쓴다.
- 리뷰 에이전트는 staged diff와 지정 spec만 본다.
- 메인 구현자는 리뷰 에이전트의 finding을 반영하되, 범위 밖 제안은 후속 작업으로 남긴다.

## MCP And Web Policy

- 저장소 내부 규칙과 진행 상태는 로컬 문서를 우선한다.
- 외부 API, 최신 라이브러리, 실시간 정보, GitHub PR/CI처럼 가변적인 정보만 MCP나 웹으로 확인한다.
- MCP를 늘리면 컨텍스트와 보안 표면도 늘어난다. 필요한 것만 붙인다.

## Maintenance Cadence

- 큰 작업이 끝나면 `WORKLOG.md`만 짧게 갱신한다.
- 하네스 문서는 실제 실패가 있었을 때만 갱신한다.
- `AGENTS.md`가 비대해지면 내용을 `docs/agent/`로 이동한다.
- 오래된 스펙은 삭제하지 말고 `Superseded` 또는 `Partially Superseded`를 명시한다.
