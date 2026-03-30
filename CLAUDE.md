# Tactical Auto-Battle Roguelike

## Tech Stack
- TypeScript + Phaser 3 + Vite
- Target: Desktop / Web / Mobile

## Project Structure
```
src/
  main.ts              - Entry point, Phaser game init
  sim.ts               - 전투 시뮬레이션 스크립트 (npx tsx src/sim.ts)
                         양팀 구성 → runFullBattle → 이벤트 로그 콘솔 출력
  config/              - Game & Phaser configuration
  types/
    index.ts           - 모든 타입 정의 (interface + as const, NO enum)
  data/                - 정적 게임 데이터
    ClassDefinitions.ts - 클래스 레지스트리 (스탯, testActionSlots, cardTemplates 통합)
                         새 클래스 추가 = 이 파일에 한 블록 추가만으로 완료
    HeroDefinitions.ts - 영웅 유형별 정의 레지스트리 (COMMANDER/MAGE/SUPPORT, 능력 목록)
    ActionPool.ts      - 범용 액션 + ClassDefinitions에서 자동 수집한 전체 풀
  core/                - 전투 흐름 총괄 상위 엔진
    BattleEngine.ts    - createBattleState, stepBattle, runFullBattle
    RoundManager.ts    - 라운드 시작/종료, executeTurn(히어로 큐 처리 포함), 예비 유닛 투입
    TurnOrderManager.ts - AGI 기반 턴 순서 계산, advanceTurn/delayTurn
    ReplayRecorder.ts  - 리플레이 스냅샷 및 이벤트 기록/조회
  systems/             - 실제 규칙 처리 모듈 (순수 함수)
    ActionResolver.ts  - 조건 평가(§11), 액션 선택, 효과 적용
    TargetSelector.ts  - 타겟 선택 (ENEMY_FRONT/BACK/ANY, ALLY_LOWEST_HP 등)
    PositionSystem.ts  - FRONT↔BACK 이동, 밀기(PUSH) 처리
    DamageSystem.ts    - 데미지(ATK×배율)/실드(GRD×배율)/힐 계산 및 적용
    BuffSystem.ts      - 버프/디버프 적용, getEffectiveStats, tickBuffs, processStatusEffects(POISON/REGEN)
    CoverSystem.ts     - §25 커버 판정 (COVER 버프 전열 유닛이 후열 아군 대신 피격)
    HeroInterventionSystem.ts - 히어로 개입 큐잉/실행, 횟수 관리
    DelayedEffectSystem.ts - 지연 효과 등록/해석 (라운드 종료 시 발동)
    ActionCardSystem.ts - 액션 슬롯 교체(replaceActionSlot), 런 리셋(resetRunActions)
    BattleRewardSystem.ts - 골드 보상, 액션 카드 보상 생성, 캐릭터 획득 기회
    TrainingSystem.ts  - 캐릭터 훈련 (레벨업 스탯 증가, 골드 비용 계산)
  entities/            - 유닛 생성 팩토리 (순수 함수, 클래스 없음)
    UnitFactory.ts     - createCharacterDef, createUnit (CharDef→BattleUnit), resetUnitCounter
  scenes/              - Phaser scenes (Boot, MainMenu, Battle)
  ui/                  - UI 컴포넌트 (최소한으로 유지)
  utils/
    uid.ts             - 결정론적 고유 ID 생성 (이벤트 id용)
  assets/              - Game assets (sprites, audio, fonts)
```

## Architecture Principles
- **타입 중심**: class 대신 interface/type + 순수 함수
- **core vs systems**: core = 전투 흐름 오케스트레이션, systems = 규칙 처리
- **순수 함수**: 상태를 변경하지 않고 새 상태 반환 (불변성)
- **UI 최소화**: 전투 엔진 검증이 우선, UI는 최소한만

## Spec Documents
- `docs/combat-spec.md` - 전투 시스템 상세 명세 (MVP)
- `docs/action-card-spec.md` - 액션 카드 시스템 명세 (런 기반 임시 액션)
- `docs/delayed-effect-spec.md` - 지연 효과 시스템 명세 (§7.2)
- `docs/cover-system-spec.md` - 커버 시스템 명세 (§25, COVER 버프 기반 대신 피격)
- `docs/hero-system-spec.md` - 영웅 시스템 명세 (§26~§28, 공통 능력 + 특화 능력)
- `docs/run-system-spec.md` - 런 시스템 명세 (5스테이지 런 루프, 카드 인벤토리, 편성)
- `docs/enemy-encounter-spec.md` - 적 인카운터 명세 (4종 아키타입, 스테이지별 편성)
- `docs/stalemate-spec.md` - 교착 방지 명세 (§22.1, 관리자의 진노)
- `docs/game-flow-spec.md` - 게임 플로우 명세 (로딩→타이틀→마을→편성→출격→전투→결과)
- `docs/combat-impl-checklist.md` - 구현 상태 체크리스트 (스펙 섹션별 대응)

## Agent Handoff
- `AGENTS.md` - 보조 에이전트용 작업 인덱스 (문서 우선순위, 코드 진입점, 테스트 맵, 작업 절차)
- `WORKFLOW.md` - Claude/Codex 공통 작업 표준 (스펙 우선순위, 핸드오프, 체크리스트/커밋 규칙)
- `HANDOFF.md` - 현재 작업 상태 공유용 보드 (읽은 쪽이 비우거나 다음 작업 기준으로 갱신)

## Key Commands
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm test` - Run tests (vitest)
- `npm run test:watch` - Watch mode
- `npx tsx src/sim.ts` - 전투 시뮬레이션 실행 (콘솔 로그 출력)
- `npx tsx src/sim-run.ts` - 런 시뮬레이션 실행 (5스테이지 런 전체, SIM_SEED=N으로 시드 지정)
- `npm run format` - Prettier 포매팅 적용 (작업 완료 후 커밋 전 실행)
- `npm run format:check` - 포매팅 검사만 (CI용)

## Conventions
- Korean comments where helpful
- Phaser scene naming: `XxxScene`
- Type definitions in `src/types/index.ts`
- Game data in `src/data/`
- NO enum (erasableSyntaxOnly) → `as const` + type 패턴 사용
