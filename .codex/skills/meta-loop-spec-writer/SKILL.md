---
name: meta-loop-spec-writer
description: Convert loose gameplay, meta-loop, economy, progression, or town-system ideas into concrete MVP specs before implementation. Use when a feature is underspecified, when the user has only partial design intent, or when Codex should infer a practical spec from existing docs, code, and current project constraints.
---

# Meta Loop Spec Writer

Use this skill when the idea is real but the spec is not. Turn vague design intent into an implementable MVP without overdesigning the system.

## Workflow

1. Recover the current reality.
- Read the docs and code that already touch the feature.
- Identify what exists, what was removed, and what assumptions are already encoded.
- Prefer current implementation over stale prose when they conflict, then document the resolution.

2. Define the player-facing purpose.
- State why the feature exists in the loop.
- Name the problem it solves for the player.
- Keep the purpose short and concrete.

3. Choose an MVP boundary.
- Decide what must exist for the loop to work.
- Explicitly list what is deferred.
- Bias toward systems the current save/state architecture can already support.

4. Lock the rules that matter.
- trigger conditions
- state transitions
- costs and rewards
- saved data
- failure conditions
- abuse-prevention rules

5. Write the spec for implementation, not for prose completeness.
- Purpose
- entry points and scene ownership
- data model
- core rules
- UI responsibilities
- save/load behavior
- exclusions
- suggested implementation order

## Heuristics

- Prefer simple deterministic rules over "smart" systems.
- Prefer fixed slot counts and fixed prices before rarity ladders or dynamic shops.
- Prefer explicit abuse-prevention rules when the system has reroll, refresh, or surrender interactions.
- If a feature touches save data, define persistence in the spec before implementation starts.

## Deliverable

Produce a doc that another Codex instance can implement directly. Include enough detail to write tests from it.
