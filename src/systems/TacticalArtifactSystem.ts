import { TACTICAL_ARTIFACTS, getTacticalArtifactById } from '../data/TacticalArtifacts';
import { BuffType, RewardKind, TacticalArtifactEffectType, Team } from '../types';
import type { BattleUnit, RunState, TacticalArtifactDefinition, TacticalArtifactId } from '../types';

const ARTIFACT_REWARD_COUNT = 3;
const MULTIPLIER_SCALE = 10000;

export function getRewardKindForStage(currentStage: number, maxStages: number) {
  if (currentStage >= maxStages) return RewardKind.NONE;
  if (currentStage === 2 || currentStage === 4) return RewardKind.ARTIFACT;
  return RewardKind.CARD;
}

export function createArtifactRewardOptions(
  seed: number,
  ownedIds: TacticalArtifactId[],
  count = ARTIFACT_REWARD_COUNT,
): TacticalArtifactDefinition[] {
  const owned = new Set(ownedIds);
  const available = TACTICAL_ARTIFACTS.filter((artifact) => !owned.has(artifact.id));
  if (available.length <= count) return available;

  const start = Math.abs(seed) % available.length;
  return Array.from({ length: count }, (_, offset) => available[(start + offset) % available.length]);
}

export function addTacticalArtifact(runState: RunState, artifactId: TacticalArtifactId): RunState {
  if (runState.artifactIds.includes(artifactId)) return runState;
  return { ...runState, artifactIds: [...runState.artifactIds, artifactId] };
}

export function applyStartingArtifactEffects(units: BattleUnit[], artifactIds: TacticalArtifactId[]): BattleUnit[] {
  let result = units;

  for (const artifactId of artifactIds) {
    const artifact = getTacticalArtifactById(artifactId);
    if (!artifact) continue;

    switch (artifact.effect.type) {
      case TacticalArtifactEffectType.STARTING_SHIELD_BY_POSITION: {
        const effect = artifact.effect;
        result = result.map((unit) => {
          if (unit.team !== Team.PLAYER || unit.position !== effect.position) return unit;
          return { ...unit, shield: unit.shield + effect.amount };
        });
        break;
      }
      case TacticalArtifactEffectType.ROUND_ONE_ATK_BUFF: {
        const effect = artifact.effect;
        result = result.map((unit) => {
          if (unit.team !== Team.PLAYER) return unit;
          return {
            ...unit,
            buffs: [
              ...unit.buffs,
              {
                id: `${artifact.id}_${unit.id}`,
                type: BuffType.ATK_UP,
                value: effect.value,
                duration: effect.duration,
                sourceId: artifact.id,
              },
            ],
          };
        });
        break;
      }
      case TacticalArtifactEffectType.DAMAGE_MULTIPLIER_BY_POSITION: {
        const effect = artifact.effect;
        result = result.map((unit) => {
          if (unit.team !== Team.PLAYER || unit.position !== effect.position) return unit;
          return {
            ...unit,
            damageMultiplier: (unit.damageMultiplier ?? 1) * effect.multiplier,
          };
        });
        break;
      }
      case TacticalArtifactEffectType.GOLD_REWARD_MULTIPLIER:
        break;
    }
  }

  return result;
}

export function applyGoldArtifactMultiplier(gold: number, artifactIds: TacticalArtifactId[]): number {
  let result = gold;

  for (const artifactId of artifactIds) {
    const artifact = getTacticalArtifactById(artifactId);
    if (!artifact || artifact.effect.type !== TacticalArtifactEffectType.GOLD_REWARD_MULTIPLIER) continue;
    const scaledMultiplier = Math.round(artifact.effect.multiplier * MULTIPLIER_SCALE);
    result = Math.floor((result * scaledMultiplier) / MULTIPLIER_SCALE);
  }

  return Math.max(0, result);
}
