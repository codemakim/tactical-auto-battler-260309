# Tactical Auto-Battle Roguelike

## Tech Stack
- TypeScript + Phaser 3 + Vite
- Target: Desktop / Web / Mobile

## Project Structure
```
src/
  main.ts              - Entry point, Phaser game init
  config/              - Game & Phaser configuration
  types/               - TypeScript type definitions
  data/                - Static game data (class templates, etc.)
  core/                - Core game systems (battle engine, turn order, etc.)
  entities/            - Game entities (character, unit, hero)
  systems/             - ECS-like systems (combat, action resolution, etc.)
  scenes/              - Phaser scenes (Boot, MainMenu, Battle, etc.)
  ui/                  - UI components
  utils/               - Utility functions
  assets/              - Game assets (sprites, audio, fonts)
```

## Key Commands
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run preview` - Preview production build

## Conventions
- Korean comments where helpful
- Phaser scene naming: `XxxScene`
- Type definitions in `src/types/index.ts`
- Game data in `src/data/`
