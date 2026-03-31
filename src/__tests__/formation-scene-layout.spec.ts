import { describe, expect, it } from 'vitest';
import { FORMATION_LAYOUT, FORMATION_SPRITE_MAP, HERO_TYPES, getFormationZones } from '../systems/FormationSceneLayout';
import { HeroType, Position } from '../types';

describe('FormationSceneLayout', () => {
  it('편성 존은 전술 보드 기준 2개 라인으로 고정된다', () => {
    const zones = getFormationZones();

    expect(zones).toHaveLength(2);
    expect(zones[0]).toMatchObject({
      key: 'BACK',
      x: FORMATION_LAYOUT.board.x,
      y: FORMATION_LAYOUT.board.y,
      width: FORMATION_LAYOUT.board.width,
      height: FORMATION_LAYOUT.board.zoneHeight,
      position: Position.BACK,
      maxUnits: 5,
    });
    expect(zones[1]).toMatchObject({
      key: 'FRONT',
      x: FORMATION_LAYOUT.board.x,
      y: FORMATION_LAYOUT.board.y + FORMATION_LAYOUT.board.zoneHeight + FORMATION_LAYOUT.board.zoneGap,
      width: FORMATION_LAYOUT.board.width,
      height: FORMATION_LAYOUT.board.zoneHeight,
      position: Position.FRONT,
      maxUnits: 5,
    });
  });

  it('편성 화면은 고정된 영웅 타입과 스프라이트 매핑을 가진다', () => {
    expect(HERO_TYPES).toEqual([HeroType.COMMANDER, HeroType.MAGE, HeroType.SUPPORT]);
    expect(FORMATION_SPRITE_MAP.WARRIOR).toMatchObject({ texture: 'warrior-attack', idleFrame: 0 });
    expect(FORMATION_SPRITE_MAP.ARCHER).toMatchObject({ texture: 'archer-attack', idleFrame: 27 });
    expect(FORMATION_SPRITE_MAP.CONTROLLER).toMatchObject({ texture: 'controller-attack', idleFrame: 0 });
  });
});
