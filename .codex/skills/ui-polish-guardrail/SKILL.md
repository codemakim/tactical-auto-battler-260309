---
name: ui-polish-guardrail
description: Prevent game UI from drifting into tool-like, admin-like, or debug-style presentation. Use when Codex is designing or refining a game screen and should actively reduce verbose labels, over-boxing, stale developer copy, weak hierarchy, and other patterns that make the interface feel like an internal tool instead of a shipped game.
---

# UI Polish Guardrail

Use this skill on game-facing screens, especially when the UI is functionally correct but feels like a tool, dashboard, or wireframe.

## Checks

1. Check copy tone.
- Remove developer-facing words unless they are intentionally diegetic.
- Prefer short labels over explanatory paragraphs.
- Avoid parenthetical labels like `BACK 영역 (후열)` when a cleaner term such as `BACKLINE` or `후열` is enough.

2. Check layout hierarchy.
- Make one area the clear focal point.
- Remove side panels that compete with the main board unless they are essential.
- Keep related controls on a shared axis.

3. Check box density.
- Reduce needless panels inside panels.
- Prefer one strong board or report surface over many equal rectangles.
- Treat borders and frames as emphasis, not default structure.

4. Check state presentation.
- Show only what the player can act on now.
- Move deep detail to overlays or follow-up panels.
- Avoid exposing implementation detail as UI text.

5. Check game feel.
- Use labels that sound like the game world or tactical framing.
- Prefer briefing, squad, lineup, tactics, command, or similar framing when it suits the project.
- Keep debug or spreadsheet energy out of the main play screens.

## Heuristics

- If a screen can be described as "admin panel," it needs another pass.
- If every area has the same visual weight, choose one hero area and subordinate the rest.
- If text explains what layout should already communicate, remove or compress the text.
- If a panel exists only to reassure the developer, delete it or move it to an overlay.

## Output Shape

When using this skill, report:
- what made the screen feel tool-like
- what structural changes fixed that feeling
- which parts were intentionally deferred to a later polish pass
