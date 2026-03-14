/**
 * 전투 시뮬레이션 스크립트
 * 실행: npx tsx src/sim.ts
 *
 * 양쪽 팀을 구성하고 전투를 돌려서 읽기 좋은 로그를 출력한다.
 */

import { createCharacterDef, createUnit, resetUnitCounter } from './entities/UnitFactory';
import { createBattleState, runFullBattle } from './core/BattleEngine';
import { CharacterClass, Team, Position } from './types';
import type { BattleState, BattleEvent, BattleUnit } from './types';

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

// ── 전투 실행 ──────────────────────────────────────

const initial = createBattleState(
  [pWarrior, pArcher, pGuardian],
  [eAssassin, eLancer, eController],
  [pReserve],
  [eReserve],
  12345,
);

const result = runFullBattle(initial);

// ── 로그 출력 ──────────────────────────────────────

function findUnit(state: BattleState, id?: string): string {
  if (!id) return '???';
  const all = [...state.units, ...state.reserve, ...initial.units, ...initial.reserve];
  const u = all.find(u => u.id === id);
  return u ? `${u.name}(${u.team === Team.PLAYER ? 'P' : 'E'})` : id;
}

function unitStatus(u: BattleUnit): string {
  const alive = u.isAlive ? '⚔' : '💀';
  const shield = u.shield > 0 ? ` 🛡${u.shield}` : '';
  return `${alive} ${u.name} HP:${u.stats.hp}/${u.stats.maxHp}${shield} [${u.position}]`;
}

console.log('═══════════════════════════════════════════');
console.log('  TACTICAL AUTO-BATTLER  SIMULATION');
console.log('═══════════════════════════════════════════\n');

// 초기 상태
console.log('── 초기 팀 구성 ──');
console.log('PLAYER:');
[pWarrior, pArcher, pGuardian].forEach(u =>
  console.log(`  ${u.name} (${u.characterClass}) [${u.position}] HP:${u.stats.hp} ATK:${u.stats.atk} GRD:${u.stats.grd} AGI:${u.stats.agi}`));
console.log(`  [예비] ${pReserve.name} (${pReserve.characterClass})`);
console.log('ENEMY:');
[eAssassin, eLancer, eController].forEach(u =>
  console.log(`  ${u.name} (${u.characterClass}) [${u.position}] HP:${u.stats.hp} ATK:${u.stats.atk} GRD:${u.stats.grd} AGI:${u.stats.agi}`));
console.log(`  [예비] ${eReserve.name} (${eReserve.characterClass})`);
console.log('');

// 이벤트 로그
let currentRound = 0;
let currentTurn = 0;

for (const ev of result.events) {
  if (ev.type === 'ROUND_START') {
    currentRound = ev.round;
    console.log(`\n══ 라운드 ${ev.round} ══════════════════════════`);
    const order = (ev.data?.turnOrder as string[]) ?? [];
    console.log(`  턴 순서: ${order.map(id => findUnit(result, id)).join(' → ')}`);
    continue;
  }

  if (ev.type === 'TURN_START') {
    currentTurn = ev.turn;
    console.log(`\n  ── 턴 ${ev.turn}: ${findUnit(result, ev.sourceId)} ──`);
    continue;
  }

  if (ev.type === 'ACTION_EXECUTED') {
    const action = ev.data?.actionName ?? ev.actionId ?? '?';
    const target = ev.targetId ? ` → ${findUnit(result, ev.targetId)}` : '';
    console.log(`    ⚡ ${action}${target}`);
    continue;
  }

  if (ev.type === 'ACTION_SKIPPED') {
    const reason = ev.data?.reason ?? 'unknown';
    console.log(`    ⏭ 행동 불가 (${reason})`);
    continue;
  }

  if (ev.type === 'DAMAGE_DEALT') {
    console.log(`    💥 ${findUnit(result, ev.targetId)}에게 ${ev.value} 데미지`);
    continue;
  }

  if (ev.type === 'HEAL_APPLIED') {
    console.log(`    💚 ${findUnit(result, ev.targetId)} ${ev.value} 회복`);
    continue;
  }

  if (ev.type === 'SHIELD_APPLIED') {
    console.log(`    🛡 ${findUnit(result, ev.targetId)} 실드 +${ev.value}`);
    continue;
  }

  if (ev.type === 'SHIELD_CLEARED') {
    const before = ev.data?.shieldBefore ?? '?';
    console.log(`    🛡❌ ${findUnit(result, ev.targetId)} 실드 ${before} → 0`);
    continue;
  }

  if (ev.type === 'UNIT_MOVED') {
    const from = ev.data?.from ?? '?';
    const to = ev.data?.to ?? '?';
    console.log(`    🔄 ${findUnit(result, ev.targetId)} ${from} → ${to}`);
    continue;
  }

  if (ev.type === 'UNIT_PUSHED') {
    const from = ev.data?.from ?? '?';
    const to = ev.data?.to ?? '?';
    console.log(`    ↗ ${findUnit(result, ev.targetId)} ${from} → ${to}로 밀림`);
    continue;
  }

  if (ev.type === 'UNIT_DIED') {
    console.log(`    💀 ${findUnit(result, ev.targetId)} 사망!`);
    continue;
  }

  if (ev.type === 'RESERVE_ENTERED') {
    console.log(`    📥 ${findUnit(result, ev.targetId)} 예비에서 투입!`);
    continue;
  }

  if (ev.type === 'COVER_TRIGGERED') {
    const original = ev.data?.originalTargetId as string | undefined;
    console.log(`    🛡️ ${findUnit(result, ev.targetId)}이(가) ${findUnit(result, original)} 대신 피격!`);
    continue;
  }

  if (ev.type === 'HERO_INTERVENTION') {
    console.log(`    👑 히어로 개입! → ${findUnit(result, ev.targetId)}`);
    continue;
  }

  if (ev.type === 'BUFF_APPLIED' || ev.type === 'DEBUFF_APPLIED') {
    const buffType = ev.data?.buffType ?? '?';
    console.log(`    ✨ ${findUnit(result, ev.targetId)} ${buffType} ${ev.type === 'BUFF_APPLIED' ? '부여' : '디버프'}`);
    continue;
  }

  if (ev.type === 'BUFF_EXPIRED') {
    console.log(`    ⏰ ${findUnit(result, ev.targetId)} 버프 만료`);
    continue;
  }

  if (ev.type === 'ROUND_END') {
    console.log(`\n  ── 라운드 ${ev.round} 종료 ──`);
    continue;
  }

  if (ev.type === 'BATTLE_END') {
    const winner = ev.data?.winner;
    console.log(`\n══════════════════════════════════════════`);
    console.log(`  전투 종료! 승자: ${winner === Team.PLAYER ? 'PLAYER 🎉' : 'ENEMY 😈'}`);
    console.log(`  총 라운드: ${ev.round}, 총 이벤트: ${result.events.length}`);
    continue;
  }
}

// 최종 유닛 상태
console.log('\n── 최종 유닛 상태 ──');
result.units.forEach(u => console.log(`  ${unitStatus(u)}`));

console.log('═══════════════════════════════════════════\n');
