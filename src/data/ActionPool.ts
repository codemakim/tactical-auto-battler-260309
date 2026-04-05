import { Rarity, Target, type CardTemplate } from '../types';
import { CLASS_DEFINITIONS } from './ClassDefinitions';

// === Universal Card Templates (범용, 모든 클래스 사용 가능) ===

export const UNIVERSAL_CARD_TEMPLATES: CardTemplate[] = [
  // --- 위치 이동 카드 ---
  {
    id: 'universal_advance',
    name: 'Advance',
    rarity: Rarity.COMMON,
    condition: { type: 'POSITION_BACK' },
    effectTemplates: [{ type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'FRONT' }],
  },
  {
    id: 'universal_withdraw',
    name: 'Withdraw',
    rarity: Rarity.COMMON,
    condition: { type: 'POSITION_FRONT' },
    effectTemplates: [{ type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'BACK' }],
  },
  // --- 전투 카드 ---
  {
    id: 'universal_quick_strike',
    name: 'Quick Strike',
    rarity: Rarity.COMMON,
    condition: { type: 'POSITION_FRONT' },
    effectTemplates: [
      { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.7, 0.8, 0.9], targetPool: [Target.ENEMY_FRONT] },
    ],
  },
  {
    id: 'universal_guard',
    name: 'Guard',
    rarity: Rarity.COMMON,
    condition: { type: 'ALWAYS' },
    effectTemplates: [{ type: 'SHIELD', stat: 'grd', multiplierPool: [0.8, 1.0, 1.2], targetPool: [Target.SELF] }],
  },
  {
    id: 'universal_recover',
    name: 'Recover',
    rarity: Rarity.COMMON,
    condition: { type: 'HP_BELOW', value: 50 },
    conditionValuePool: [40, 50, 60],
    effectTemplates: [{ type: 'HEAL', multiplierPool: [15, 20, 25], targetPool: [Target.SELF] }],
  },
  {
    id: 'universal_rally',
    name: 'Rally',
    rarity: Rarity.RARE,
    condition: { type: 'ALLY_HP_BELOW', value: 50 },
    conditionValuePool: [40, 50, 60],
    effectTemplates: [{ type: 'HEAL', multiplierPool: [10, 15, 20], targetPool: [Target.ALLY_LOWEST_HP] }],
  },
  {
    id: 'universal_feint',
    name: 'Feint',
    rarity: Rarity.RARE,
    condition: { type: 'POSITION_FRONT' },
    effectTemplates: [
      { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.4, 0.5, 0.6], targetPool: [Target.ENEMY_FRONT] },
      { type: 'DELAY_TURN', multiplierPool: [1], targetPool: [Target.ENEMY_FRONT] },
    ],
  },
];

/**
 * 클래스 전용 카드 + 공용 카드를 합친 전체 템플릿 풀 반환
 */
export function getAllTemplatesForClass(characterClass: string): CardTemplate[] {
  const classTemplates = CLASS_DEFINITIONS[characterClass]?.cardTemplates ?? [];
  return [...classTemplates, ...UNIVERSAL_CARD_TEMPLATES];
}
