/**
 * 전투 시뮬레이션 스크립트
 * 실행: npx tsx src/sim.ts
 *
 * ── 모드 ──
 * 1) 랜덤 모드 (기본):  npx tsx src/sim.ts
 *    재현:              SIM_SEED=12345 npx tsx src/sim.ts
 *
 * 2) 커스텀 모드: 클래스 지정 (쉼표 구분, 3명+예비1 = 4명)
 *    PLAYER=WARRIOR,ARCHER,GUARDIAN,LANCER ENEMY=ASSASSIN,CONTROLLER,WARRIOR,ARCHER npx tsx src/sim.ts
 *    → 카드는 해당 클래스 풀에서 랜덤 추첨 (시드 기반)
 *    → 포지션은 클래스 선호도 자동 배정
 */

import { generateCharacterDef, createUnit, resetUnitCounter } from './entities/UnitFactory';
import { createBattleState, stepBattle } from './core/BattleEngine';
import { CharacterClass, Team, Position } from './types';
import { getAvailableClasses } from './data/ClassDefinitions';
import type { BattleState, BattleEvent, BattleUnit, ActionSlot } from './types';

// ── 시드 기반 난수 ─────────────────────────────────

// @ts-ignore — Node.js 전용 스크립트
const masterSeed = typeof process !== 'undefined' && process.env?.SIM_SEED ? parseInt(process.env.SIM_SEED, 10) : Date.now();

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 클래스별 선호 포지션 ──────────────────────────────

const FRONT_CLASSES: ReadonlySet<string> = new Set([CharacterClass.WARRIOR, CharacterClass.GUARDIAN, CharacterClass.LANCER]);

function preferredPosition(cls: string): string {
  return FRONT_CLASSES.has(cls) ? Position.FRONT : Position.BACK;
}

// ── 이름 풀 ─────────────────────────────────────────

const NAMES_POOL = [
  'Aldric', 'Sylva', 'Theron', 'Kael', 'Shade', 'Vex', 'Mira', 'Bron',
  'Lyra', 'Dusk', 'Riven', 'Nyx', 'Orin', 'Sera', 'Thorn', 'Zara',
];

// ── 랜덤 팀 생성 ──────────────────────────────────────

function buildRandomTeam(
  rand: () => number,
  team: Team,
  activeCount: number,
  reserveCount: number,
  nameOffset: number,
  seedBase: number,
) {
  const classes = getAvailableClasses();
  const units: BattleUnit[] = [];
  const reserves: BattleUnit[] = [];
  const total = activeCount + reserveCount;

  for (let i = 0; i < total; i++) {
    const cls = classes[Math.floor(rand() * classes.length)];
    const name = NAMES_POOL[(nameOffset + i) % NAMES_POOL.length];
    const def = generateCharacterDef(name, cls, seedBase + i);
    const pos = preferredPosition(cls);

    if (i < activeCount) {
      units.push(createUnit(def, team, pos as any));
    } else {
      reserves.push(createUnit(def, team, Position.BACK));
    }
  }

  return { units, reserves };
}

// ── 커스텀 팀 생성 ─────────────────────────────────

// @ts-ignore — Node.js 전용
const envPlayer: string | undefined = typeof process !== 'undefined' ? process.env?.PLAYER : undefined;
// @ts-ignore
const envEnemy: string | undefined = typeof process !== 'undefined' ? process.env?.ENEMY : undefined;

function parseClassList(env: string): string[] {
  return env.split(',').map(s => s.trim().toUpperCase());
}

function buildCustomTeam(
  classList: string[],
  team: Team,
  nameOffset: number,
  seedBase: number,
) {
  const available = getAvailableClasses();
  const units: BattleUnit[] = [];
  const reserves: BattleUnit[] = [];
  const activeCount = Math.min(classList.length, 3);

  for (let i = 0; i < classList.length; i++) {
    const cls = classList[i];
    if (!available.includes(cls)) {
      console.error(`⚠ 알 수 없는 클래스: ${cls} (사용 가능: ${available.join(', ')})`);
      // @ts-ignore
      process.exit(1);
    }
    const name = NAMES_POOL[(nameOffset + i) % NAMES_POOL.length];
    const def = generateCharacterDef(name, cls, seedBase + i);
    const pos = preferredPosition(cls);

    if (i < activeCount) {
      units.push(createUnit(def, team, pos as any));
    } else {
      reserves.push(createUnit(def, team, Position.BACK));
    }
  }

  return { units, reserves };
}

// ── 팀 구성 ──────────────────────────────────────

resetUnitCounter();

const isCustomMode = !!(envPlayer || envEnemy);
const rand = seededRand(masterSeed);

const player = envPlayer
  ? buildCustomTeam(parseClassList(envPlayer), Team.PLAYER, 0, masterSeed + 100)
  : buildRandomTeam(rand, Team.PLAYER, 3, 1, 0, masterSeed + 100);

const enemy = envEnemy
  ? buildCustomTeam(parseClassList(envEnemy), Team.ENEMY, 8, masterSeed + 200)
  : buildRandomTeam(rand, Team.ENEMY, 3, 1, 8, masterSeed + 200);

// ── 전투 실행 ────────────────────────────────────

const initial = createBattleState(
  player.units,
  enemy.units,
  player.reserves,
  enemy.reserves,
  masterSeed,
);

// ── 유틸 함수 ──────────────────────────────────────

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

function briefStatus(u: BattleUnit): string {
  const alive = u.isAlive ? '' : '💀';
  const shield = u.shield > 0 ? ` 🛡${u.shield}` : '';
  const buffs = u.buffs.length > 0 ? ` [${u.buffs.map(b => b.type).join(',')}]` : '';
  return `${alive}HP:${u.stats.hp}/${u.stats.maxHp}${shield} ${posTag(u.position)}${buffs}`;
}

function unitFinalStatus(u: BattleUnit): string {
  const alive = u.isAlive ? '⚔' : '💀';
  const shield = u.shield > 0 ? ` 🛡${u.shield}` : '';
  return `${alive} ${u.name} HP:${u.stats.hp}/${u.stats.maxHp}${shield} [${posTag(u.position)}]`;
}

function conditionStr(slot: ActionSlot): string {
  const c = slot.condition;
  if (c.type === 'ALWAYS') return '';
  if (c.value !== undefined) return ` (${c.type}:${c.value})`;
  return ` (${c.type})`;
}

function showActionSlots(slots: ActionSlot[]): string {
  return slots.map((s, i) =>
    `${i + 1}. ${s.action.name}${conditionStr(s)}`
  ).join('  |  ');
}

// ── 로그 출력: 초기 상태 ──────────────────────────

console.log('═══════════════════════════════════════════');
console.log('  TACTICAL AUTO-BATTLER  SIMULATION');
console.log(`  Seed: ${masterSeed}`);
console.log('═══════════════════════════════════════════\n');

console.log('── 초기 팀 구성 ──');
console.log('PLAYER:');
player.units.forEach(u => {
  console.log(`  ${u.name} (${u.characterClass}) [${posTag(u.position)}] HP:${u.stats.hp} ATK:${u.stats.atk} GRD:${u.stats.grd} AGI:${u.stats.agi}`);
  console.log(`    행동: ${showActionSlots(u.actionSlots)}`);
});
player.reserves.forEach(u => {
  console.log(`  [예비] ${u.name} (${u.characterClass})`);
  console.log(`    행동: ${showActionSlots(u.actionSlots)}`);
});

console.log('ENEMY:');
enemy.units.forEach(u => {
  console.log(`  ${u.name} (${u.characterClass}) [${posTag(u.position)}] HP:${u.stats.hp} ATK:${u.stats.atk} GRD:${u.stats.grd} AGI:${u.stats.agi}`);
  console.log(`    행동: ${showActionSlots(u.actionSlots)}`);
});
enemy.reserves.forEach(u => {
  console.log(`  [예비] ${u.name} (${u.characterClass})`);
  console.log(`    행동: ${showActionSlots(u.actionSlots)}`);
});
console.log('');

// ── stepBattle 루프 + 이벤트 로그 ─────────────────

let current = initial;
let processedEvents = 0;
const maxSteps = 500;
let steps = 0;

while (!current.isFinished && steps < maxSteps) {
  const preStepUnits = current.units.map(u => ({ ...u, stats: { ...u.stats } }));
  const result = stepBattle(current);
  current = result.state;
  steps++;

  const newEvents = current.events.slice(processedEvents);
  processedEvents = current.events.length;

  for (const ev of newEvents) {
    logEvent(ev, current, preStepUnits);
  }
}

function logEvent(ev: BattleEvent, state: BattleState, preStepUnits?: BattleUnit[]): void {
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
