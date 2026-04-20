# Automation Roadmap

이 문서는 아직 강제 자동화하지 않은 검증 루프를 기록한다.
현재 프로젝트의 실제 게이트는 `WORKFLOW.md`의 명령 실행 순서이며, 이 문서는 나중에 hook/script로 승격할 후보만 다룬다.

## Current Manual Gates

- `npm run format`
- `npm test`
- `npx tsc --noEmit`
- 필요 시 `npx tsx src/sim-run.ts`
- 커밋 전 별도 `senior-reviewer` 에이전트

## Hook Candidates

### Pre-commit Candidate

목표:
- 포맷 누락과 타입 오류를 커밋 전에 잡는다.

후보 명령:
- `npm run format:check`
- `npx tsc --noEmit`

주의:
- 현재 `npm run format`은 `src/**/*.ts`만 포맷한다.
- 문서 포맷까지 자동화하려면 별도 스크립트를 먼저 추가해야 한다.

### Targeted Test Candidate

목표:
- 변경 영역에 맞는 테스트를 먼저 빠르게 실행한다.

후보:
- `src/systems/RecruitShop.ts` 변경 → `npm test -- recruit-shop`
- `src/utils/actionCardBadges.ts` 변경 → `npm test -- action-card-badges actionText`
- `src/core/GameState.ts` 또는 `src/systems/SaveSystem.ts` 변경 → `npm test -- save-system title-menu`

주의:
- 자동 매핑이 틀리면 오히려 신뢰가 깨진다.
- 처음에는 문서화된 수동 매핑으로 운용하고, 반복될 때만 스크립트화한다.

### Evidence Pack Candidate

목표:
- 작업 마감 시 리뷰어/다음 세션이 볼 증거를 짧게 남긴다.

내용:
- primary spec
- touched files
- tests run
- reviewer result
- unresolved risks

저장 위치 후보:
- `WORKLOG.md`의 `Verification`
- 또는 나중에 `docs/review/latest.md` 같은 휘발성 문서

## Do Not Automate Yet

- UI 스크린샷 비교
  현재 Phaser 화면의 자동 회귀 테스트 기반이 없다. 수동 확인 포인트를 먼저 축적한다.
- 광범위한 sim-run 밸런스 배치
  밸런스 조정 작업에서만 명시적으로 실행한다.
- 자동 커밋/푸시
  사용자가 요청하기 전에는 커밋/푸시하지 않는 현재 합의를 유지한다.
