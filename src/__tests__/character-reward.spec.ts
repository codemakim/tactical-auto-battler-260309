/**
 * 캐릭터 획득 기회 테스트 — §23 캐릭터 획득 기회
 *
 * 검증 항목:
 *   1. seed 결정론 — 같은 seed는 항상 같은 결과
 *   2. 확률 범위 — null 반환 비율이 (1 - probability) 근처
 *   3. 로스터 크기 영향 — 로스터가 클수록 획득 확률 감소
 *   4. 난이도 영향 — 난이도 높을수록 획득 확률 증가
 *   5. 반환값 구조 — CharacterReward 필드 검증
 *   6. 엣지케이스 — 로스터가 매우 크면 확률 0 수렴
 */

import { describe, it, expect } from 'vitest';
import { generateCharacterReward } from '../systems/BattleRewardSystem';
import { Difficulty } from '../types';

const STANDARD = Difficulty.STANDARD;

describe('캐릭터 획득 기회 (§23)', () => {
  // ═══════════════════════════════════════════
  // 1. 결정론
  // ═══════════════════════════════════════════

  describe('1. seed 결정론', () => {
    it('같은 seed로 호출하면 항상 같은 결과를 반환한다', () => {
      const r1 = generateCharacterReward(42, STANDARD, 0);
      const r2 = generateCharacterReward(42, STANDARD, 0);
      expect(r1).toEqual(r2);
    });

    it('다른 seed는 (거의 항상) 다른 결과를 생성한다', () => {
      // 큰 seed 범위에서 다른 결과가 반드시 하나는 존재
      const results = new Set<string>();
      for (let s = 0; s < 20; s++) {
        const r = generateCharacterReward(s, STANDARD, 0);
        results.add(JSON.stringify(r));
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });

  // ═══════════════════════════════════════════
  // 2. 확률 범위
  // ═══════════════════════════════════════════

  describe('2. 확률 범위 검증', () => {
    it('STANDARD 난이도, 로스터 0일 때 30%+5%=35% 확률로 보상 생성', () => {
      let hits = 0;
      const trials = 500;
      for (let s = 0; s < trials; s++) {
        const r = generateCharacterReward(s, STANDARD, 0);
        if (r !== null) hits++;
      }
      const ratio = hits / trials;
      // 35% 기대, ±10% 허용
      expect(ratio).toBeGreaterThan(0.25);
      expect(ratio).toBeLessThan(0.50);
    });

    it('EASY 난이도는 기본 30% 확률', () => {
      let hits = 0;
      const trials = 500;
      for (let s = 0; s < trials; s++) {
        const r = generateCharacterReward(s, Difficulty.EASY, 0);
        if (r !== null) hits++;
      }
      const ratio = hits / trials;
      expect(ratio).toBeGreaterThan(0.20);
      expect(ratio).toBeLessThan(0.45);
    });
  });

  // ═══════════════════════════════════════════
  // 3. 로스터 크기 영향
  // ═══════════════════════════════════════════

  describe('3. 로스터 크기 영향', () => {
    it('로스터가 클수록 획득 확률이 감소한다', () => {
      let hitsSmall = 0;
      let hitsLarge = 0;
      const trials = 300;
      for (let s = 0; s < trials; s++) {
        if (generateCharacterReward(s, STANDARD, 0) !== null) hitsSmall++;
        if (generateCharacterReward(s, STANDARD, 10) !== null) hitsLarge++;
      }
      expect(hitsSmall).toBeGreaterThanOrEqual(hitsLarge);
    });

    it('로스터 크기가 임계값 이하면 패널티가 없다', () => {
      // ROSTER_PENALTY_THRESHOLD = 3
      let hits3 = 0;
      let hits0 = 0;
      const trials = 300;
      for (let s = 0; s < trials; s++) {
        if (generateCharacterReward(s, STANDARD, 0) !== null) hits0++;
        if (generateCharacterReward(s, STANDARD, 3) !== null) hits3++;
      }
      // 임계값 내에서는 동일한 확률
      expect(Math.abs(hits0 - hits3)).toBeLessThan(30);
    });
  });

  // ═══════════════════════════════════════════
  // 4. 난이도 영향
  // ═══════════════════════════════════════════

  describe('4. 난이도 영향', () => {
    it('NIGHTMARE 난이도는 EASY보다 높은 확률을 가진다', () => {
      let hitsEasy = 0;
      let hitsNightmare = 0;
      const trials = 400;
      for (let s = 0; s < trials; s++) {
        if (generateCharacterReward(s, Difficulty.EASY, 0) !== null) hitsEasy++;
        if (generateCharacterReward(s, Difficulty.NIGHTMARE, 0) !== null) hitsNightmare++;
      }
      expect(hitsNightmare).toBeGreaterThan(hitsEasy);
    });
  });

  // ═══════════════════════════════════════════
  // 5. 반환값 구조
  // ═══════════════════════════════════════════

  describe('5. CharacterReward 반환값 구조', () => {
    it('보상이 생성되면 CharacterReward 필드를 모두 포함한다', () => {
      // 반드시 null이 아닌 결과를 찾을 때까지 시도
      let reward = null;
      for (let s = 0; s < 1000; s++) {
        reward = generateCharacterReward(s, Difficulty.NIGHTMARE, 0);
        if (reward !== null) break;
      }

      expect(reward).not.toBeNull();
      expect(reward!.characterClass).toBeDefined();
      expect(typeof reward!.trainingPotential).toBe('number');
      expect(reward!.trainingPotential).toBeGreaterThanOrEqual(2);
      expect(reward!.trainingPotential).toBeLessThanOrEqual(5);
      expect(typeof reward!.probability).toBe('number');
      expect(reward!.probability).toBeGreaterThan(0);
      expect(reward!.probability).toBeLessThanOrEqual(1);
    });

    it('null 반환 시 undefined 아닌 null', () => {
      // 로스터를 매우 크게 설정해 확률 0으로
      const reward = generateCharacterReward(1, Difficulty.EASY, 100);
      expect(reward).toBeNull();
    });
  });

  // ═══════════════════════════════════════════
  // 6. 엣지케이스
  // ═══════════════════════════════════════════

  describe('6. 엣지케이스', () => {
    it('로스터가 매우 크면 항상 null을 반환한다', () => {
      // 100명 이상이면 확률이 0 이하
      for (let s = 0; s < 20; s++) {
        const r = generateCharacterReward(s, Difficulty.EASY, 100);
        expect(r).toBeNull();
      }
    });

    it('seed 0도 정상적으로 동작한다', () => {
      const r1 = generateCharacterReward(0, STANDARD, 0);
      const r2 = generateCharacterReward(0, STANDARD, 0);
      expect(r1).toEqual(r2);
    });
  });
});
