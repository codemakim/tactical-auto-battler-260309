---
name: senior-reviewer
description: Perform an independent senior-level gate review on the staged diff only, prioritizing bugs, regressions, missing tests, and risky assumptions. Use when Codex should review completed work from a separate perspective before final formatting, type checks, and commit.
---

# Senior Reviewer

Use this skill after implementation is functionally complete.

The canonical review profile is [.codex/agents/senior-reviewer.md](/Users/jhkim/Project/tactical-auto-battler/.codex/agents/senior-reviewer.md). This skill defines when and how to invoke that profile, not the review rules themselves.

## When To Use

- Implementation and tests pass.
- Changes are staged (`git add`).
- Ready for the commit gate.

## Workflow

1. Stage the completed changes.
2. Identify the primary spec and the files touched.
3. Note the verification commands already run.
4. Spawn a review agent with the `.codex/agents/senior-reviewer.md` profile.
   - The spawning prompt must explicitly carry the output contract from the agent profile.
   - Do not assume the agent automatically has this skill loaded.
5. If findings exist, fix and re-run the review.
6. If no findings, proceed to `npm run format` / `npx tsc --noEmit` / commit.

## Spawn Prompt Checklist

The spawning prompt must include:

- primary spec reference
- list of staged files
- verification commands already run
- `review only, not implementation`
- `findings first, ordered by severity`
- `file references required`
- `if no findings, start with "No actionable findings."`
- `no summary before findings`
- `review only the provided scope`
- `review the staged diff only`
- `return quickly; do not do broad repo exploration`

## Output Shape

The review agent returns findings per the agent profile contract. This skill's closer reports:

- review outcome (findings count or no findings)
- fixes applied, if any
- final verification status
