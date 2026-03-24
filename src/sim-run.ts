/**
 * 런 시뮬레이션 스크립트
 * 실행: npx tsx src/sim-run.ts
 * 시드 지정: SIM_SEED=12345 npx tsx src/sim-run.ts
 *
 * 5스테이지 런 전체를 콘솔에서 실행하고 결과를 출력합니다.
 * 각 전투의 상세 이벤트 로그를 포함합니다.
 */

declare const process: { env: Record<string, string | undefined> };

import { createCharacterDef, createUnit, resetUnitCounter } from './entities/UnitFactory';
import { createBattleState, stepBattle, restorePreBattleActions } from './core/BattleEngine';
import { CharacterClass, RunStatus, Team, Position } from './types';
import type { RunState, CardInstance, BattleState, BattleEvent, BattleUnit, HeroType } from './types';
import {
  createRunState,
  processVictory,
  processDefeat,
  selectCardReward,
  equipCard,
  advanceStage,
  getEquippableCards,
} from './core/RunManager';
import { generateEncounter } from './systems/EnemyGenerator';
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

function posTag(pos: string): string {
  return pos === Position.FRONT ? '전열' : '후열';
}

function briefStatus(u: BattleUnit): string {
  const alive = u.isAlive ? '' : '💀';
  const shield = u.shield > 0 ? ` 🛡${u.shield}` : '';
  const buffs = u.buffs.length > 0 ? ` [${u.buffs.map((b) => b.type).join(',')}]` : '';
  return `${alive}HP:${u.stats.hp}/${u.stats.maxHp}${shield} ${posTag(u.position)}${buffs}`;
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
// 전투 로그
// ═══════════════════════════════════════════

/** 유닛 이름 찾기 (P/E 태그 포함) */
function findUnitName(state: BattleState, allUnits: BattleUnit[], id?: string): string {
  if (!id) return '???';
  const u =
    state.units.find((u) => u.id === id) ?? state.reserve.find((u) => u.id === id) ?? allUnits.find((u) => u.id === id);
  return u ? `${u.name}(${u.team === Team.PLAYER ? 'P' : 'E'})` : id;
}

function findUnitObj(state: BattleState, id?: string): BattleUnit | undefined {
  if (!id) return undefined;
  return state.units.find((u) => u.id === id) ?? state.reserve.find((u) => u.id === id);
}

function logBattleEvent(
  ev: BattleEvent,
  state: BattleState,
  allUnits: BattleUnit[],
  preStepUnits?: BattleUnit[],
): void {
  const name = (id?: string) => findUnitName(state, allUnits, id);
  const findPre = (id?: string): BattleUnit | undefined => {
    if (!id || !preStepUnits) return findUnitObj(state, id);
    return preStepUnits.find((u) => u.id === id) ?? findUnitObj(state, id);
  };

  if (ev.type === 'ROUND_START') {
    log(`\n    ══ 라운드 ${ev.round} ══`);
    const order = (ev.data?.turnOrder as string[]) ?? [];
    log(`    턴 순서: ${order.map((id) => name(id)).join(' → ')}`);
    return;
  }

  if (ev.type === 'TURN_START') {
    const src = findPre(ev.sourceId);
    const srcInfo = src ? ` ${briefStatus(src)}` : '';
    log(`\n      ── 턴 ${ev.turn}: ${name(ev.sourceId)}${srcInfo} ──`);
    return;
  }

  if (ev.type === 'ACTION_EXECUTED') {
    const action = ev.data?.actionName ?? ev.actionId ?? '?';
    const target = ev.targetId ? ` → ${name(ev.targetId)}` : '';
    log(`        ⚡ ${action}${target}`);
    return;
  }

  if (ev.type === 'ACTION_SKIPPED') {
    const reason = ev.data?.reason ?? 'unknown';
    log(`        ⏭ 행동 불가 (${reason})`);
    return;
  }

  if (ev.type === 'DAMAGE_DEALT') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    log(`        💥 ${name(ev.targetId)}에게 ${ev.value} 데미지${tgtInfo}`);
    return;
  }

  if (ev.type === 'HEAL_APPLIED') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    log(`        💚 ${name(ev.targetId)} ${ev.value} 회복${tgtInfo}`);
    return;
  }

  if (ev.type === 'SHIELD_APPLIED') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    log(`        🛡 ${name(ev.targetId)} 실드 +${ev.value}${tgtInfo}`);
    return;
  }

  if (ev.type === 'SHIELD_CLEARED') {
    const before = ev.data?.shieldBefore ?? '?';
    log(`        🛡❌ ${name(ev.targetId)} 실드 ${before} → 0`);
    return;
  }

  if (ev.type === 'UNIT_MOVED') {
    const from = ev.data?.from ?? '?';
    const to = ev.data?.to ?? '?';
    log(`        🔄 ${name(ev.targetId)} ${posTag(String(from))} → ${posTag(String(to))}`);
    return;
  }

  if (ev.type === 'UNIT_PUSHED') {
    const from = ev.data?.from ?? '?';
    const to = ev.data?.to ?? '?';
    log(`        ↗ ${name(ev.targetId)} ${posTag(String(from))} → ${posTag(String(to))}로 밀림`);
    return;
  }

  if (ev.type === 'UNIT_DIED') {
    log(`        💀 ${name(ev.targetId)} 사망!`);
    return;
  }

  if (ev.type === 'RESERVE_ENTERED') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    log(`        📥 ${name(ev.targetId)} 예비에서 투입!${tgtInfo}`);
    return;
  }

  if (ev.type === 'COVER_TRIGGERED') {
    const original = ev.data?.originalTargetId as string | undefined;
    log(`        🛡️ ${name(ev.targetId)}이(가) ${name(original)} 대신 피격!`);
    return;
  }

  if (ev.type === 'HERO_INTERVENTION') {
    log(`        👑 히어로 개입! → ${name(ev.targetId)}`);
    return;
  }

  if (ev.type === 'BUFF_APPLIED' || ev.type === 'DEBUFF_APPLIED') {
    const buffType = ev.data?.buffType ?? '?';
    const label = ev.type === 'BUFF_APPLIED' ? '부여' : '디버프';
    log(`        ✨ ${name(ev.targetId)} ${buffType} ${label}`);
    return;
  }

  if (ev.type === 'BUFF_EXPIRED') {
    log(`        ⏰ ${name(ev.targetId)} 버프 만료`);
    return;
  }

  if (ev.type === 'DELAYED_EFFECT_APPLIED') {
    const effectType = ev.data?.effectType ?? '?';
    const delayRounds = ev.data?.delayRounds ?? '?';
    log(`        ⏳ ${name(ev.targetId)}에게 지연 효과 (${effectType}, ${delayRounds}라운드 후)`);
    return;
  }

  if (ev.type === 'DELAYED_EFFECT_RESOLVED') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    log(`        💫 지연 효과 발동! ${name(ev.targetId)}${tgtInfo}`);
    return;
  }

  if (ev.type === 'STATUS_EFFECT_TICK') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    const effectType = ev.data?.effectType ?? '?';
    log(`        🔥 ${name(ev.targetId)} ${effectType} ${ev.value}${tgtInfo}`);
    return;
  }

  if (ev.type === 'ROUND_END') {
    log(`\n    ── 라운드 ${ev.round} 종료 ──`);
    const alive = state.units.filter((u) => u.isAlive);
    const players = alive.filter((u) => u.team === Team.PLAYER);
    const enemies = alive.filter((u) => u.team === Team.ENEMY);
    log(`    P: ${players.map((u) => `${u.name} ${briefStatus(u)}`).join(', ')}`);
    log(`    E: ${enemies.map((u) => `${u.name} ${briefStatus(u)}`).join(', ')}`);
    return;
  }

  if (ev.type === 'OVERSEER_WRATH_WARNING') {
    const cd = ev.data?.countdown;
    log(`    ⚡ 관리자의 진노! ${ev.data?.message ?? ''} (카운트다운: ${cd})`);
    return;
  }

  if (ev.type === 'OVERSEER_WRATH_LIFTED') {
    log(`    ✦ 관리자의 진노 해소 — ${ev.data?.message ?? ''}`);
    return;
  }

  if (ev.type === 'BATTLE_END') {
    const winner = ev.data?.winner;
    const reason = ev.data?.reason ? ` [${ev.data.reason}]` : '';
    log(`\n    ══ 전투 종료! 승자: ${winner === Team.PLAYER ? 'PLAYER' : 'ENEMY'}${reason} ══`);
    return;
  }
}

// ═══════════════════════════════════════════
// 전투 실행 (step-by-step + 로그)
// ═══════════════════════════════════════════

interface BattleOutcome {
  battleState: BattleState;
  victory: boolean;
}

/**
 * 전투를 step-by-step으로 실행하면서 이벤트 로그 출력
 */
function executeStageBattleWithLog(runState: RunState, heroType?: HeroType): BattleOutcome {
  resetUnitCounter();

  const battleSeed = runState.seed + runState.currentStage * 1000;

  // 파티 → BattleUnit
  const combatDefs = runState.party.slice(0, 3);
  const reserveDef = runState.party[3];

  const playerUnits = combatDefs.map((def, i) => {
    const unit = createUnit(def, Team.PLAYER, i < 2 ? Position.FRONT : Position.BACK);
    return applyEquippedCards(unit, def.id, runState);
  });

  const playerReserve = reserveDef
    ? [applyEquippedCards(createUnit(reserveDef, Team.PLAYER, Position.BACK), reserveDef.id, runState)]
    : [];

  // 적 생성
  const enemyEncounter = generateEncounter(runState.currentStage, battleSeed);
  const enemyUnits = enemyEncounter.map((eu) => createUnit(eu.definition, Team.ENEMY, eu.position));

  // 전투 초기화
  let current = createBattleState(playerUnits, enemyUnits, playerReserve, [], battleSeed, heroType);
  const allInitialUnits = [...current.units, ...current.reserve].map((u) => ({ ...u }));

  // 적 정보 출력
  const enemyNames = current.units
    .filter((u) => u.team === Team.ENEMY)
    .map((u) => `${u.name}(HP:${u.stats.maxHp} ATK:${u.stats.atk} ${posTag(u.position)})`);
  log(`  적: ${enemyNames.join(', ')}`);

  // step-by-step 실행
  let processedEvents = 0;
  let steps = 0;
  const maxSteps = 500;

  while (!current.isFinished && steps < maxSteps) {
    const preStepUnits = current.units.map((u) => ({ ...u, stats: { ...u.stats } }));
    const result = stepBattle(current);
    current = result.state;
    steps++;

    // 새 이벤트만 출력
    const newEvents = current.events.slice(processedEvents);
    processedEvents = current.events.length;

    for (const ev of newEvents) {
      logBattleEvent(ev, current, allInitialUnits, preStepUnits);
    }
  }

  current = restorePreBattleActions(current);

  return {
    battleState: current,
    victory: current.winner === Team.PLAYER,
  };
}

/** 장착된 카드를 BattleUnit에 반영 */
function applyEquippedCards(unit: BattleUnit, defId: string, runState: RunState): BattleUnit {
  const equipped = runState.equippedCards[defId];
  if (!equipped) return unit;

  const newSlots = unit.actionSlots.map((slot, i) => {
    const cardId = equipped[i];
    if (!cardId) return slot;
    const card = runState.cardInventory.find((c) => c.instanceId === cardId);
    if (!card) return slot;
    return { condition: slot.condition, action: card.action };
  });

  return { ...unit, actionSlots: newSlots };
}

// ═══════════════════════════════════════════
// 자동 카드 장착 AI
// ═══════════════════════════════════════════

function autoEquipCards(run: RunState): RunState {
  let current = run;

  for (const def of current.party) {
    const equipped = current.equippedCards[def.id] ?? {};
    for (let slot = 0; slot < 3; slot++) {
      if (equipped[slot]) continue;
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

  const party = PARTY_CLASSES.map((cls, i) => createCharacterDef(`${cls}_${i}`, cls));
  let run = createRunState(party, seed);
  logParty(run);

  // ── 스테이지 루프 ──
  while (run.status === RunStatus.IN_PROGRESS && run.currentStage <= run.maxStages) {
    const stage = run.currentStage;
    logHeader(`Stage ${stage} / ${run.maxStages}`);

    run = autoEquipCards(run);

    // 전투 실행 (상세 로그 포함)
    log('');
    resetUnitCounter();
    const { battleState, victory } = executeStageBattleWithLog(run);

    // 결과 요약
    logSection(`Stage ${stage} 결과: ${victory ? '승리' : '패배'}`);
    const survivors = battleState.units.filter((u) => u.team === Team.PLAYER && u.isAlive);
    const dead = battleState.units.filter((u) => u.team === Team.PLAYER && !u.isAlive);
    log(`  생존: ${survivors.map((u) => `${u.name}(HP:${u.stats.hp}/${u.stats.maxHp})`).join(', ')}`);
    if (dead.length > 0) {
      log(`  전사: ${dead.map((u) => u.name).join(', ')}`);
    }

    if (victory) {
      logSection('보상');
      const { runState, reward, guestReward } = processVictory(run, battleState);
      run = runState;

      log(`  골드: +${reward.gold} (총 ${run.gold})`);

      if (reward.cardOptions.length > 0) {
        log(`  카드 옵션 (${reward.cardOptions.length}개):`);
        logCardOptions(reward.cardOptions);

        const selected = reward.cardOptions[0];
        run = selectCardReward(run, selected);
        const cls = selected.classRestriction ? `[${selected.classRestriction}]` : '[공용]';
        log(`  → 선택: ${cls} ${selected.action.name}`);
      }

      if (guestReward) {
        log(`  객원 멤버 합류: ${guestReward.character.name} (${guestReward.character.characterClass})`);
      }

      logInventory(run);
      run = advanceStage(run);
    } else {
      run = processDefeat(run);

      if (run.status === RunStatus.IN_PROGRESS) {
        log('  → 재도전 가능! 편성 조정 후 재도전...');
        log('');

        resetUnitCounter();
        run = autoEquipCards(run);
        const retry = executeStageBattleWithLog(run);

        logSection(`재도전 결과: ${retry.victory ? '승리' : '패배'}`);

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
