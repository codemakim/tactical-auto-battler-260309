---
name: spec-reconciliation
description: Resolve stale, conflicting, or partial specs before coding. Use when multiple docs disagree, when implementation drift is likely, when a feature has legacy notes plus newer behavior, or when Codex needs to declare a clear source of truth and rewrite the spec boundary before tests and implementation begin.
---

# Spec Reconciliation

Use this skill before coding when the documentation surface is unreliable or split across several files.

## Workflow

1. Gather the relevant sources.
- Read the docs that claim ownership of the feature.
- Read the current code paths that implement the feature.
- Read the closest tests to see which behavior is already locked.

2. Classify each source.
- source of truth
- supporting reference
- stale or partially superseded
- implementation-only reality

3. Find the real conflicts.
Focus on conflicts that affect implementation:
- scene transitions
- state ownership
- persistence
- UI responsibility
- terminology
- deleted features that docs still mention

4. Decide the resolution.
- Prefer explicit source-of-truth markings when they exist.
- If none exist, choose the document closest to the active code path and note why.
- If code and docs diverge, either update docs to match reality or stop and propose a new source-of-truth doc.

5. Rewrite for implementation clarity.
- Remove stale paths.
- Mark deprecated behavior plainly.
- Add one primary doc reference for the feature.
- Keep the result short enough that the next implementation pass does not have to rediscover the conflict.

## Deliverable

Produce:
- the chosen source of truth
- the conflicts found
- the resolved behavior boundary
- the doc files updated
- any remaining open question that genuinely blocks implementation

## Guardrails

- Do not start coding while unresolved spec conflicts remain.
- Do not preserve old behavior in docs "just in case" if it is already removed.
- Do not spread the truth across multiple equal-priority docs.
