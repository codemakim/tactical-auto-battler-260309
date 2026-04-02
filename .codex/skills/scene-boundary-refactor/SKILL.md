---
name: scene-boundary-refactor
description: Refactor a bulky scene by extracting clear boundaries before it becomes a god object. Use when a scene is accumulating too many rendering responsibilities, layout constants, overlays, input handlers, or mixed state logic and Codex should split it into stable view/state/helper layers without changing behavior.
---

# Scene Boundary Refactor

Use this skill when a scene is still working but its structure is degrading. The goal is to improve boundaries without silently redesigning the feature.

## Workflow

1. Identify the scene's current responsibilities.
- layout constants
- graphics helpers
- overlay rendering
- board or roster rendering
- HUD rendering
- state derivation
- scene transitions

2. Split by stability, not by file size alone.
- constants and style tokens first
- repeated drawing helpers second
- overlay controllers next
- stable view surfaces after that
- keep scene ownership of orchestration and navigation

3. Preserve the public behavior.
- Do not redesign copy or flow unless the task explicitly includes it.
- Move calculations into pure helpers where possible.
- Prefer view/state helper extraction before introducing more classes.

4. Protect validation.
- Add or update small tests around extracted state calculators.
- Keep scene-level tests if the interaction contract spans multiple modules.

5. Stop at a clean boundary.
- The goal is not to atomize everything.
- End once the scene clearly orchestrates instead of directly owning every detail.

## Refactor Order

1. constants and style maps
2. graphics helpers
3. overlay modules
4. major board/roster/HUD views
5. pure state selectors

## Guardrails

- Do not mix feature work into the refactor unless required to preserve behavior.
- Do not add abstraction layers that the current repo does not otherwise use.
- Do not split files so far that the flow becomes harder to follow than before.

## Output Shape

When closing out, report:
- responsibilities extracted
- tests added or updated
- remaining bulky areas, if any
- whether behavior intentionally changed or stayed identical
