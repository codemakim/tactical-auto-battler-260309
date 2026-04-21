import { Position, Rarity, TacticalArtifactEffectType, TacticalArtifactId } from '../types';
import type { TacticalArtifactDefinition } from '../types';

export const TACTICAL_ARTIFACTS: TacticalArtifactDefinition[] = [
  {
    id: TacticalArtifactId.FRONTLINE_PLATES,
    name: 'Frontline Plates',
    description: '전열 아군이 전투 시작 시 실드 6을 얻습니다.',
    rarity: Rarity.COMMON,
    effect: {
      type: TacticalArtifactEffectType.STARTING_SHIELD_BY_POSITION,
      position: Position.FRONT,
      amount: 6,
    },
  },
  {
    id: TacticalArtifactId.OPENING_DRILL,
    name: 'Opening Drill',
    description: '첫 라운드에 아군의 ATK가 2 증가합니다.',
    rarity: Rarity.COMMON,
    effect: {
      type: TacticalArtifactEffectType.ROUND_ONE_ATK_BUFF,
      value: 2,
      duration: 1,
    },
  },
  {
    id: TacticalArtifactId.BACKLINE_FOCUS,
    name: 'Backline Focus',
    description: '후열 아군의 공격 피해가 10% 증가합니다.',
    rarity: Rarity.RARE,
    effect: {
      type: TacticalArtifactEffectType.DAMAGE_MULTIPLIER_BY_POSITION,
      position: Position.BACK,
      multiplier: 1.1,
    },
  },
  {
    id: TacticalArtifactId.SPOILS_MAP,
    name: 'Spoils Map',
    description: '전투 승리 골드가 15% 증가합니다.',
    rarity: Rarity.COMMON,
    effect: {
      type: TacticalArtifactEffectType.GOLD_REWARD_MULTIPLIER,
      multiplier: 1.15,
    },
  },
];

export function getTacticalArtifactById(id: TacticalArtifactId): TacticalArtifactDefinition | undefined {
  return TACTICAL_ARTIFACTS.find((artifact) => artifact.id === id);
}
