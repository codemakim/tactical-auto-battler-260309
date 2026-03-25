/**
 * FloatingTextCalculator 테스트
 *
 * extractFloatingTexts(): BattleEvent[] → FloatingTextData[]
 */
import { describe, it, expect } from 'vitest';
import { extractFloatingTexts } from '../systems/FloatingTextCalculator';
import type { BattleEvent } from '../types';

function makeEvent(overrides: Partial<BattleEvent> & { type: BattleEvent['type'] }): BattleEvent {
  return {
    id: 'ev-1',
    round: 1,
    turn: 1,
    timestamp: 0,
    ...overrides,
  };
}

describe('extractFloatingTexts', () => {
  it('DAMAGE_DEALT → DAMAGE 플로팅', () => {
    const events: BattleEvent[] = [makeEvent({ type: 'DAMAGE_DEALT', targetId: 'u1', value: 25 })];
    const result = extractFloatingTexts(events);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'DAMAGE', value: 25, targetUnitId: 'u1' });
  });

  it('SHIELD_APPLIED → SHIELD 플로팅', () => {
    const events: BattleEvent[] = [makeEvent({ type: 'SHIELD_APPLIED', targetId: 'u2', value: 15 })];
    const result = extractFloatingTexts(events);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'SHIELD', value: 15, targetUnitId: 'u2' });
  });

  it('HEAL_APPLIED → HEAL 플로팅', () => {
    const events: BattleEvent[] = [makeEvent({ type: 'HEAL_APPLIED', targetId: 'u3', value: 10 })];
    const result = extractFloatingTexts(events);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'HEAL', value: 10, targetUnitId: 'u3' });
  });

  it('UNIT_DIED → DEATH 플로팅', () => {
    const events: BattleEvent[] = [makeEvent({ type: 'UNIT_DIED', targetId: 'u4' })];
    const result = extractFloatingTexts(events);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'DEATH', targetUnitId: 'u4' });
  });

  it('BUFF_APPLIED → BUFF 플로팅 (buffType 포함)', () => {
    const events: BattleEvent[] = [makeEvent({ type: 'BUFF_APPLIED', targetId: 'u5', data: { buffType: 'ATK_UP' } })];
    const result = extractFloatingTexts(events);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'BUFF', label: 'ATK_UP', targetUnitId: 'u5' });
  });

  it('DEBUFF_APPLIED → DEBUFF 플로팅 (buffType 포함)', () => {
    const events: BattleEvent[] = [
      makeEvent({ type: 'DEBUFF_APPLIED', targetId: 'u6', data: { buffType: 'ATK_DOWN' } }),
    ];
    const result = extractFloatingTexts(events);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'DEBUFF', label: 'ATK_DOWN', targetUnitId: 'u6' });
  });

  it('여러 이벤트 한꺼번에 처리', () => {
    const events: BattleEvent[] = [
      makeEvent({ type: 'DAMAGE_DEALT', targetId: 'u1', value: 20 }),
      makeEvent({ type: 'SHIELD_APPLIED', targetId: 'u2', value: 10 }),
      makeEvent({ type: 'UNIT_DIED', targetId: 'u1' }),
    ];
    const result = extractFloatingTexts(events);

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('DAMAGE');
    expect(result[1].type).toBe('SHIELD');
    expect(result[2].type).toBe('DEATH');
  });

  it('관련 없는 이벤트는 무시', () => {
    const events: BattleEvent[] = [
      makeEvent({ type: 'ROUND_START' }),
      makeEvent({ type: 'ACTION_EXECUTED', sourceId: 'u1', targetId: 'u2' }),
      makeEvent({ type: 'BATTLE_END' }),
    ];
    const result = extractFloatingTexts(events);

    expect(result).toHaveLength(0);
  });

  it('targetId 없는 이벤트는 무시', () => {
    const events: BattleEvent[] = [makeEvent({ type: 'DAMAGE_DEALT', value: 10 })];
    const result = extractFloatingTexts(events);

    expect(result).toHaveLength(0);
  });

  it('value 없는 DAMAGE_DEALT는 무시', () => {
    const events: BattleEvent[] = [makeEvent({ type: 'DAMAGE_DEALT', targetId: 'u1' })];
    const result = extractFloatingTexts(events);

    expect(result).toHaveLength(0);
  });
});
