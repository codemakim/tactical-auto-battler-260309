import type { BattlefieldId } from '../types';

export interface BattlefieldDefinition {
  id: BattlefieldId;
  name: string;
  description: string;
  difficulty: number;
  theme: string;
  enemyPreview: string;
  color: number;
  bgColor: number;
  unlocked: boolean;
  unlockCondition?: string;
  battleBackgroundKey?: string;
}

export const BATTLEFIELDS: BattlefieldDefinition[] = [
  {
    id: 'plains',
    name: '변방 초원',
    description: '평화로운 초원 변두리에 도적들이 출몰한다.\n입문자를 위한 전장.',
    difficulty: 1,
    theme: '초원 / 평야',
    enemyPreview: 'Brute, Ranger',
    color: 0x4ade80,
    bgColor: 0x1a2e1a,
    unlocked: true,
    battleBackgroundKey: 'battle-bg-plains',
  },
  {
    id: 'dark_forest',
    name: '어둠의 숲',
    description: '빽빽한 수림 사이로 적의 화살이 날아온다.\n후열 위협이 강한 전장.',
    difficulty: 2,
    theme: '숲 / 야간',
    enemyPreview: 'Ranger, Guard',
    color: 0x8b5cf6,
    bgColor: 0x1a1a2e,
    unlocked: false,
    unlockCondition: '변방 초원 클리어',
  },
  {
    id: 'ruined_fortress',
    name: '폐허 요새',
    description: '무너진 요새에 강력한 적이 포진해 있다.\n포지션 전략이 핵심.',
    difficulty: 3,
    theme: '폐허 / 성채',
    enemyPreview: 'Guard, Disruptor, Boss',
    color: 0xef4444,
    bgColor: 0x2e1a1a,
    unlocked: false,
    unlockCondition: '어둠의 숲 클리어',
  },
];

export function getBattlefieldById(id: BattlefieldId): BattlefieldDefinition | undefined {
  return BATTLEFIELDS.find((battlefield) => battlefield.id === id);
}

export function getBattlefieldBackgroundKey(id: BattlefieldId): string | null {
  return getBattlefieldById(id)?.battleBackgroundKey ?? null;
}
