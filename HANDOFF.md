# HANDOFF.md

이 문서는 Claude와 Codex 사이에서 현재 작업 상태를 짧게 넘기기 위한 실시간 핸드오프 보드다.

## Rules

- 이 문서는 "현재 진행 중인 작업"만 유지한다.
- 내용을 확인한 모델은 필요하면 비우거나 다음 작업 기준으로 갱신한다.
- 긴 설계 문서는 `docs/` 또는 루트 운영 문서에 남기고, 여기에는 실행에 필요한 최소 정보만 적는다.
- `primary` 스펙 1개를 반드시 명시한다.
- 작업 완료 후에는 `Done`, `Next`, `Verification`를 최신 상태로 갱신한다.

## Current Task

- 현재 진행 중인 작업 없음
- 최근 완료: 런 종료 후 저장/타이틀 상태 정합성 테스트 보강
- 다음 작업 미정

## Source Specs

- primary: [docs/run-result-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/run-result-ui-spec.md)
- secondary: [docs/sortie-ui-spec.md](/Users/jhkim/Project/tactical-auto-battler/docs/sortie-ui-spec.md)
- checklist: [docs/combat-impl-checklist.md](/Users/jhkim/Project/tactical-auto-battler/docs/combat-impl-checklist.md)

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

## Next

다음 작업 미정.

- 추천 후속: 실제 런 완주/실패 플레이 기준으로 Town 복귀 UX와 RunResultScene 표현 우선순위 재평가

### P3-9: 병영 상세
- 스펙: game-flow-spec.md §3-1
- 파일: `src/scenes/TownScene.ts`
- 목표: 캐릭터 상세 정보 확인 (스탯, 클래스, 액션 카드)
- 완료: 병영 오버레이 추가, 목록 선택 + 상세 정보 렌더링

### P3-10: 훈련소 UI
- 스펙: game-flow-spec.md §3-2
- 파일: `src/scenes/TownScene.ts`
- 목표: TrainingSystem 연동, 골드 소모/훈련 가능 여부 표시
- 완료: 훈련소 오버레이 추가, 캐릭터 선택 + 훈련 버튼 + 골드/상태 반영

### P3-11: 편성 프리셋
- 스펙: game-flow-spec.md §3-3 / 현재 GameState preset 구조
- 파일: `src/scenes/FormationScene.ts`, `src/core/GameState.ts`
- 목표: 프리셋 저장/불러오기 UI 연결
- 완료: Preset 1~3 슬롯 UI, 저장/불러오기/삭제, GameState.deletePreset 추가

### P3-12: 타이틀 세이브 분기
- 스펙: game-flow-spec.md §2
- 파일: `src/scenes/MainMenuScene.ts`
- 목표: 세이브 없음=START, 세이브 있음=CONTINUE/NEW GAME 분기
- 완료: `src/systems/TitleMenu.ts` 추가, MainMenuScene 버튼 분기 적용

### Save UX
- 파일: `src/systems/SaveSystem.ts`, `src/scenes/MainMenuScene.ts`
- 완료: Delete Save, corrupted save 감지, 타이틀 안내 문구, 삭제 확인 모달

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
