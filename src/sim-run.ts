/**
 * 런 시뮬레이션 스크립트
 * 실행: npx tsx src/sim-run.ts
 * 시드 지정: SIM_SEED=12345 npx tsx src/sim-run.ts
 *
 * 5스테이지 런 전체를 콘솔에서 실행하고 결과를 출력합니다.
 */

import { createCharacterDef, resetUnitCounter } from './entities/UnitFactory';
import { CharacterClass, RunStatus } from './types';
import type { RunState, CardInstance } from './types';
import {
  createRunState,
  executeStageBattle,
  processVictory,
  processDefeat,
  selectCardReward,
  equipCard,
  advanceStage,
  getEquippableCards,
} from './core/RunManager';
import { resetCardInstanceCounter } from './systems/BattleRewardSystem';

// ═══════════════════════════════════════════
// 설정
// ═══════════════════════════════════════════

const seed = Number(process.env.SIM_SEED) || Math.floor(Math.random() * 100000);

// 초기 파티 구성
const PARTY_CLASSES = [CharacterClass.WARRIOR, CharacterClass.ARCHER, CharacterClass.GUARDIAN, CharacterClass.ASSASSIN];

// ═══════════════════════════════════════════
// 콘솔 출력 헬퍼
// ═══════════════════════════════════════════

const DIVIDER = '═'.repeat(60);
const THIN_DIVIDER = '─'.repeat(60);

function log(msg: string) {
  console.log(msg);
}

function logHeader(title: string) {
  log('');
  log(DIVIDER);
  log(`  ${title}`);
  log(DIVIDER);
}

function logSection(title: string) {
  log('');
  log(THIN_DIVIDER);
  log(`  ${title}`);
  log(THIN_DIVIDER);
}

function logParty(run: RunState) {
  log('  파티:');
  run.party.forEach((def, i) => {
    const role = i < 3 ? `전투${i + 1}` : '교체';
    const stats = def.baseStats;
    log(
      `    [${role}] ${def.name} (${def.characterClass}) HP:${stats.hp} ATK:${stats.atk} GRD:${stats.grd} AGI:${stats.agi}`,
    );
  });
  if (run.bench.length > 0) {
    log('  벤치:');
    run.bench.forEach((def) => {
      log(`    ${def.name} (${def.characterClass})`);
    });
  }
}

function logInventory(run: RunState) {
  if (run.cardInventory.length === 0) return;
  log(`  인벤토리 (${run.cardInventory.length}장):`);
  run.cardInventory.forEach((card) => {
    const cls = card.classRestriction ? `[${card.classRestriction}]` : '[공용]';
    log(`    ${cls} ${card.action.name} (${card.rarity})`);
  });
}

function logCardOptions(options: CardInstance[]) {
  options.forEach((card, i) => {
    const cls = card.classRestriction ? `[${card.classRestriction}]` : '[공용]';
    const effects = card.action.effects
      .map((e) => {
        if (e.type === 'DAMAGE') return `DMG x${e.value}`;
        if (e.type === 'SHIELD') return `SHD x${e.value}`;
        if (e.type === 'HEAL') return `HEAL ${e.value}`;
        if (e.type === 'MOVE') return `MOVE→${e.position}`;
        if (e.type === 'PUSH') return 'PUSH';
        if (e.type === 'BUFF') return `BUFF:${e.buffType}`;
        if (e.type === 'DEBUFF') return `DEBUFF:${e.buffType}`;
        return e.type;
      })
      .join(', ');
    log(`    ${i + 1}. ${cls} ${card.action.name} (${card.rarity}) — ${effects}`);
  });
}

// ═══════════════════════════════════════════
// 자동 카드 장착 AI (간단한 휴리스틱)
// ═══════════════════════════════════════════

/**
 * 카드를 가장 적합한 캐릭터의 빈 슬롯에 자동 장착
 * (시뮬레이션용 — 실제 게임에서는 플레이어가 선택)
 */
function autoEquipCards(run: RunState): RunState {
  let current = run;

  for (const def of current.party) {
    const equippable = getEquippableCards(current, def.id);
    if (equippable.length === 0) continue;

    // 장착되지 않은 슬롯 찾기
    const equipped = current.equippedCards[def.id] ?? {};
    for (let slot = 0; slot < 3; slot++) {
      if (equipped[slot]) continue; // 이미 장착됨

      // 장착 가능한 카드 중 첫 번째
      const available = getEquippableCards(current, def.id);
      if (available.length === 0) break;

      current = equipCard(current, def.id, slot, available[0].instanceId);
    }
  }

  return current;
}

// ═══════════════════════════════════════════
// 메인 실행
// ═══════════════════════════════════════════

function main() {
  resetUnitCounter();
  resetCardInstanceCounter();

  logHeader(`런 시뮬레이션 (Seed: ${seed})`);

  // 파티 생성
  const party = PARTY_CLASSES.map((cls, i) => createCharacterDef(`${cls}_${i}`, cls));

  let run = createRunState(party, seed);
  logParty(run);

  // ── 스테이지 루프 ──
  while (run.status === RunStatus.IN_PROGRESS && run.currentStage <= run.maxStages) {
    const stage = run.currentStage;
    logHeader(`Stage ${stage} / ${run.maxStages}`);

    // 자동 카드 장착
    run = autoEquipCards(run);

    // 전투 실행
    log('  전투 시작...');
    resetUnitCounter();
    const { battleState, victory } = executeStageBattle(run);

    const enemyNames = battleState.units.filter((u) => u.team === 'ENEMY').map((u) => `${u.name}(HP:${u.stats.maxHp})`);
    log(`  적: ${enemyNames.join(', ')}`);
    log(`  결과: ${victory ? '승리' : '패배'} (${battleState.round}라운드)`);

    // 생존자 표시
    const survivors = battleState.units.filter((u) => u.team === 'PLAYER' && u.isAlive);
    const dead = battleState.units.filter((u) => u.team === 'PLAYER' && !u.isAlive);
    log(`  생존: ${survivors.map((u) => `${u.name}(HP:${u.stats.hp}/${u.stats.maxHp})`).join(', ')}`);
    if (dead.length > 0) {
      log(`  전사: ${dead.map((u) => u.name).join(', ')}`);
    }

    if (victory) {
      // 보상 처리
      logSection('보상');
      const { runState, reward, guestReward } = processVictory(run, battleState);
      run = runState;

      log(`  골드: +${reward.gold} (총 ${run.gold})`);

      // 카드 옵션 표시 + 첫 번째 선택
      if (reward.cardOptions.length > 0) {
        log(`  카드 옵션 (${reward.cardOptions.length}개):`);
        logCardOptions(reward.cardOptions);

        const selected = reward.cardOptions[0];
        run = selectCardReward(run, selected);
        const cls = selected.classRestriction ? `[${selected.classRestriction}]` : '[공용]';
        log(`  → 선택: ${cls} ${selected.action.name}`);
      }

      // 객원 멤버
      if (guestReward) {
        log(`  객원 멤버 합류: ${guestReward.character.name} (${guestReward.character.characterClass})`);
      }

      logInventory(run);

      // 다음 스테이지
      run = advanceStage(run);
    } else {
      // 패배 처리
      run = processDefeat(run);

      if (run.status === RunStatus.IN_PROGRESS) {
        log('  → 재도전 가능! 편성 조정 후 재도전...');

        // 재도전
        resetUnitCounter();
        run = autoEquipCards(run);
        const retry = executeStageBattle(run);
        log(`  재도전 결과: ${retry.victory ? '승리' : '패배'} (${retry.battleState.round}라운드)`);

        if (retry.victory) {
          const { runState, reward, guestReward } = processVictory(run, retry.battleState);
          run = runState;

          log(`  골드: +${reward.gold} (총 ${run.gold})`);
          if (reward.cardOptions.length > 0) {
            const selected = reward.cardOptions[0];
            run = selectCardReward(run, selected);
            log(`  → 선택: ${selected.action.name}`);
          }
          if (guestReward) {
            log(`  객원 멤버 합류: ${guestReward.character.name}`);
          }

          run = advanceStage(run);
        } else {
          run = processDefeat(run);
        }
      }

      if (run.status === RunStatus.DEFEAT) {
        log('  → 런 실패!');
      }
    }
  }

  // ── 런 결과 ──
  logHeader('런 결과');
  log(`  상태: ${run.status}`);
  log(`  도달 스테이지: ${run.currentStage}`);
  log(`  총 골드: ${run.gold}`);
  log(`  보유 카드: ${run.cardInventory.length}장`);
  log('');
}

main();
