/**
 * FormationValidator 테스트
 *
 * validateFormation(): 편성 유효성 검증
 * canAddToZone(): 영역 추가 가능 여부
 */
import { describe, it, expect } from 'vitest';
import { validateFormation, canAddToZone } from '../systems/FormationValidator';
import type { FormationData } from '../core/GameState';
import { HeroType, Position } from '../types';

function makeFormation(overrides: Partial<FormationData> = {}): FormationData {
  return {
    slots: [],
    heroType: HeroType.COMMANDER,
    ...overrides,
  };
}

describe('validateFormation', () => {
  it('유효한 편성: 3명 출전 + 교체 1명', () => {
    const f = makeFormation({
      slots: [
        { characterId: 'c1', position: Position.FRONT },
        { characterId: 'c2', position: Position.FRONT },
        { characterId: 'c3', position: Position.BACK },
      ],
      reserveId: 'c4',
    });
    const result = validateFormation(f);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('유효한 편성: 1명만 출전', () => {
    const f = makeFormation({
      slots: [{ characterId: 'c1', position: Position.FRONT }],
    });
    const result = validateFormation(f);
    expect(result.valid).toBe(true);
  });

  it('유효한 편성: 2명 출전, 교체 없음', () => {
    const f = makeFormation({
      slots: [
        { characterId: 'c1', position: Position.FRONT },
        { characterId: 'c2', position: Position.BACK },
      ],
    });
    const result = validateFormation(f);
    expect(result.valid).toBe(true);
  });

  it('빈 편성: 최소 1명 필요', () => {
    const f = makeFormation({ slots: [] });
    const result = validateFormation(f);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('최소 1명'));
  });

  it('빈 characterId만 있는 슬롯은 무시', () => {
    const f = makeFormation({
      slots: [{ characterId: '', position: Position.FRONT }],
    });
    const result = validateFormation(f);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('최소 1명'));
  });

  it('4명 초과 출전: 오류', () => {
    const f = makeFormation({
      slots: [
        { characterId: 'c1', position: Position.FRONT },
        { characterId: 'c2', position: Position.FRONT },
        { characterId: 'c3', position: Position.BACK },
        { characterId: 'c4', position: Position.BACK },
      ],
    });
    const result = validateFormation(f);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('최대 3명'));
  });

  it('중복 캐릭터: 출전 슬롯 내 중복', () => {
    const f = makeFormation({
      slots: [
        { characterId: 'c1', position: Position.FRONT },
        { characterId: 'c1', position: Position.BACK },
      ],
    });
    const result = validateFormation(f);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('중복'));
  });

  it('중복 캐릭터: 출전과 교체 간 중복', () => {
    const f = makeFormation({
      slots: [{ characterId: 'c1', position: Position.FRONT }],
      reserveId: 'c1',
    });
    const result = validateFormation(f);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('중복'));
  });

  it('교체만 있고 출전 없음: 오류', () => {
    const f = makeFormation({
      slots: [],
      reserveId: 'c1',
    });
    const result = validateFormation(f);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('최소 1명'));
  });
});

describe('canAddToZone', () => {
  it('빈 편성에 FRONT 추가 가능', () => {
    const f = makeFormation({ slots: [] });
    const result = canAddToZone(f, 'FRONT', 'c1');
    expect(result.allowed).toBe(true);
  });

  it('빈 편성에 BACK 추가 가능', () => {
    const f = makeFormation({ slots: [] });
    const result = canAddToZone(f, 'BACK', 'c1');
    expect(result.allowed).toBe(true);
  });

  it('3명 차면 추가 불가', () => {
    const f = makeFormation({
      slots: [
        { characterId: 'c1', position: Position.FRONT },
        { characterId: 'c2', position: Position.FRONT },
        { characterId: 'c3', position: Position.BACK },
      ],
    });
    const result = canAddToZone(f, 'FRONT', 'c4');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('3명');
  });

  it('이미 출전 중인 캐릭터는 이동으로 간주 (차단 안함)', () => {
    const f = makeFormation({
      slots: [
        { characterId: 'c1', position: Position.FRONT },
        { characterId: 'c2', position: Position.FRONT },
        { characterId: 'c3', position: Position.BACK },
      ],
    });
    // c1은 이미 FRONT에 있으므로 BACK으로 이동 = 허용
    const result = canAddToZone(f, 'BACK', 'c1');
    expect(result.allowed).toBe(true);
  });

  it('RESERVE 추가는 항상 허용', () => {
    const f = makeFormation({
      slots: [
        { characterId: 'c1', position: Position.FRONT },
        { characterId: 'c2', position: Position.FRONT },
        { characterId: 'c3', position: Position.BACK },
      ],
      reserveId: 'c4',
    });
    const result = canAddToZone(f, 'RESERVE', 'c5');
    expect(result.allowed).toBe(true);
  });
});
