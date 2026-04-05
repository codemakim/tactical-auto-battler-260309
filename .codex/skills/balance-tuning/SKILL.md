---
name: balance-tuning
description: Tune game balance numbers (stats, costs, rewards, encounter scaling) using simulation data as evidence. Use when the task is adjusting numeric values rather than adding systems, and Codex should run simulations, analyze results, propose changes, and verify before committing.
---

# Balance Tuning

Use this skill when the work is changing numbers, not adding systems. The loop is data-driven: simulate, measure, adjust, verify.

## Workflow

1. Define the tuning goal.
- What feels wrong? (too easy, too hard, too swingy, gold overflow, dead actions, etc.)
- Which stage or scenario is affected?
- What does "better" look like in concrete terms?

2. Establish baseline.
- Run `npx tsx src/sim-run.ts` with a fixed seed (`SIM_SEED=N`) to get reproducible results.
- Record the key metrics: win rate, average rounds, gold earned, HP remaining, action usage.
- Run multiple seeds (3~5) to check variance.
- Save the exact seeds and command form used so before/after numbers are directly comparable.

3. Identify the lever.
- Which numbers control the outcome? (stat values in ClassDefinitions, reward formulas in BattleRewardSystem, encounter scaling in EnemyEncounterData, cost tables in TrainingSystem, etc.)
- Prefer adjusting one lever at a time.
- If more than one lever seems necessary, prove the first lever was insufficient before widening scope.

4. Make the change.
- Edit the data file or formula.
- Keep the change minimal and clearly labeled in the diff.

5. Measure the result.
- Re-run the same seeds from step 2.
- Compare before/after metrics.
- If the change improved the target metric without breaking others, proceed.
- If it introduced a new problem, revert and try a different lever.
- Keep the result summary compact: seed set, before, after, conclusion.

6. Verify correctness.
- Run `npm test` to ensure no contracts broke.
- Run `npm run format` and `npx tsc --noEmit`.
- Check that the change does not violate any spec rules (damage formulas, reward caps, etc.).

7. Document the rationale.
- In the commit message, note: what was tuned, why, and the before/after metric.
- If a spec defines a numeric range or formula, update it to match.

## Heuristics

- Prefer small increments over large swings.
- If a single lever cannot fix the problem, the issue may be structural — escalate to `$feature-cut-mvp` or `$spec-to-implementation`.
- Tuning encounter composition (who appears) is a different lever from tuning stats (how strong they are). Try composition first if the problem is difficulty curve.
- Gold economy changes cascade: training cost, shop price, and reward amount are coupled. Change one, check all three.

## Guardrails

- Do not add new systems or mechanics as part of a tuning pass.
- Do not change formulas in DamageSystem or BuffSystem without spec review.
- Do not tune without simulation evidence.
- Do not commit tuning changes mixed with feature or refactor changes.
- If the sim script cannot expose the needed metric, add the smallest measurement helper first, then tune in a second step.

## Output Shape

When closing out, report:
- tuning goal
- lever adjusted (file and field)
- before/after metrics (seeds used)
- tests passing
- spec updated (if applicable)
- unresolved risks if the tuning still needs real playtest confirmation
