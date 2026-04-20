---
name: spec-to-implementation
description: Drive a spec-first development task from source spec through tests, implementation, verification, docs, and commit. Use when Codex should follow a strict workflow such as: read the primary spec, reconcile scope, plan, write tests first, implement, run validation commands, update handoff/checklists/spec docs, and then commit intentionally.
---

# Spec To Implementation

Use this skill for this repository's disciplined spec-first workflow. Keep the loop strict and do not skip the test and documentation steps.

## Workflow

1. Read the primary spec first.
- Read the explicitly named source-of-truth doc first.
- Read only the secondary docs needed to clarify transitions, data shape, or UI responsibilities.
- If the spec is weak or conflicting, stop and switch to `$spec-reconciliation` or `$meta-loop-spec-writer` before coding.

2. Define the task boundary.
- State the exact user-facing behavior being added or changed.
- Name the files or modules most likely to change.
- Note what is explicitly out of scope.

3. Write tests before implementation.
- Add or update the smallest set of tests that define the new contract.
- Prefer pure-function tests when possible.
- Add scene or integration tests only when the contract crosses multiple systems.

4. Implement to satisfy the tests.
- Keep edits constrained to the agreed task boundary.
- Prefer extracting pure helpers when UI scenes become bulky.
- Do not widen the scope unless the current implementation is blocked.

5. Run verification in order.
- Run `npm test`.
- Run `npm run format`.
- Run `npx tsc --noEmit`.
- If the task needs narrower checks first, use them before the full pass.

6. Update docs before closeout.
- Update the source spec if behavior changed.
- Update `docs/combat-impl-checklist.md` or the relevant checklist.
- Update `WORKLOG.md` with the latest completion and next-step note.
- If the implementation removed or deferred behavior, say so plainly in the source doc.

7. Prepare the commit boundary.
- Keep the commit scope aligned with the feature or fix.
- Do not commit until the user asks.
- Do not push unless the user explicitly asks.
- Summarize outcome, verification, and remaining risk.

## Guardrails

- Do not start implementation if the source of truth is unclear.
- Do not skip tests just because the change feels small.
- Do not leave docs behind the code when the behavior changed.
- Do not mix unrelated cleanup into the same feature commit.

## Output Shape

When closing out a task, report:
- what changed
- what was verified
- what doc/checklist/handoff files changed
- whether changes are prepared, committed, or pushed
