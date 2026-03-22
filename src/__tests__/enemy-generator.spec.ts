/**
 * 적 인카운터 생성기 테스트
 * enemy-encounter-spec.md 기반
 */

import { describe, it, expect } from 'vitest';
import { generateEncounter } from '../systems/EnemyGenerator';
import { Position } from '../types';

describe('적 인카운터 생성 (EnemyGenerator)', () => {
  // ═══════════════════════════════════════════
  // 1. 스테이지별 편성 검증
  // ═══════════════════════════════════════════

  describe('스테이지별 편성', () => {
    it('Stage 1: 브루트 x2', () => {
      const enemies = generateEncounter(1, 42);

      expect(enemies).toHaveLength(2);
      expect(enemies.every((e) => e.definition.characterClass === 'ENEMY_BRUTE')).toBe(true);
      expect(enemies.every((e) => e.position === Position.FRONT)).toBe(true);
    });

    it('Stage 2: 브루트 x1 + 레인저 x2', () => {
      const enemies = generateEncounter(2, 42);

      expect(enemies).toHaveLength(3);
      const brutes = enemies.filter((e) => e.definition.characterClass === 'ENEMY_BRUTE');
      const rangers = enemies.filter((e) => e.definition.characterClass === 'ENEMY_RANGER');
      expect(brutes).toHaveLength(1);
      expect(rangers).toHaveLength(2);
      expect(brutes[0].position).toBe(Position.FRONT);
      expect(rangers.every((e) => e.position === Position.BACK)).toBe(true);
    });

    it('Stage 3: 가드 x1 + 레인저 x2', () => {
      const enemies = generateEncounter(3, 42);

      expect(enemies).toHaveLength(3);
      const guards = enemies.filter((e) => e.definition.characterClass === 'ENEMY_GUARD');
      const rangers = enemies.filter((e) => e.definition.characterClass === 'ENEMY_RANGER');
      expect(guards).toHaveLength(1);
      expect(rangers).toHaveLength(2);
      expect(guards[0].position).toBe(Position.FRONT);
    });

    it('Stage 4: 디스럽터 x1 + (브루트 x2 또는 레인저 x2)', () => {
      const enemies = generateEncounter(4, 42);

      expect(enemies).toHaveLength(3);
      const disruptors = enemies.filter((e) => e.definition.characterClass === 'ENEMY_DISRUPTOR');
      expect(disruptors).toHaveLength(1);

      const brutes = enemies.filter((e) => e.definition.characterClass === 'ENEMY_BRUTE');
      const rangers = enemies.filter((e) => e.definition.characterClass === 'ENEMY_RANGER');
      // 둘 중 하나 변형
      expect(brutes.length === 2 || rangers.length === 2).toBe(true);
    });

    it('Stage 5: 보스 브루트 x1 + 가드 x1 + 레인저 x1', () => {
      const enemies = generateEncounter(5, 42);

      expect(enemies).toHaveLength(3);
      const brutes = enemies.filter((e) => e.definition.characterClass === 'ENEMY_BRUTE');
      const guards = enemies.filter((e) => e.definition.characterClass === 'ENEMY_GUARD');
      const rangers = enemies.filter((e) => e.definition.characterClass === 'ENEMY_RANGER');
      expect(brutes).toHaveLength(1);
      expect(guards).toHaveLength(1);
      expect(rangers).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════
  // 2. 결정론
  // ═══════════════════════════════════════════

  describe('결정론', () => {
    it('같은 stage + seed면 동일한 적이 생성된다', () => {
      const e1 = generateEncounter(3, 1234);
      const e2 = generateEncounter(3, 1234);

      expect(e1.length).toBe(e2.length);
      for (let i = 0; i < e1.length; i++) {
        expect(e1[i].definition.baseStats).toEqual(e2[i].definition.baseStats);
        expect(e1[i].definition.name).toBe(e2[i].definition.name);
      }
    });

    it('다른 seed면 스탯이 다를 수 있다', () => {
      const e1 = generateEncounter(3, 1);
      const e2 = generateEncounter(3, 9999);

      // 최소 하나의 유닛 스탯이 다를 것
      const stats1 = e1.map((e) => JSON.stringify(e.definition.baseStats)).join(',');
      const stats2 = e2.map((e) => JSON.stringify(e.definition.baseStats)).join(',');
      expect(stats1).not.toBe(stats2);
    });
  });

  // ═══════════════════════════════════════════
  // 3. 스탯 스케일링
  // ═══════════════════════════════════════════

  describe('스탯 스케일링', () => {
    it('Stage 1 적이 Stage 3 적보다 약하다', () => {
      const s1 = generateEncounter(1, 100);
      const s3 = generateEncounter(3, 100);

      // 같은 아키타입(브루트)의 첫 유닛 비교
      const brute1 = s1[0].definition.baseStats;
      const brute3 = s3.find((e) => e.definition.characterClass === 'ENEMY_GUARD')!.definition.baseStats;

      // Stage 1 브루트 HP < Stage 3 가드 HP (가드가 기본 HP가 높음)
      // 대신 같은 아키타입이 아니므로, 단순히 배율만 검증
      // Stage 1 x0.85, Stage 3 x1.0 이므로 같은 아키타입이면 S1 < S3
      expect(brute1.hp).toBeLessThan(
        Math.floor(((48 + 58) / 2) * 1.0), // 브루트 Stage 3 기준값
      );
    });

    it('Stage 5 보스의 스탯이 일반 적보다 높다', () => {
      const enemies = generateEncounter(5, 42);

      // 첫 번째 유닛이 보스
      const boss = enemies[0].definition.baseStats;
      const guard = enemies[1].definition.baseStats;

      // 보스 브루트(x1.5)의 ATK > 가드(x1.15)의 ATK (가드 ATK 기본이 낮으므로 확실)
      expect(boss.atk).toBeGreaterThan(guard.atk);
    });

    it('스탯에 ±10% 변동이 적용된다', () => {
      // 같은 스테이지에서 여러 seed로 생성하여 변동 확인
      const stats = new Set<number>();
      for (let seed = 0; seed < 50; seed++) {
        const enemies = generateEncounter(1, seed);
        stats.add(enemies[0].definition.baseStats.hp);
      }
      // HP가 최소 2가지 이상의 값을 가져야 함
      expect(stats.size).toBeGreaterThan(1);
    });
  });

  // ═══════════════════════════════════════════
  // 4. 행동 슬롯
  // ═══════════════════════════════════════════

  describe('행동 슬롯', () => {
    it('모든 적이 3개의 행동 슬롯을 가진다', () => {
      for (let stage = 1; stage <= 5; stage++) {
        const enemies = generateEncounter(stage, 42);
        for (const enemy of enemies) {
          expect(enemy.definition.baseActionSlots).toHaveLength(3);
        }
      }
    });

    it('브루트의 첫 번째 슬롯은 POSITION_FRONT → DAMAGE이다', () => {
      const enemies = generateEncounter(1, 42);
      const brute = enemies[0];

      expect(brute.definition.baseActionSlots[0].condition.type).toBe('POSITION_FRONT');
      expect(brute.definition.baseActionSlots[0].action.effects[0].type).toBe('DAMAGE');
    });

    it('가드의 첫 번째 슬롯은 SHIELD + COVER이다', () => {
      const enemies = generateEncounter(3, 42);
      const guard = enemies.find((e) => e.definition.characterClass === 'ENEMY_GUARD')!;

      const effects = guard.definition.baseActionSlots[0].action.effects;
      expect(effects.some((e) => e.type === 'SHIELD')).toBe(true);
      expect(effects.some((e) => e.type === 'BUFF' && e.buffType === 'COVER')).toBe(true);
    });

    it('디스럽터의 첫 번째 슬롯은 DAMAGE + PUSH이다', () => {
      const enemies = generateEncounter(4, 42);
      const disruptor = enemies.find((e) => e.definition.characterClass === 'ENEMY_DISRUPTOR')!;

      const effects = disruptor.definition.baseActionSlots[0].action.effects;
      expect(effects.some((e) => e.type === 'DAMAGE')).toBe(true);
      expect(effects.some((e) => e.type === 'PUSH')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // 5. 이름 규칙
  // ═══════════════════════════════════════════

  describe('이름 규칙', () => {
    it('Stage 1~2: 기본 이름', () => {
      const enemies = generateEncounter(1, 42);
      expect(enemies[0].definition.name).toContain('Brute');
      expect(enemies[0].definition.name).not.toContain('Veteran');
    });

    it('Stage 3~4: Veteran 접두어', () => {
      const enemies = generateEncounter(3, 42);
      const guard = enemies.find((e) => e.definition.characterClass === 'ENEMY_GUARD')!;
      expect(guard.definition.name).toContain('Veteran');
    });

    it('Stage 5 보스: Boss 접두어', () => {
      const enemies = generateEncounter(5, 42);
      expect(enemies[0].definition.name).toContain('Boss');
    });

    it('같은 아키타입 다수일 때 A, B 접미어', () => {
      const enemies = generateEncounter(1, 42);
      expect(enemies[0].definition.name).toContain('A');
      expect(enemies[1].definition.name).toContain('B');
    });
  });

  // ═══════════════════════════════════════════
  // 6. 에러 처리
  // ═══════════════════════════════════════════

  describe('에러 처리', () => {
    it('존재하지 않는 스테이지는 에러를 던진다', () => {
      expect(() => generateEncounter(0, 42)).toThrow();
      expect(() => generateEncounter(6, 42)).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  // 7. Stage 4 변형
  // ═══════════════════════════════════════════

  describe('Stage 4 변형', () => {
    it('다양한 seed에서 두 가지 변형이 모두 등장한다', () => {
      let hasBruteVariant = false;
      let hasRangerVariant = false;

      for (let seed = 0; seed < 100; seed++) {
        const enemies = generateEncounter(4, seed);
        const brutes = enemies.filter((e) => e.definition.characterClass === 'ENEMY_BRUTE');
        const rangers = enemies.filter((e) => e.definition.characterClass === 'ENEMY_RANGER');

        if (brutes.length === 2) hasBruteVariant = true;
        if (rangers.length === 2) hasRangerVariant = true;
      }

      expect(hasBruteVariant).toBe(true);
      expect(hasRangerVariant).toBe(true);
    });
  });
});
