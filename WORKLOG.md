# WORKLOG.md

이 문서는 Claude와 Codex 사이에서 최근 작업 이력과 다음 작업 후보를 짧게 남기는 로그다.

## Rules

- 이 문서는 "최근 완료한 작업"과 "다음 작업 후보"를 유지한다.
- 읽은 모델은 필요하면 최신 작업 기준으로 갱신한다.
- 긴 설계 문서는 `docs/` 또는 루트 운영 문서에 남기고, 여기에는 실행에 필요한 최소 이력만 적는다.
- `primary` 스펙 1개를 반드시 명시한다.
- 작업 완료 후에는 `Done`, `Next`, `Verification`를 최신 상태로 갱신한다.

## Current Task

- **병영 방출 MVP 구현** — 런 무결성을 깨지 않으면서 로스터/편성/프리셋에서 캐릭터를 정리하는 기능 연결
- 담당: Codex

### 작업 요약

1. 방출 가능 여부를 순수 helper로 계산
2. GameState에서 characters / formation / presets를 함께 정리
3. 병영 상세 패널에 확인 모달 포함 `방출` 버튼 연결
4. 저장 후 로드해도 제거 상태가 유지되도록 테스트 고정

### 핵심 원칙

- 런 진행 중에는 방출하지 않는다
- 최소 전투 인원 4명은 유지한다
- 캐릭터 제거 시 현재 편성과 모든 프리셋을 함께 정리한다

## Source Specs

- primary: [docs/barracks-dismissal-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/barracks-dismissal-spec.md)
- secondary: [docs/game-flow-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/game-flow-spec.md)

## Done

- P1-1 리트라이 흐름 개선 (Claude)
- P1-2 런 중 편성 조정 완료 (Codex)
- P1-3 세이브/로드 시스템 MVP 완료 (Codex)
- P1-4 Town 골드/영웅 정보 표시 완료 (Codex)
- P2-5 전투 템포 상수화 완료 (Codex)
- P2-6 배속 조절 완료 (Codex)
- P2-7 턴 인디케이터 즉시 갱신 완료 (Codex)
- P2-8 히어로 개입 UI 상태 렌더링 완료 (Codex)
- P3-9 병영 상세 완료 (Codex)
- P3-10 훈련소 UI 완료 (Codex)
- P3-11 편성 프리셋 완료 (Codex)
- P3-12 타이틀 세이브 분기 완료 (Codex)
- 세이브 삭제/손상 세이브 안내 완료 (Codex)
- SaveData에 `runState`를 포함하고, CONTINUE가 활성 런이면 RunMapScene으로 복귀하도록 수정 (Codex)
- RewardScene 다음 진행을 순수 전이 헬퍼로 분리하고, 다음 스테이지는 FormationScene을 거쳐 RunMap으로 복귀하도록 수정 (Codex)
- RunResultScene 결과 요약에서 임시 런 카드 수 표시 제거, SortieScene 보상 예고 문구 제거 (Codex)
- 신규 멤버 영입 상점 MVP 스펙 초안 작성, 자동 갱신 조건을 `1스테이지 이상 클리어한 런 종료`로 정의 (Codex)
- RecruitShopState 저장 구조, 고정 모집 풀 순환 리프레시, Town 상점 오버레이, 런 종료 자동 갱신 구현 (Codex)
- 편성 HUD / 병영 / 상점에서 액션 슬롯을 플랫 태그 기반 미니 카드 + 호버 상세로 표시하도록 개선 (Codex)
- 상점 호버 액션 카드 높이를 동적으로 확장해 긴 태그가 영역 밖으로 넘치지 않도록 수정 (Codex)
- 변방 초원 전장 배경을 런 상태와 연결해 Sortie 선택 → BattleScene 배경으로 적용 (Codex)
- 전장 시스템 다중 확장용 구조 스펙 초안 작성 (Codex)
- 전장 진행 상태 저장, 첫 클리어 해금, Sortie 잠금/기록 표시, 전장별 encounter set 레지스트리 구현 (Codex)
- 병영 상세 패널에 방출 확인 모달을 추가하고, 방출 시 characters / formation / presets를 함께 정리하도록 구현 (Codex)

## Next

- Sortie 전장 카드 UX 보강
- 전술 유물/전술 특성 시스템 초안 정리

## Guardrails

- `.claude/`는 현재 작업 범위 밖이다.
- 스펙 충돌 시 `Source of Truth` 표기가 있는 문서를 우선한다.
- 체크리스트 갱신 시 작업자와 날짜를 남긴다.

## Verification

- `npm test`
- `npm run format`
- `npx tsc --noEmit`

## Notes

- 운영 규칙: [WORKFLOW.md](/Users/jhkim/Project/tactical-auto-battler/WORKFLOW.md)
- 저장소 인덱스: [AGENTS.md](/Users/jhkim/Project/tactical-auto-battler/AGENTS.md)
