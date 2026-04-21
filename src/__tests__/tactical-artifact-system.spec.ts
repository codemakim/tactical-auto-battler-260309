import { describe, expect, it } from 'vitest';
import { createCharacterDef, createUnit } from '../entities/UnitFactory';
import {
  addTacticalArtifact,
  applyGoldArtifactMultiplier,
  applyStartingArtifactEffects,
  createArtifactRewardOptions,
  getRewardKindForStage,
} from '../systems/TacticalArtifactSystem';
import { BuffType, CharacterClass, Position, RewardKind, Team } from '../types';
import type { RunState } from '../types';
import { createRunState } from '../core/RunManager';

function makeRun(overrides: Partial<RunState> = {}): RunState {
  const party = [
    createCharacterDef('Warrior', CharacterClass.WARRIOR),
    createCharacterDef('Archer', CharacterClass.ARCHER),
    createCharacterDef('Guardian', CharacterClass.GUARDIAN),
    createCharacterDef('Assassin', CharacterClass.ASSASSIN),
  ];

  return { ...createRunState(party, 42), ...overrides };
}

describe('TacticalArtifactSystem', () => {
  it('Stage 1/3은 카드, Stage 2/4는 전술 유물, 마지막 Stage는 런 종료 보상 없음으로 분기한다', () => {
    expect(getRewardKindForStage(1, 5)).toBe(RewardKind.CARD);
    expect(getRewardKindForStage(2, 5)).toBe(RewardKind.ARTIFACT);
    expect(getRewardKindForStage(3, 5)).toBe(RewardKind.CARD);
    expect(getRewardKindForStage(4, 5)).toBe(RewardKind.ARTIFACT);
    expect(getRewardKindForStage(5, 5)).toBe(RewardKind.NONE);
  });

  it('전술 유물 보상 선택지는 이미 보유한 유물을 제외한다', () => {
    const options = createArtifactRewardOptions(100, ['frontline_plates']);

    expect(options).toHaveLength(3);
    expect(options.map((option) => option.id)).not.toContain('frontline_plates');
  });

  it('전술 유물 선택은 중복 추가하지 않는다', () => {
    const run = makeRun({ artifactIds: ['frontline_plates'] });

    const result = addTacticalArtifact(run, 'frontline_plates');

    expect(result.artifactIds).toEqual(['frontline_plates']);
  });

  it('frontline_plates는 전투 시작 시 전열 아군에게만 실드를 부여한다', () => {
    const front = createUnit(createCharacterDef('Front', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const back = createUnit(createCharacterDef('Back', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const enemy = createUnit(createCharacterDef('Enemy', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const result = applyStartingArtifactEffects([front, back, enemy], ['frontline_plates']);

    expect(result.find((unit) => unit.id === front.id)?.shield).toBe(6);
    expect(result.find((unit) => unit.id === back.id)?.shield).toBe(0);
    expect(result.find((unit) => unit.id === enemy.id)?.shield).toBe(0);
  });

  it('opening_drill은 전투 시작 시 아군에게 1라운드 ATK 버프를 부여한다', () => {
    const ally = createUnit(createCharacterDef('Ally', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('Enemy', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const result = applyStartingArtifactEffects([ally, enemy], ['opening_drill']);

    expect(result.find((unit) => unit.id === ally.id)?.buffs).toMatchObject([
      { type: BuffType.ATK_UP, value: 2, duration: 1 },
    ]);
    expect(result.find((unit) => unit.id === enemy.id)?.buffs).toHaveLength(0);
  });

  it('backline_focus는 후열 아군의 DAMAGE 배율을 증가시킨다', () => {
    const back = createUnit(createCharacterDef('Back', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const front = createUnit(createCharacterDef('Front', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const result = applyStartingArtifactEffects([back, front], ['backline_focus']);

    expect(result[0].damageMultiplier).toBe(1.1);
    expect(result[1].damageMultiplier).toBeUndefined();
  });

  it('spoils_map은 승리 골드 보상에 15% 보정을 소수점 내림으로 적용한다', () => {
    expect(applyGoldArtifactMultiplier(100, ['spoils_map'])).toBe(115);
    expect(applyGoldArtifactMultiplier(60, ['spoils_map'])).toBe(69);
    expect(applyGoldArtifactMultiplier(80, ['spoils_map'])).toBe(92);
    expect(applyGoldArtifactMultiplier(100, [])).toBe(100);
  });
});
