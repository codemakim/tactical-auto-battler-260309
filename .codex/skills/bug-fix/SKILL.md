---
name: bug-fix
description: Drive a bug from report through reproduction, root cause, fix, regression test, and verification. Use when the task is fixing broken behavior rather than building new features, so the workflow starts from reproduction instead of spec.
---

# Bug Fix

Use this skill when the starting point is broken behavior, not a feature spec. The loop is reproduction-first, not spec-first.

## Workflow

1. Clarify the bug.
- What is the expected behavior?
- What actually happens?
- When did it start? (recent commit, always broken, after a specific change)

2. Reproduce before touching code.
- Write the smallest test or script that demonstrates the failure.
- If the bug is in pure logic, add a failing unit test.
- If the bug is in scene flow or save/load, describe the exact steps and expected vs actual state.
- Do not skip this step even if the fix looks obvious.
- If the bug cannot be reproduced yet, stop and narrow the report instead of guessing at a fix.

3. Find the root cause.
- Trace from the reproduction to the actual fault.
- Check the closest spec to confirm which behavior is correct.
- If the spec is ambiguous or missing, note that explicitly before fixing.

4. Fix at the root.
- Prefer the smallest change that corrects the behavior.
- Do not widen scope into refactoring or feature work.
- If the fix requires a design change, stop and escalate to the user or switch to `$spec-to-implementation`.

5. Verify the fix.
- The reproduction test from step 2 must now pass.
- Run related tests to check for regressions.
- Run full `npm test` only after related tests pass or when the touched boundary is broad.
- Run `npm run format` and `npx tsc --noEmit`.

6. Add a regression guard.
- If step 2 was a script or manual check, convert it into a permanent test.
- The test should fail without the fix and pass with it.

7. Update docs only if the bug revealed a spec gap.
- If the spec was wrong or missing, update the source doc.
- If the spec was correct and the code was just wrong, no doc update needed.

## Guardrails

- Do not start fixing before reproducing.
- Do not bundle unrelated improvements into the fix commit.
- Do not remove or weaken existing tests to make the fix pass.
- If multiple bugs surface during investigation, fix only the reported one and note the others for follow-up.
- Review and commit scope should stay inside the bug fix diff. Cleanup outside that scope is follow-up work.

## Output Shape

When closing out, report:
- bug description (one line)
- root cause
- fix applied (files changed)
- regression test added
- verification commands run
- residual risks if the repro still has any manual-only portion
