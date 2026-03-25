/**
 * UnitLayoutCalculator 테스트
 *
 * calculateColumnLayout(): 단일 열 균등 배치
 * calculateBattleLayout(): 전체 전투 레이아웃
 */
import { describe, it, expect } from 'vitest';
import { calculateColumnLayout, calculateBattleLayout } from '../systems/UnitLayoutCalculator';
import type { LayoutConfig } from '../systems/UnitLayoutCalculator';

describe('calculateColumnLayout', () => {
  const colX = 100;
  const yMin = 100;
  const yMax = 500;
  // range = 400

  it('유닛 0개면 빈 배열', () => {
    expect(calculateColumnLayout([], colX, yMin, yMax)).toEqual([]);
  });

  it('유닛 1개: 중앙 배치', () => {
    const result = calculateColumnLayout(['u1'], colX, yMin, yMax);

    expect(result).toHaveLength(1);
    expect(result[0].unitId).toBe('u1');
    expect(result[0].x).toBe(colX);
    // (100 + 1 * 400 / 2) = 300 (중앙)
    expect(result[0].y).toBe(300);
  });

  it('유닛 2개: 1/3, 2/3 지점', () => {
    const result = calculateColumnLayout(['u1', 'u2'], colX, yMin, yMax);

    expect(result).toHaveLength(2);
    // 100 + 1 * 400/3 ≈ 233.33
    expect(result[0].y).toBeCloseTo(233.33, 1);
    // 100 + 2 * 400/3 ≈ 366.67
    expect(result[1].y).toBeCloseTo(366.67, 1);
  });

  it('유닛 3개: 1/4, 2/4, 3/4 지점', () => {
    const result = calculateColumnLayout(['u1', 'u2', 'u3'], colX, yMin, yMax);

    expect(result).toHaveLength(3);
    expect(result[0].y).toBe(200); // 100 + 1*400/4
    expect(result[1].y).toBe(300); // 100 + 2*400/4
    expect(result[2].y).toBe(400); // 100 + 3*400/4
  });

  it('유닛 4개: 1/5~4/5 지점', () => {
    const result = calculateColumnLayout(['u1', 'u2', 'u3', 'u4'], colX, yMin, yMax);

    expect(result).toHaveLength(4);
    expect(result[0].y).toBe(180); // 100 + 1*400/5
    expect(result[1].y).toBe(260); // 100 + 2*400/5
    expect(result[2].y).toBe(340); // 100 + 3*400/5
    expect(result[3].y).toBe(420); // 100 + 4*400/5
  });

  it('X 좌표는 모두 colX', () => {
    const result = calculateColumnLayout(['u1', 'u2', 'u3'], 250, yMin, yMax);

    for (const pos of result) {
      expect(pos.x).toBe(250);
    }
  });

  it('유닛 ID가 순서대로 매핑됨', () => {
    const result = calculateColumnLayout(['a', 'b', 'c'], colX, yMin, yMax);

    expect(result.map((p) => p.unitId)).toEqual(['a', 'b', 'c']);
  });
});

describe('calculateBattleLayout', () => {
  const config: LayoutConfig = {
    columns: {
      PLAYER_BACK: 100,
      PLAYER_FRONT: 200,
      ENEMY_FRONT: 400,
      ENEMY_BACK: 500,
    },
    yMin: 100,
    yMax: 500,
  };

  it('팀/포지션별로 그룹화하여 배치', () => {
    const units = [
      { id: 'p1', team: 'PLAYER', position: 'FRONT', isAlive: true },
      { id: 'p2', team: 'PLAYER', position: 'BACK', isAlive: true },
      { id: 'e1', team: 'ENEMY', position: 'FRONT', isAlive: true },
    ];

    const result = calculateBattleLayout(units, config);

    expect(result).toHaveLength(3);

    const p1 = result.find((p) => p.unitId === 'p1')!;
    const p2 = result.find((p) => p.unitId === 'p2')!;
    const e1 = result.find((p) => p.unitId === 'e1')!;

    expect(p1.x).toBe(200); // PLAYER_FRONT
    expect(p2.x).toBe(100); // PLAYER_BACK
    expect(e1.x).toBe(400); // ENEMY_FRONT

    // 각 열에 1명씩 → 중앙
    expect(p1.y).toBe(300);
    expect(p2.y).toBe(300);
    expect(e1.y).toBe(300);
  });

  it('같은 열에 여러 유닛 → 균등 배치', () => {
    const units = [
      { id: 'p1', team: 'PLAYER', position: 'FRONT', isAlive: true },
      { id: 'p2', team: 'PLAYER', position: 'FRONT', isAlive: true },
      { id: 'p3', team: 'PLAYER', position: 'FRONT', isAlive: true },
    ];

    const result = calculateBattleLayout(units, config);

    expect(result).toHaveLength(3);
    // 3명 → 1/4, 2/4, 3/4
    expect(result[0].y).toBe(200);
    expect(result[1].y).toBe(300);
    expect(result[2].y).toBe(400);
  });

  it('사망 유닛은 제외', () => {
    const units = [
      { id: 'p1', team: 'PLAYER', position: 'FRONT', isAlive: true },
      { id: 'p2', team: 'PLAYER', position: 'FRONT', isAlive: false },
      { id: 'p3', team: 'PLAYER', position: 'FRONT', isAlive: true },
    ];

    const result = calculateBattleLayout(units, config);

    expect(result).toHaveLength(2);
    // 생존 2명 → 1/3, 2/3
    expect(result[0].unitId).toBe('p1');
    expect(result[1].unitId).toBe('p3');
    expect(result[0].y).toBeCloseTo(233.33, 1);
    expect(result[1].y).toBeCloseTo(366.67, 1);
  });

  it('빈 배열이면 빈 결과', () => {
    expect(calculateBattleLayout([], config)).toEqual([]);
  });

  it('config에 없는 그룹키는 무시', () => {
    const units = [{ id: 'x1', team: 'UNKNOWN', position: 'FRONT', isAlive: true }];
    const result = calculateBattleLayout(units, config);
    expect(result).toEqual([]);
  });
});
