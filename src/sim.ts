/**
 * 전투 시뮬레이션 스크립트
 * 실행: npx tsx src/sim.ts
 *
 * 양쪽 팀을 구성하고 전투를 돌려서 읽기 좋은 로그를 출력한다.
 */

import { createCharacterDef, createUnit, resetUnitCounter } from './entities/UnitFactory';
import { createBattleState, stepBattle } from './core/BattleEngine';
import { CharacterClass, Team, Position } from './types';
import type { BattleState, BattleEvent, BattleUnit, ActionSlot } from './types';

// ── 팀 구성 ──────────────────────────────────────

resetUnitCounter();

// 플레이어팀: Warrior(전열) + Archer(후열) + Guardian(전열) / 예비: Lancer
const pWarrior  = createUnit(createCharacterDef('Aldric',  CharacterClass.WARRIOR),   Team.PLAYER, Position.FRONT);
const pArcher   = createUnit(createCharacterDef('Sylva',   CharacterClass.ARCHER),    Team.PLAYER, Position.BACK);
const pGuardian = createUnit(createCharacterDef('Theron',  CharacterClass.GUARDIAN),   Team.PLAYER, Position.FRONT);
const pReserve  = createUnit(createCharacterDef('Kael',    CharacterClass.LANCER),     Team.PLAYER, Position.BACK);

// 적팀: Assassin(후열) + Lancer(후열) + Controller(전열) / 예비: Warrior
const eAssassin   = createUnit(createCharacterDef('Shade',   CharacterClass.ASSASSIN),   Team.ENEMY, Position.BACK);
const eLancer     = createUnit(createCharacterDef('Vex',     CharacterClass.LANCER),     Team.ENEMY, Position.BACK);
const eController = createUnit(createCharacterDef('Mira',    CharacterClass.CONTROLLER), Team.ENEMY, Position.FRONT);
const eReserve    = createUnit(createCharacterDef('Bron',    CharacterClass.WARRIOR),    Team.ENEMY, Position.BACK);

// ── 전투 실행 (stepBattle 루프로 중간 상태 추적) ────────

const initial = createBattleState(
  [pWarrior, pArcher, pGuardian],
  [eAssassin, eLancer, eController],
  [pReserve],
  [eReserve],
  12345,
);

// ── 유틸 함수 ──────────────────────────────────────

// 모든 유닛 레지스트리 (초기 + 예비 포함)
const allInitialUnits = [...initial.units, ...initial.reserve];

function findUnitName(state: BattleState, id?: string): string {
  if (!id) return '???';
  const u = state.units.find(u => u.id === id)
    ?? state.reserve.find(u => u.id === id)
    ?? allInitialUnits.find(u => u.id === id);
  return u ? `${u.name}(${u.team === Team.PLAYER ? 'P' : 'E'})` : id;
}

function findUnitObj(state: BattleState, id?: string): BattleUnit | undefined {
  if (!id) return undefined;
  return state.units.find(u => u.id === id)
    ?? state.reserve.find(u => u.id === id);
}

function posTag(pos: string): string {
  return pos === Position.FRONT ? '전열' : '후열';
}

/** 유닛 상태 한줄 요약: HP/실드/포지션 */
function briefStatus(u: BattleUnit): string {
  const alive = u.isAlive ? '' : '💀';
  const shield = u.shield > 0 ? ` 🛡${u.shield}` : '';
  const buffs = u.buffs.length > 0 ? ` [${u.buffs.map(b => b.type).join(',')}]` : '';
  return `${alive}HP:${u.stats.hp}/${u.stats.maxHp}${shield} ${posTag(u.position)}${buffs}`;
}

/** 유닛 최종 상태 출력용 */
function unitFinalStatus(u: BattleUnit): string {
  const alive = u.isAlive ? '⚔' : '💀';
  const shield = u.shield > 0 ? ` 🛡${u.shield}` : '';
  return `${alive} ${u.name} HP:${u.stats.hp}/${u.stats.maxHp}${shield} [${posTag(u.position)}]`;
}

/** 조건 표시 */
function conditionStr(slot: ActionSlot): string {
  const c = slot.condition;
  if (c.type === 'ALWAYS') return '';
  if (c.value !== undefined) return ` (${c.type}:${c.value})`;
  return ` (${c.type})`;
}

/** 액션 슬롯 목록 표시 */
function showActionSlots(slots: ActionSlot[]): string {
  return slots.map((s, i) =>
    `${i + 1}. ${s.action.name}${conditionStr(s)}`
  ).join('  |  ');
}

// ── 로그 출력: 초기 상태 ──────────────────────────

console.log('═══════════════════════════════════════════');
console.log('  TACTICAL AUTO-BATTLER  SIMULATION');
console.log('═══════════════════════════════════════════\n');

console.log('── 초기 팀 구성 ──');
console.log('PLAYER:');
[pWarrior, pArcher, pGuardian].forEach(u => {
  console.log(`  ${u.name} (${u.characterClass}) [${posTag(u.position)}] HP:${u.stats.hp} ATK:${u.stats.atk} GRD:${u.stats.grd} AGI:${u.stats.agi}`);
  console.log(`    행동: ${showActionSlots(u.actionSlots)}`);
});
console.log(`  [예비] ${pReserve.name} (${pReserve.characterClass})`);
console.log(`    행동: ${showActionSlots(pReserve.actionSlots)}`);

console.log('ENEMY:');
[eAssassin, eLancer, eController].forEach(u => {
  console.log(`  ${u.name} (${u.characterClass}) [${posTag(u.position)}] HP:${u.stats.hp} ATK:${u.stats.atk} GRD:${u.stats.grd} AGI:${u.stats.agi}`);
  console.log(`    행동: ${showActionSlots(u.actionSlots)}`);
});
console.log(`  [예비] ${eReserve.name} (${eReserve.characterClass})`);
console.log(`    행동: ${showActionSlots(eReserve.actionSlots)}`);
console.log('');

// ── stepBattle 루프 + 이벤트 로그 ─────────────────

let current = initial;
let processedEvents = 0;
const maxSteps = 500;
let steps = 0;

while (!current.isFinished && steps < maxSteps) {
  // 스텝 실행 전 유닛 스냅샷 저장 (TURN_START에 행동 전 상태 표시용)
  const preStepUnits = current.units.map(u => ({ ...u, stats: { ...u.stats } }));
  const result = stepBattle(current);
  current = result.state;
  steps++;

  // 새로 추가된 이벤트만 처리
  const newEvents = current.events.slice(processedEvents);
  processedEvents = current.events.length;

  for (const ev of newEvents) {
    logEvent(ev, current, preStepUnits);
  }
}

function logEvent(ev: BattleEvent, state: BattleState, preStepUnits?: BattleUnit[]): void {
  // TURN_START는 행동 전 상태를 보여야 하므로 preStepUnits 사용
  const findPreUnit = (id?: string): BattleUnit | undefined => {
    if (!id || !preStepUnits) return findUnitObj(state, id);
    return preStepUnits.find(u => u.id === id) ?? findUnitObj(state, id);
  };

  if (ev.type === 'ROUND_START') {
    console.log(`\n══ 라운드 ${ev.round} ══════════════════════════`);
    const order = (ev.data?.turnOrder as string[]) ?? [];
    console.log(`  턴 순서: ${order.map(id => findUnitName(state, id)).join(' → ')}`);
    return;
  }

  if (ev.type === 'TURN_START') {
    // 행동 전 상태 표시
    const src = findPreUnit(ev.sourceId);
    const srcInfo = src ? ` ${briefStatus(src)}` : '';
    console.log(`\n  ── 턴 ${ev.turn}: ${findUnitName(state, ev.sourceId)}${srcInfo} ──`);
    return;
  }

  if (ev.type === 'ACTION_EXECUTED') {
    const action = ev.data?.actionName ?? ev.actionId ?? '?';
    const target = ev.targetId ? ` → ${findUnitName(state, ev.targetId)}` : '';
    console.log(`    ⚡ ${action}${target}`);
    return;
  }

  if (ev.type === 'ACTION_SKIPPED') {
    const reason = ev.data?.reason ?? 'unknown';
    console.log(`    ⏭ 행동 불가 (${reason})`);
    return;
  }

  if (ev.type === 'DAMAGE_DEALT') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    💥 ${findUnitName(state, ev.targetId)}에게 ${ev.value} 데미지${tgtInfo}`);
    return;
  }

  if (ev.type === 'HEAL_APPLIED') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    💚 ${findUnitName(state, ev.targetId)} ${ev.value} 회복${tgtInfo}`);
    return;
  }

  if (ev.type === 'SHIELD_APPLIED') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    🛡 ${findUnitName(state, ev.targetId)} 실드 +${ev.value}${tgtInfo}`);
    return;
  }

  if (ev.type === 'SHIELD_CLEARED') {
    const before = ev.data?.shieldBefore ?? '?';
    console.log(`    🛡❌ ${findUnitName(state, ev.targetId)} 실드 ${before} → 0`);
    return;
  }

  if (ev.type === 'UNIT_MOVED') {
    const from = ev.data?.from ?? '?';
    const to = ev.data?.to ?? '?';
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    🔄 ${findUnitName(state, ev.targetId)} ${posTag(String(from))} → ${posTag(String(to))}${tgtInfo}`);
    return;
  }

  if (ev.type === 'UNIT_PUSHED') {
    const from = ev.data?.from ?? '?';
    const to = ev.data?.to ?? '?';
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    ↗ ${findUnitName(state, ev.targetId)} ${posTag(String(from))} → ${posTag(String(to))}로 밀림${tgtInfo}`);
    return;
  }

  if (ev.type === 'UNIT_DIED') {
    console.log(`    💀 ${findUnitName(state, ev.targetId)} 사망!`);
    return;
  }

  if (ev.type === 'RESERVE_ENTERED') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    📥 ${findUnitName(state, ev.targetId)} 예비에서 투입!${tgtInfo}`);
    return;
  }

  if (ev.type === 'COVER_TRIGGERED') {
    const original = ev.data?.originalTargetId as string | undefined;
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` ${briefStatus(tgt)}` : '';
    console.log(`    🛡️ ${findUnitName(state, ev.targetId)}이(가) ${findUnitName(state, original)} 대신 피격!${tgtInfo}`);
    return;
  }

  if (ev.type === 'HERO_INTERVENTION') {
    console.log(`    👑 히어로 개입! → ${findUnitName(state, ev.targetId)}`);
    return;
  }

  if (ev.type === 'BUFF_APPLIED' || ev.type === 'DEBUFF_APPLIED') {
    const buffType = ev.data?.buffType ?? '?';
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    ✨ ${findUnitName(state, ev.targetId)} ${buffType} ${ev.type === 'BUFF_APPLIED' ? '부여' : '디버프'}${tgtInfo}`);
    return;
  }

  if (ev.type === 'BUFF_EXPIRED') {
    console.log(`    ⏰ ${findUnitName(state, ev.targetId)} 버프 만료`);
    return;
  }

  if (ev.type === 'DELAYED_EFFECT_APPLIED') {
    const effectType = ev.data?.effectType ?? '?';
    const delayRounds = ev.data?.delayRounds ?? '?';
    console.log(`    ⏳ ${findUnitName(state, ev.targetId)}에게 지연 효과 (${effectType}, ${delayRounds}라운드 후)`);
    return;
  }

  if (ev.type === 'DELAYED_EFFECT_RESOLVED') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    💫 지연 효과 발동! ${findUnitName(state, ev.targetId)}${tgtInfo}`);
    return;
  }

  if (ev.type === 'STATUS_EFFECT_TICK') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    const effectType = ev.data?.effectType ?? '?';
    console.log(`    🔥 ${findUnitName(state, ev.targetId)} ${effectType} ${ev.value}${tgtInfo}`);
    return;
  }

  if (ev.type === 'ROUND_END') {
    console.log(`\n  ── 라운드 ${ev.round} 종료 ──`);
    // 라운드 종료 시 전체 유닛 현황
    const alive = state.units.filter(u => u.isAlive);
    const players = alive.filter(u => u.team === Team.PLAYER);
    const enemies = alive.filter(u => u.team === Team.ENEMY);
    console.log(`  생존: P[${players.map(u => `${u.name} ${briefStatus(u)}`).join(', ')}]`);
    console.log(`        E[${enemies.map(u => `${u.name} ${briefStatus(u)}`).join(', ')}]`);
    return;
  }

  if (ev.type === 'BATTLE_END') {
    const winner = ev.data?.winner;
    console.log(`\n══════════════════════════════════════════`);
    console.log(`  전투 종료! 승자: ${winner === Team.PLAYER ? 'PLAYER 🎉' : 'ENEMY 😈'}`);
    console.log(`  총 라운드: ${ev.round}, 총 이벤트: ${current.events.length}`);
    return;
  }
}

// 최종 유닛 상태
console.log('\n── 최종 유닛 상태 ──');
current.units.forEach(u => console.log(`  ${unitFinalStatus(u)}`));

console.log('═══════════════════════════════════════════\n');
