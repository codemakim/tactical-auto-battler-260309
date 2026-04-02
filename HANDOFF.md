# HANDOFF.md

이 문서는 Claude와 Codex 사이에서 현재 작업 상태를 짧게 넘기기 위한 실시간 핸드오프 보드다.

## Rules

- 이 문서는 "현재 진행 중인 작업"만 유지한다.
- 내용을 확인한 모델은 필요하면 비우거나 다음 작업 기준으로 갱신한다.
- 긴 설계 문서는 `docs/` 또는 루트 운영 문서에 남기고, 여기에는 실행에 필요한 최소 정보만 적는다.
- `primary` 스펙 1개를 반드시 명시한다.
- 작업 완료 후에는 `Done`, `Next`, `Verification`를 최신 상태로 갱신한다.

## Current Task

- **액션 상세 표시 후속 정리** — 1차 아이콘 패스 완료, 다음은 상점 오버플로우/오버레이 동작
- 담당: Codex

### 작업 요약

1. 모노 아이콘 세트 추가 (`src/utils/actionIcons.ts`)
2. 미니 카드 메인 요약과 효과 태그에 공통 아이콘 세트 적용
3. `나 / 나 전열 / 나 후열` 표기와 대상 포함 효과 태그 규칙 유지
4. 후속 체크리스트 1, 2번 완료 처리

### 핵심 원칙

- 배지를 섹션 구분 없이 플랫 나열 (색상으로만 조건/대상/효과 구분)
- 기존 `actionCardBadges.ts` + `actionText.ts` 활용, 새 변환 유틸 함수 없음
- 확대 팝업도 `상황/대상/효과` 섹션 분리 없이 플랫 태그열 유지
- 카드 편집 오버레이는 건드리지 않음

## Source Specs

- primary: [docs/action-detail-display-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/action-detail-display-spec.md)
- follow-up: [docs/action-detail-followup-checklist.md](/Users/jhkim/Project/tactical-auto-battler/docs/action-detail-followup-checklist.md)
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
- FormationScene 메인 정리, 카드 편집/프리셋 오버레이, 존 스프라이트 표시 완료 (Codex)
- 액션 카드 본문을 상황/대상/효과 배지형 카드로 개편 (Codex)
- 카드 편집 오버레이 카드 확대, 배지 문구 축약, 로케일 문구 재사용 정리 (Codex)
- Formation 존을 세로 박스에서 가로 스트립 2줄로 변경, 5슬롯 대응 레이아웃 추가 (Codex)
- Formation 패널/라인 라벨을 문서형에서 전술 UI 카피로 교체, 중앙 보드 연출 추가 (Codex)
- Formation 우측 COMMAND/UNIT 패널 제거, COMMAND 오버레이와 보드 하단 HUD로 재구성 (Codex)
- FormationSceneLayout / FormationSceneStyles / FormationGraphics 분리로 Scene 구조 정리 1차 완료 (Codex)
- FormationSceneOverlays 분리로 COMMAND / PRESET / CARD EDITOR 오버레이를 Scene 밖으로 이동 (Codex)
- FormationBoardView / FormationBoardState 분리로 보드 렌더링과 존 캐릭터 계산을 Scene 밖으로 이동 (Codex)
- FormationRosterView / FormationHudView / FormationRosterState / FormationHudState 분리로 로스터/HUD 책임을 Scene 밖으로 이동 (Codex)
- Formation HUD를 우측 상태 패널로 이동, 버튼 행 Y 보정, 빈 슬롯 마커를 남은 칸에만 표시하도록 수정 (Codex)
- SaveData에 `runState`를 포함하고, CONTINUE가 활성 런이면 RunMapScene으로 복귀하도록 수정 (Codex)
- RewardScene 다음 진행을 순수 전이 헬퍼로 분리하고, 다음 스테이지는 FormationScene을 거쳐 RunMap으로 복귀하도록 수정 (Codex)
- RewardScene 헤더/버튼/빈 상태 카피를 게임형 브리핑 표현으로 재구성 (Codex)
- RewardScene 카드열 외곽 좌우 마진을 대칭으로 보정하고, 하단 버튼을 같은 중심축으로 정렬 (Codex)
- RunResultScene 결과 요약에서 임시 런 카드 수 표시 제거, SortieScene 보상 예고 문구 제거 (Codex)
- finalizeRun 이후 저장 데이터와 타이틀 상태가 활성 런 없는 일반 저장으로 돌아가는 계약 테스트 추가 (Codex)
- 신규 멤버 영입 상점 MVP 스펙 초안 작성, 자동 갱신 조건을 `1스테이지 이상 클리어한 런 종료`로 정의 (Codex)
- RecruitShopState 저장 구조, 고정 모집 풀 순환 리프레시, Town 상점 오버레이, 런 종료 자동 갱신 구현 (Codex)
- 편성 HUD / 병영 / 상점에서 액션 슬롯을 플랫 태그 기반 미니 카드 + 호버 상세로 표시하도록 개선 (Codex)

## Next

- 상점 카드 태그 오버플로우 해결
- 오버레이 내부 빈 영역 클릭 시 닫힘 방지
- 와이드 화면 중앙 정렬 원인 점검

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
