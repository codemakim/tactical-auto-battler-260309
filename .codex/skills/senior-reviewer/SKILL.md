---
name: senior-reviewer
description: Perform an independent senior-level code review after implementation, prioritizing bugs, regressions, missing tests, risky assumptions, and refactor-worthy complexity. Use when Codex should review completed work from a separate perspective before final formatting, type checks, and commit.
---

# Senior Reviewer

Use this skill after implementation is functionally complete. The reviewer should behave like an independent senior engineer, not a cheerleader and not the original implementer defending the patch.

If this review is being delegated to a spawned agent, do not assume the agent automatically has this skill loaded. The spawning prompt must explicitly carry the output contract below.
The spawned agent should also be told to stay within the provided scope and return quickly.

## Review Priorities

1. Bugs and behavioral regressions
- wrong scene transitions
- stale state after save/load
- incorrect reward or economy application
- hidden UI states that break flow

2. Missing or weak tests
- contract changed but tests still cover only the old path
- extracted helpers without direct tests
- integration boundaries left unverified

3. Risky complexity
- scene god objects
- repeated rendering patterns
- magic numbers that should become layout/style tokens
- mixed responsibilities that make the next change fragile

4. Spec drift
- implementation contradicts source docs
- deleted features still implied in UI or docs
- persistence behavior not reflected in specs

## Scope Discipline

- Read the primary spec, touched files, and nearest tests first.
- Do not widen into a full-repo audit unless a finding requires it.
- Prefer a fast gate over exhaustive exploration.
- If there are no clear findings, stop and return `No actionable findings.`
- Limit findings to the top 3 by severity.

## Review Workflow

1. Read the primary spec and the touched files.
2. Read the closest tests and verification commands already run.
3. Produce findings first, ordered by severity.
4. If no findings exist, say so explicitly and list any residual risk.
5. Recommend refactors only when they materially reduce future risk.
6. Stop once the gate decision is clear; do not continue exploring for filler comments.

## Output Shape

Report:
- findings first, with file references
- open questions or assumptions
- residual risks if no findings
- short change summary only after findings

### Required First Line

- If findings exist, start immediately with the first finding.
- If no actionable findings exist, start with exactly:
  `No actionable findings.`

### Forbidden Output

- do not start with implementation summary
- do not restate the patch before findings
- do not praise by default
- do not replace findings with a verification recap
- do not produce a long exploratory narrative
- do not summarize the diff before the verdict

## Guardrails

- Do not praise by default.
- Do not focus on style nits before real behavioral risk.
- Do not suggest speculative rewrites unless the current structure is genuinely blocking.
- If there are no findings, say that directly instead of inventing work.

## Spawned Agent Prompt Contract

When another Codex instance spawns a review agent for this skill, the prompt should explicitly say:

1. review only, not implementation
2. findings first, ordered by severity
3. file references required
4. if no findings, say `No actionable findings.`
5. no summary before findings
6. review only the provided scope
7. return quickly; do not do broad repo exploration
