---
name: handoff-closeout
description: Close out a completed task by updating HANDOFF.md, checklists, source specs, verification notes, and commit-facing summaries. Use when implementation and verification are done and Codex should leave the repo ready for the next model or session without hidden context.
---

# Handoff Closeout

Use this skill at the end of a task. The goal is to leave no invisible state behind.

## Workflow

1. Update the live handoff board.
- Mark the latest completed task in `HANDOFF.md`.
- Set the current source specs for the area just touched.
- Add a short next-step recommendation, not a long roadmap.

2. Update implementation checklists.
- Check completed items.
- Remove or rewrite stale checklist text that now conflicts with reality.
- If the repo tracks worker/date attribution, preserve that format.

3. Update source docs when behavior changed.
- Touch the actual source-of-truth spec, not only the checklist.
- Remove references to deleted or deferred behavior.
- If the implementation removed a feature, say so plainly.

4. Record verification.
- Note the commands run.
- Keep the verification wording short and factual.
- If a required check could not run, state that explicitly.

5. Prepare the commit boundary.
- Ensure the staged change set matches the task.
- Avoid bundling unrelated cleanup.
- Keep the summary aligned with the actual scope.

## Guardrails

- Do not leave `HANDOFF.md` pointing at the previous task.
- Do not mark checklist items done unless tests and behavior really match.
- Do not update only the handoff board and forget the source spec.
- Do not write long narrative recaps into handoff files.

## Output Shape

When reporting completion, include:
- implementation outcome
- verification commands
- docs updated
- commit status
