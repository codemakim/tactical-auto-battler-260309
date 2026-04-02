---
name: feature-cut-mvp
description: Cut a vague or oversized feature down to a shippable MVP before implementation. Use when a feature is starting to sprawl, when requirements are only partially decided, or when Codex should define the smallest loop that solves the player's problem without dragging in follow-on systems too early.
---

# Feature Cut MVP

Use this skill when the idea is bigger than the next implementation step should be. The goal is to cut scope cleanly without losing the core player value.

## Workflow

1. State the player problem.
- Name what the player cannot do today.
- Keep it concrete and loop-facing.

2. Recover the real constraints.
- Read the current specs, code, and save model.
- Note what systems already exist and what would create new persistence or content burden.

3. Draw the MVP boundary.
- List what must exist for the loop to work.
- List what is explicitly deferred.
- Prefer one complete loop over several half-finished branches.

4. Identify abuse risks and cost traps.
- Reroll abuse
- surrender abuse
- duplicate reward leaks
- save/load exploits
- UI states that imply a larger system than actually exists

5. Lock the first version rules.
- trigger
- ownership
- persistence
- costs
- exits
- failure cases

6. End with an implementation order.
- spec/doc updates first
- smallest tests first
- smallest shippable UI second

## Guardrails

- Do not design the second or third phase unless it changes the first phase boundary.
- Do not keep optional ideas inside the MVP section.
- Do not add progression, rarity, or content ladders unless the loop already needs them.

## Output Shape

Produce:
- player problem
- MVP in-scope list
- explicit out-of-scope list
- abuse-prevention rules
- suggested implementation order
