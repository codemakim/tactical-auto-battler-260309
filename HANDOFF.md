# HANDOFF.md

이 문서는 Claude와 Codex 사이에서 현재 작업 상태를 짧게 넘기기 위한 실시간 핸드오프 보드다.

## Rules

- 이 문서는 "현재 진행 중인 작업"만 유지한다.
- 내용을 확인한 모델은 필요하면 비우거나 다음 작업 기준으로 갱신한다.
- 긴 설계 문서는 `docs/` 또는 루트 운영 문서에 남기고, 여기에는 실행에 필요한 최소 정보만 적는다.
- `primary` 스펙 1개를 반드시 명시한다.
- 작업 완료 후에는 `Done`, `Next`, `Verification`를 최신 상태로 갱신한다.

## Current Task

- 현재 작업 없음

## Source Specs

- primary: 없음
- secondary: 없음
- checklist: [docs/combat-impl-checklist.md](/Users/jhkim/Project/tactical-auto-battler/docs/combat-impl-checklist.md)

## Done

- P1-2 런 중 편성 조정 완료 (Codex)
- P1-3 세이브/로드 시스템 MVP 완료 (Codex)
- P1-4 Town 골드/영웅 정보 표시 완료 (Codex)

## Next

- 다음 작업 미정

## Guardrails

- `.claude/`는 현재 작업 범위 밖이다.
- 스펙 충돌 시 `Source of Truth` 표기가 있는 문서를 우선한다.
- 체크리스트 갱신 시 작업자와 날짜를 남긴다.

## Verification

- 마지막 완료 작업 기준:
  - `npm test`
  - `npm run format`
  - `npx tsc --noEmit`

## Notes

- 운영 규칙: [WORKFLOW.md](/Users/jhkim/Project/tactical-auto-battler/WORKFLOW.md)
- 저장소 인덱스: [AGENTS.md](/Users/jhkim/Project/tactical-auto-battler/AGENTS.md)
