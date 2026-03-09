# Tactical Auto-Battle Roguelike

## Tech Stack
- TypeScript + Phaser 3 + Vite
- Target: Desktop / Web / Mobile

## Project Structure
```
src/
  main.ts              - Entry point, Phaser game init
  config/              - Game & Phaser configuration
  types/               - TypeScript type definitions (interface + as const, NO enum)
  data/                - Static game data (class templates, etc.)
  core/                - 전투 흐름 총괄 상위 엔진
    BattleEngine.ts    - 전투 초기화, step 진행, 자동 실행
    RoundManager.ts    - 라운드 시작/종료, 턴 실행, 예비 유닛 투입
    TurnOrderManager.ts - AGI 기반 턴 순서, 가속/지연
    ReplayRecorder.ts  - 리플레이 스냅샷 및 이벤트 기록
  systems/             - 실제 규칙 처리 모듈 (순수 함수)
    ActionResolver.ts  - 조건 평가, 액션 선택, 효과 적용
    TargetSelector.ts  - 타겟 선택 로직
    PositionSystem.ts  - 이동/밀기 처리
    DamageSystem.ts    - 데미지/실드/힐 계산 및 적용
    HeroInterventionSystem.ts - 히어로 개입 처리
  entities/            - 유닛 생성 팩토리 (순수 함수, 클래스 없음)
    UnitFactory.ts     - CharacterDefinition → BattleUnit 변환, 훈련 보너스
  scenes/              - Phaser scenes (Boot, MainMenu, Battle)
  ui/                  - UI 컴포넌트 (최소한으로 유지)
  utils/               - Utility functions
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
- `docs/combat-impl-checklist.md` - 구현 상태 체크리스트 (스펙 섹션별 대응)

## Key Commands
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm test` - Run tests (vitest)
- `npm run test:watch` - Watch mode

## Conventions
- Korean comments where helpful
- Phaser scene naming: `XxxScene`
- Type definitions in `src/types/index.ts`
- Game data in `src/data/`
- NO enum (erasableSyntaxOnly) → `as const` + type 패턴 사용
