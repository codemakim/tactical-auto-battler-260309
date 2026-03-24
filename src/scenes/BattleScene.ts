/**
 * BattleScene — 전투 화면
 *
 * 레이아웃:
 * - 상단: 턴 큐 (NOW → 1 → 2 → 3 ...)
 * - 중앙: 아군 BACK / 아군 FRONT | 적 FRONT / 적 BACK
 * - 캐릭터 위: 턴 순서 표시 + HP 바
 * - 하단: 영웅 개입 버튼 + 전투 조작
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from '../ui/UITheme';
import { UIButton } from '../ui/UIButton';
import { UIToast } from '../ui/UIToast';
import { UIModal } from '../ui/UIModal';
import { gameState } from '../core/GameState';
import { createBattleState, stepBattle, queueIntervention } from '../core/BattleEngine';
import { canIntervene, getHeroButtonState, cancelQueuedIntervention } from '../systems/HeroInterventionSystem';
import { createUnit } from '../entities/UnitFactory';
import { generateEncounter } from '../systems/EnemyGenerator';
import { createStageBattleState } from '../core/RunManager';
import { Team, Position, BattlePhase, AbilityType, Difficulty, RunStatus, HeroButtonState } from '../types';
import type { BattleState, BattleUnit, BattleEvent, HeroAbility, RunState } from '../types';
import { calculateBattleResult } from '../systems/BattleResultCalculator';
import { processDefeat } from '../core/RunManager';

// 유닛 시각 위치 계산용 상수
const BATTLE_CENTER_X = GAME_WIDTH / 2;
const BATTLE_Y_START = 200;
const BATTLE_Y_GAP = 130;
const UNIT_W = 90;
const UNIT_H = 90;

// 열 X 위치 (아군 BACK ← 아군 FRONT | 적 FRONT → 적 BACK)
const COL_X = {
  PLAYER_BACK: BATTLE_CENTER_X - 260,
  PLAYER_FRONT: BATTLE_CENTER_X - 100,
  ENEMY_FRONT: BATTLE_CENTER_X + 100,
  ENEMY_BACK: BATTLE_CENTER_X + 260,
};

// 턴 큐 상수
const QUEUE_Y = 70;
const QUEUE_ITEM_W = 80;
const QUEUE_GAP = 8;

interface UnitVisual {
  container: Phaser.GameObjects.Container;
  hpBar: Phaser.GameObjects.Graphics;
  hpText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  turnBadge: Phaser.GameObjects.Text;
  shieldBar: Phaser.GameObjects.Graphics;
  unitId: string;
}

export class BattleScene extends Phaser.Scene {
  private battleState!: BattleState;
  private unitVisuals: Map<string, UnitVisual> = new Map();
  private turnQueueContainer!: Phaser.GameObjects.Container;
  private toast!: UIToast;
  private roundText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private autoPlaying: boolean = false;
  private autoTimer?: Phaser.Time.TimerEvent;
  private battleLog: string[] = [];
  private heroBtn!: UIButton;
  private heroBtnPulse?: Phaser.Tweens.Tween;
  private heroPanel?: Phaser.GameObjects.Container;
  private introPlaying: boolean = false;
  private targetMode: boolean = false;
  private pendingAbility?: HeroAbility;
  private interventionPaused: boolean = false;
  private wasAutoPlaying: boolean = false;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    this.unitVisuals = new Map();
    this.battleLog = [];
    this.autoPlaying = false;
    this.heroPanel = undefined;
    this.targetMode = false;
    this.pendingAbility = undefined;
    this.interventionPaused = false;
    this.wasAutoPlaying = false;

    this.drawBackground();
    this.drawTopBar();
    this.initBattle();
    this.createUnitVisuals();
    this.createTurnQueue();
    this.createBottomUI();
    this.toast = new UIToast(this, { y: GAME_HEIGHT - 140, duration: 1500 });

    // 첫 라운드 시작 (ROUND_START → TURN_START까지 진행)
    this.advanceToFirstTurn();
    this.roundText.setText(`Round ${this.battleState.round}`);
    this.updateAllUnitVisuals();
    this.refreshTurnQueue();
    this.updateHeroBtn();

    // 인트로 연출 → 자동 전투 시작
    this.playIntro();
  }

  // === 인트로 연출 ===

  private playIntro(): void {
    this.introPlaying = true;
    this.heroBtn.setDisabled(true);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 40;

    // "BATTLE" 텍스트
    const battleText = this.add
      .text(cx, cy, 'BATTLE', {
        fontSize: '64px',
        fontFamily: UITheme.font.family,
        fontStyle: 'bold',
        color: '#e0e0e0',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(200);

    // "START!" 텍스트
    const startText = this.add
      .text(cx, cy, 'START!', {
        fontSize: '56px',
        fontFamily: UITheme.font.family,
        fontStyle: 'bold',
        color: '#ffcc00',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.8)
      .setDepth(200);

    // 스킵 영역
    const skipArea = this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setInteractive()
      .setDepth(199);

    const finishIntro = () => {
      skipArea.destroy();
      battleText.destroy();
      startText.destroy();
      this.introPlaying = false;
      this.updateHeroBtn();
      this.startAutoPlay();
    };

    skipArea.once('pointerdown', () => {
      // 진행 중인 인트로 트윈 모두 제거
      this.tweens.killAll();
      finishIntro();
    });

    // 타임라인
    // 0.3s: BATTLE 페이드인
    this.tweens.add({
      targets: battleText,
      alpha: 1,
      duration: 300,
      delay: 300,
    });

    // 1.3s: BATTLE 페이드아웃
    this.tweens.add({
      targets: battleText,
      alpha: 0,
      duration: 200,
      delay: 1300,
    });

    // 1.5s: START! 페이드인 + 확대
    this.tweens.add({
      targets: startText,
      alpha: 1,
      scale: 1.1,
      duration: 300,
      delay: 1500,
    });

    // 2.3s: START! 페이드아웃
    this.tweens.add({
      targets: startText,
      alpha: 0,
      duration: 200,
      delay: 2300,
    });

    // 2.5s: 인트로 종료 → 자동 전투 시작
    this.time.delayedCall(2500, () => {
      if (this.introPlaying) {
        finishIntro();
      }
    });
  }

  // === 초기화 ===

  private initBattle(): void {
    const runState = gameState.runState;

    if (runState) {
      // 런 모드: RunManager에서 BattleState 생성
      const heroType = gameState.formation.heroType;
      this.battleState = createStageBattleState(runState, heroType);
    } else {
      // 독립 전투 모드 (폴백)
      const formation = gameState.formation;

      const playerUnits: BattleUnit[] = [];
      for (const slot of formation.slots) {
        const def = gameState.getCharacter(slot.characterId);
        if (def) {
          playerUnits.push(createUnit(def, Team.PLAYER, slot.position));
        }
      }

      const playerReserve: BattleUnit[] = [];
      if (formation.reserveId) {
        const def = gameState.getCharacter(formation.reserveId);
        if (def) {
          playerReserve.push(createUnit(def, Team.PLAYER, Position.BACK));
        }
      }

      const stage = 1;
      const seed = Date.now();
      const encounter = generateEncounter(stage, seed);
      const enemyUnits = encounter.map((e) => createUnit(e.definition, Team.ENEMY, e.position));

      this.battleState = createBattleState(playerUnits, enemyUnits, playerReserve, [], seed, formation.heroType);
    }
  }

  // === 배경/UI ===

  private drawBackground(): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x0a0a16, 1);
    gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 중앙 분리선
    gfx.lineStyle(1, 0x222244, 0.5);
    gfx.lineBetween(BATTLE_CENTER_X, 120, BATTLE_CENTER_X, GAME_HEIGHT - 100);

    // 진영 표시
    this.add
      .text(BATTLE_CENTER_X - 180, GAME_HEIGHT - 98, 'PLAYER', {
        ...UITheme.font.label,
        color: '#2266aa',
      })
      .setOrigin(0.5);
    this.add
      .text(BATTLE_CENTER_X + 180, GAME_HEIGHT - 98, 'ENEMY', {
        ...UITheme.font.label,
        color: '#aa3333',
      })
      .setOrigin(0.5);
  }

  private drawTopBar(): void {
    const bar = this.add.graphics();
    bar.fillStyle(0x0a0a16, 0.9);
    bar.fillRect(0, 0, GAME_WIDTH, 50);
    bar.lineStyle(1, UITheme.colors.border);
    bar.lineBetween(0, 50, GAME_WIDTH, 50);
    bar.setDepth(10);

    this.roundText = this.add
      .text(20, 14, 'Round 0', { ...UITheme.font.heading, color: UITheme.colors.textPrimary })
      .setDepth(11);

    this.phaseText = this.add.text(200, 18, '', { ...UITheme.font.label, color: '#888899' }).setDepth(11);
  }

  // === 유닛 시각화 ===

  private createUnitVisuals(): void {
    const allUnits = this.battleState.units;

    // 각 팀/포지션별로 유닛 그룹화
    const groups = {
      PLAYER_FRONT: allUnits.filter((u) => u.team === Team.PLAYER && u.position === Position.FRONT),
      PLAYER_BACK: allUnits.filter((u) => u.team === Team.PLAYER && u.position === Position.BACK),
      ENEMY_FRONT: allUnits.filter((u) => u.team === Team.ENEMY && u.position === Position.FRONT),
      ENEMY_BACK: allUnits.filter((u) => u.team === Team.ENEMY && u.position === Position.BACK),
    };

    for (const [groupKey, units] of Object.entries(groups)) {
      const colX = COL_X[groupKey as keyof typeof COL_X];
      for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        const y = BATTLE_Y_START + i * BATTLE_Y_GAP;
        this.createUnitVisual(unit, colX, y);
      }
    }
  }

  private createUnitVisual(unit: BattleUnit, x: number, y: number): void {
    const container = this.add.container(x, y);
    const isPlayer = unit.team === Team.PLAYER;
    const baseColor = isPlayer ? 0x1a2a4a : 0x3a1a1a;
    const borderColor = isPlayer ? 0x3b82f6 : 0xef4444;

    // 유닛 박스
    const body = this.add.graphics();
    body.fillStyle(baseColor, 0.9);
    body.fillRoundedRect(-UNIT_W / 2, -UNIT_H / 2, UNIT_W, UNIT_H, 6);
    body.lineStyle(2, borderColor, 0.8);
    body.strokeRoundedRect(-UNIT_W / 2, -UNIT_H / 2, UNIT_W, UNIT_H, 6);
    container.add(body);

    // 클래스 약자
    const classShort = unit.characterClass.substring(0, 3);
    const classText = this.add
      .text(0, -18, classShort, { fontSize: '12px', fontFamily: UITheme.font.family, color: '#6688aa' })
      .setOrigin(0.5);
    container.add(classText);

    // 이름
    const nameText = this.add
      .text(0, 2, unit.name, { fontSize: '16px', fontFamily: UITheme.font.family, color: '#ffffff' })
      .setOrigin(0.5);
    container.add(nameText);

    // HP 바 (유닛 아래)
    const hpBar = this.add.graphics();
    container.add(hpBar);

    // HP 텍스트
    const hpText = this.add
      .text(0, UNIT_H / 2 + 20, '', {
        fontSize: '13px',
        fontFamily: UITheme.font.family,
        color: '#88cc88',
      })
      .setOrigin(0.5);
    container.add(hpText);

    // 실드 바
    const shieldBar = this.add.graphics();
    container.add(shieldBar);

    // 턴 순서 배지 (유닛 위)
    const turnBadge = this.add
      .text(0, -UNIT_H / 2 - 22, '', {
        fontSize: '14px',
        fontFamily: UITheme.font.family,
        color: '#ffcc00',
        backgroundColor: '#1a1a2e',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5);
    container.add(turnBadge);

    const visual: UnitVisual = {
      container,
      hpBar,
      hpText,
      nameText,
      turnBadge,
      shieldBar,
      unitId: unit.id,
    };

    this.unitVisuals.set(unit.id, visual);
    this.updateUnitVisual(unit);
  }

  private updateUnitVisual(unit: BattleUnit): void {
    const visual = this.unitVisuals.get(unit.id);
    if (!visual) return;

    const hp = unit.isAlive ? unit.stats.hp : 0;
    const maxHp = unit.stats.maxHp;
    const hpRatio = maxHp > 0 ? hp / maxHp : 0;
    const barW = UNIT_W - 10;

    // HP 바
    visual.hpBar.clear();
    // 배경
    visual.hpBar.fillStyle(0x333333, 1);
    visual.hpBar.fillRect(-barW / 2, UNIT_H / 2 + 4, barW, 8);
    // HP
    const hpColor = hpRatio > 0.5 ? 0x44cc44 : hpRatio > 0.25 ? 0xcccc44 : 0xcc4444;
    visual.hpBar.fillStyle(hpColor, 1);
    visual.hpBar.fillRect(-barW / 2, UNIT_H / 2 + 4, barW * hpRatio, 8);

    // HP 텍스트
    visual.hpText.setText(`${hp}/${maxHp}`);

    // 실드 바
    visual.shieldBar.clear();
    if (unit.shield > 0) {
      const shieldRatio = Math.min(unit.shield / maxHp, 1);
      visual.shieldBar.fillStyle(0x4a9eff, 0.7);
      visual.shieldBar.fillRect(-barW / 2, UNIT_H / 2 + 1, barW * shieldRatio, 3);
    }

    // 사망 처리
    if (!unit.isAlive) {
      visual.container.setAlpha(0.3);
      visual.nameText.setColor('#666666');
      visual.turnBadge.setVisible(false);
    }
  }

  private updateAllUnitVisuals(): void {
    for (const unit of this.battleState.units) {
      this.updateUnitVisual(unit);

      // 포지션 변경 시 위치 업데이트
      const visual = this.unitVisuals.get(unit.id);
      if (visual && unit.isAlive) {
        const groupKey = `${unit.team}_${unit.position}` as keyof typeof COL_X;
        const colX = COL_X[groupKey];
        if (colX && visual.container.x !== colX) {
          this.tweens.add({
            targets: visual.container,
            x: colX,
            duration: 300,
            ease: 'Power2',
          });
        }
      }
    }

    this.updateTurnBadges();
  }

  private updateTurnBadges(): void {
    const turnOrder = this.battleState.turnOrder;

    // 모든 배지 초기화
    for (const visual of this.unitVisuals.values()) {
      visual.turnBadge.setVisible(false);
    }

    // 아직 행동하지 않은 생존 유닛만 순서대로 필터
    const remaining = turnOrder.filter((id) => {
      const u = this.battleState.units.find((u2) => u2.id === id);
      return u && u.isAlive && !u.hasActedThisRound;
    });

    for (let i = 0; i < remaining.length; i++) {
      const unitId = remaining[i];
      const visual = this.unitVisuals.get(unitId);
      if (!visual) continue;

      if (i === 0) {
        visual.turnBadge.setText('NOW');
        visual.turnBadge.setColor('#ffcc00');
      } else {
        visual.turnBadge.setText(`${i}`);
        visual.turnBadge.setColor('#aabbcc');
      }
      visual.turnBadge.setVisible(true);
    }
  }

  // === 턴 큐 (상단) ===

  private createTurnQueue(): void {
    this.turnQueueContainer = this.add.container(0, QUEUE_Y);
    this.turnQueueContainer.setDepth(5);
  }

  private refreshTurnQueue(): void {
    this.turnQueueContainer.removeAll(true);

    const turnOrder = this.battleState.turnOrder;

    // 미행동 생존 유닛만 순서대로 필터 (배지 로직과 동일)
    const remaining = turnOrder.filter((id) => {
      const u = this.battleState.units.find((u2) => u2.id === id);
      return u && u.isAlive && !u.hasActedThisRound;
    });

    if (remaining.length === 0) return;

    const totalW = remaining.length * (QUEUE_ITEM_W + QUEUE_GAP) - QUEUE_GAP;
    const startX = (GAME_WIDTH - totalW) / 2;

    for (let i = 0; i < remaining.length; i++) {
      const unitId = remaining[i];
      const unit = this.battleState.units.find((u) => u.id === unitId);
      if (!unit) continue;

      const x = startX + i * (QUEUE_ITEM_W + QUEUE_GAP);
      const isPlayer = unit.team === Team.PLAYER;
      const isNext = i === 0;

      // 배경
      const bg = this.add.graphics();
      const bgColor = isPlayer ? 0x1a2a3a : 0x2a1a1a;
      const borderColor = isNext ? 0xffcc00 : isPlayer ? 0x3b82f6 : 0xef4444;
      bg.fillStyle(bgColor, 0.9);
      bg.fillRoundedRect(x, 0, QUEUE_ITEM_W, 36, 4);
      bg.lineStyle(isNext ? 2 : 1, borderColor, 1);
      bg.strokeRoundedRect(x, 0, QUEUE_ITEM_W, 36, 4);
      this.turnQueueContainer.add(bg);

      // 이름
      const nameText = this.add
        .text(x + QUEUE_ITEM_W / 2, 12, unit.name, {
          fontSize: '12px',
          fontFamily: UITheme.font.family,
          color: '#ccccdd',
        })
        .setOrigin(0.5);
      this.turnQueueContainer.add(nameText);

      // 순서 라벨
      const label = this.add
        .text(x + QUEUE_ITEM_W / 2, 28, isNext ? 'NOW' : `${i}`, {
          fontSize: '10px',
          fontFamily: UITheme.font.family,
          color: isNext ? '#ffcc00' : '#8899aa',
        })
        .setOrigin(0.5);
      this.turnQueueContainer.add(label);
    }
  }

  // === 하단 UI ===

  private createBottomUI(): void {
    // 하단 바 배경
    const bar = this.add.graphics();
    bar.fillStyle(0x0a0a16, 0.9);
    bar.fillRect(0, GAME_HEIGHT - 80, GAME_WIDTH, 80);
    bar.lineStyle(1, UITheme.colors.border);
    bar.lineBetween(0, GAME_HEIGHT - 80, GAME_WIDTH, GAME_HEIGHT - 80);

    // 퇴각
    new UIButton(this, {
      x: 16,
      y: GAME_HEIGHT - 64,
      width: 110,
      height: 48,
      label: '< 퇴각',
      style: 'secondary',
      onClick: () => {
        this.stopAutoPlay();
        const rs = gameState.runState;
        if (rs) {
          const defeatState: RunState = { ...rs, status: RunStatus.DEFEAT };
          this.scene.start('RunResultScene', { runState: defeatState });
        } else {
          this.scene.start('TownScene');
        }
      },
    });

    // 영웅 개입 버튼 (중앙, 크게)
    this.heroBtn = new UIButton(this, {
      x: BATTLE_CENTER_X - 100,
      y: GAME_HEIGHT - 64,
      width: 200,
      height: 48,
      label: '영웅 개입',
      style: 'primary',
      onClick: () => {
        if (!this.introPlaying) {
          this.onHeroBtnClick();
        }
      },
    });
  }

  // === 전투 진행 ===

  /** 전투 초기: ROUND_START → TURN_START 까지 빠르게 진행 (이벤트 무시) */
  private advanceToFirstTurn(): void {
    let safety = 0;
    while (
      !this.battleState.isFinished &&
      (this.battleState.phase === BattlePhase.ROUND_START || this.battleState.phase === BattlePhase.ROUND_END) &&
      safety < 5
    ) {
      const result = stepBattle(this.battleState);
      this.battleState = result.state;
      safety++;
    }
  }

  private doStep(): void {
    if (this.battleState.isFinished) return;

    const prevEventCount = this.battleState.events.length;

    // 한 유닛이 행동할 때까지 진행:
    // ROUND_START/ROUND_END → startRound (→ TURN_START)
    // TURN_START/TURN_END → executeTurn (→ TURN_END, 한 유닛 행동 완료)
    // executeTurn은 실행 후 TURN_END를 반환하므로, TURN_START/TURN_END에서
    // stepBattle 한 번 호출 = 한 유닛 행동.
    // 단, ROUND_START/ROUND_END에서는 startRound만 하므로 한 번 더 호출 필요.
    let safety = 0;
    while (!this.battleState.isFinished && safety < 10) {
      const phaseBefore = this.battleState.phase;
      const result = stepBattle(this.battleState);
      this.battleState = result.state;
      safety++;

      // TURN_START 또는 TURN_END에서 stepBattle 호출 → executeTurn 실행됨 (한 유닛 행동 완료)
      if (phaseBefore === BattlePhase.TURN_START || phaseBefore === BattlePhase.TURN_END) {
        break;
      }
      // BATTLE_END면 멈춤
      if (this.battleState.phase === BattlePhase.BATTLE_END) break;
    }

    // 새 이벤트 처리
    const newEvents = this.battleState.events.slice(prevEventCount);
    this.processEvents(newEvents);

    // UI 갱신
    this.roundText.setText(`Round ${this.battleState.round}`);
    this.phaseText.setText(this.battleState.phase);
    this.updateAllUnitVisuals();
    this.refreshTurnQueue();
    this.updateHeroBtn();

    // 전투 종료 체크
    if (this.battleState.isFinished) {
      this.onBattleEnd();
    }
  }

  private processEvents(events: BattleEvent[]): void {
    // 가장 마지막 의미있는 이벤트를 토스트로 표시
    let toastMsg = '';

    for (const ev of events) {
      switch (ev.type) {
        case 'ROUND_START':
          toastMsg = `라운드 ${ev.round} 시작`;
          break;
        case 'ACTION_EXECUTED': {
          const actor = this.battleState.units.find((u) => u.id === ev.sourceId);
          const target = ev.targetId ? this.battleState.units.find((u) => u.id === ev.targetId) : null;
          if (actor) {
            const actionName = ev.data?.actionName ?? '행동';
            toastMsg = target ? `${actor.name} → ${target.name} (${actionName})` : `${actor.name}: ${actionName}`;
          }
          break;
        }
        case 'HERO_INTERVENTION': {
          const abilityName = ev.data?.abilityName ?? '개입';
          toastMsg = `영웅 개입: ${abilityName}`;
          break;
        }
        case 'DAMAGE_DEALT': {
          const src = this.battleState.units.find((u) => u.id === ev.sourceId);
          const tgt = this.battleState.units.find((u) => u.id === ev.targetId);
          if (src && tgt) {
            toastMsg = `${src.name} → ${tgt.name} ${ev.value ?? 0} 데미지`;
          }
          break;
        }
        case 'UNIT_DIED': {
          const unit = this.battleState.units.find((u) => u.id === ev.targetId);
          if (unit) {
            toastMsg = `${unit.name} 쓰러졌다!`;
            const visual = this.unitVisuals.get(unit.id);
            if (visual) {
              this.tweens.add({
                targets: visual.container,
                alpha: 0.3,
                duration: 300,
              });
            }
          }
          break;
        }
        case 'OVERSEER_WRATH_WARNING':
          toastMsg = `관리자의 진노! 카운트다운: ${ev.data?.countdown}`;
          break;
        case 'BATTLE_END':
          break; // onBattleEnd에서 처리
      }
    }

    if (toastMsg) {
      this.toast.show(toastMsg);
    }
  }

  // === 영웅 개입 ===

  private getHeroBtnState(): HeroButtonState {
    return getHeroButtonState(this.battleState.hero, this.battleState.isFinished, this.targetMode);
  }

  private updateHeroBtn(): void {
    const btnState = this.getHeroBtnState();

    // 펄스 정리
    if (this.heroBtnPulse) {
      this.heroBtnPulse.destroy();
      this.heroBtnPulse = undefined;
      this.heroBtn.container.setAlpha(1);
    }

    switch (btnState) {
      case HeroButtonState.READY: {
        const remaining = this.battleState.hero.interventionsRemaining;
        this.heroBtn.setLabel(`영웅 개입 (${remaining})`);
        this.heroBtn.setDisabled(false);
        break;
      }
      case HeroButtonState.QUEUED: {
        const abilityName = this.battleState.hero.queuedAbility?.name ?? '능력';
        this.heroBtn.setLabel(`${abilityName} 대기중`);
        this.heroBtn.setDisabled(false);
        // 펄스 애니메이션
        this.heroBtnPulse = this.tweens.add({
          targets: this.heroBtn.container,
          alpha: { from: 1, to: 0.7 },
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
        break;
      }
      case HeroButtonState.USED:
        this.heroBtn.setLabel('개입 완료');
        this.heroBtn.setDisabled(true);
        break;
      case HeroButtonState.TARGETING:
        this.heroBtn.setLabel('취소');
        this.heroBtn.setDisabled(false);
        break;
      case HeroButtonState.DISABLED:
        this.heroBtn.setLabel('영웅 개입');
        this.heroBtn.setDisabled(true);
        break;
    }
  }

  private onHeroBtnClick(): void {
    const btnState = this.getHeroBtnState();

    switch (btnState) {
      case HeroButtonState.TARGETING:
        this.cancelTargetMode();
        return;
      case HeroButtonState.QUEUED:
        // 큐 취소
        this.battleState = cancelQueuedIntervention(this.battleState);
        this.updateHeroBtn();
        this.toast.show('개입 취소');
        return;
      case HeroButtonState.USED:
      case HeroButtonState.DISABLED:
        this.toast.show('이번 라운드 개입 횟수를 모두 사용했습니다');
        return;
      case HeroButtonState.READY:
        if (this.heroPanel) {
          this.closeHeroPanel();
          this.resumeBattle();
          return;
        }
        this.pauseBattle();
        this.openHeroPanel();
        return;
    }
  }

  /** 전투 일시정지 — 자동 전투 멈춤 */
  private pauseBattle(): void {
    this.interventionPaused = true;
    this.wasAutoPlaying = this.autoPlaying;
    this.stopAutoPlay();
  }

  /** 전투 재개 — 이전 자동 전투 상태 복원 */
  private resumeBattle(): void {
    this.interventionPaused = false;
    if (this.wasAutoPlaying) {
      this.wasAutoPlaying = false;
      this.startAutoPlay();
    }
  }

  private openHeroPanel(): void {
    if (this.heroPanel) return;

    const abilities = this.battleState.hero.abilities;
    const panelW = 260;
    const btnH = 48;
    const gap = 8;
    const panelH = abilities.length * (btnH + gap) + gap + 30;
    const panelX = BATTLE_CENTER_X - panelW / 2;
    const panelY = GAME_HEIGHT - 80 - panelH - 10;

    this.heroPanel = this.add.container(panelX, panelY).setDepth(30);

    // 패널 배경
    const bg = this.add.graphics();
    bg.fillStyle(0x0f1428, 0.95);
    bg.fillRoundedRect(0, 0, panelW, panelH, 8);
    bg.lineStyle(2, 0x4a8abb);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 8);
    this.heroPanel.add(bg);

    // 타이틀
    const title = this.add
      .text(panelW / 2, 12, `${this.battleState.hero.heroType} 능력`, {
        fontSize: '14px',
        fontFamily: UITheme.font.family,
        color: '#ffcc00',
      })
      .setOrigin(0.5, 0);
    this.heroPanel.add(title);

    // 능력 버튼들
    for (let i = 0; i < abilities.length; i++) {
      const ability = abilities[i];
      const isEditAction = ability.abilityType === AbilityType.EDIT_ACTION;
      const y = 30 + i * (btnH + gap) + gap;

      const btn = new UIButton(this, {
        x: gap,
        y,
        width: panelW - gap * 2,
        height: btnH,
        label: isEditAction ? `${ability.name} (준비중)` : ability.name,
        style: 'secondary',
        disabled: isEditAction, // EDIT_ACTION은 MVP에서 비활성화
        onClick: () => {
          this.onAbilitySelect(ability);
        },
      });
      this.heroPanel!.add(btn.container);
    }
  }

  private closeHeroPanel(): void {
    if (this.heroPanel) {
      this.heroPanel.destroy();
      this.heroPanel = undefined;
    }
  }

  private onAbilitySelect(ability: HeroAbility): void {
    this.closeHeroPanel();

    // EFFECT 능력: 타겟 선택 모드 진입
    if (ability.abilityType === AbilityType.EFFECT) {
      this.pendingAbility = ability;
      this.enterTargetMode(ability);
    }
  }

  private enterTargetMode(ability: HeroAbility): void {
    this.targetMode = true;

    // 능력 효과에 따라 아군/적군 타겟 결정
    const isOffensive = ability.effects.some(
      (e) => e.type === 'DAMAGE' || e.type === 'DEBUFF' || e.type === 'PUSH' || e.type === 'DELAY_TURN',
    );

    const targetTeam = isOffensive ? Team.ENEMY : Team.PLAYER;

    this.toast.show(`${ability.name} — 대상을 선택하세요 (또는 영웅 개입 버튼으로 취소)`);
    this.updateHeroBtn();

    // 타겟 가능한 유닛에 하이라이트 + 클릭 활성화
    for (const [unitId, visual] of this.unitVisuals) {
      const unit = this.battleState.units.find((u) => u.id === unitId);
      if (!unit || !unit.isAlive || unit.team !== targetTeam) continue;

      // 하이라이트 테두리
      const highlight = this.add.graphics();
      highlight.lineStyle(3, 0xffcc00, 1);
      highlight.strokeRoundedRect(-UNIT_W / 2 - 4, -UNIT_H / 2 - 4, UNIT_W + 8, UNIT_H + 8, 8);
      visual.container.add(highlight);
      visual.container.setData('highlight', highlight);

      // 클릭 영역
      const hitArea = this.add
        .rectangle(0, 0, UNIT_W + 8, UNIT_H + 8, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      visual.container.add(hitArea);
      visual.container.setData('targetHit', hitArea);

      hitArea.on('pointerdown', () => {
        this.onTargetSelect(unit.id);
      });
    }
  }

  private cancelTargetMode(): void {
    this.targetMode = false;
    this.pendingAbility = undefined;
    this.cleanupTargetHighlights();
    this.updateHeroBtn();
    this.resumeBattle();
    this.toast.show('개입 취소');
  }

  private cleanupTargetHighlights(): void {
    for (const visual of this.unitVisuals.values()) {
      const highlight = visual.container.getData('highlight') as Phaser.GameObjects.Graphics | undefined;
      if (highlight) {
        highlight.destroy();
        visual.container.setData('highlight', undefined);
      }
      const hitArea = visual.container.getData('targetHit') as Phaser.GameObjects.Rectangle | undefined;
      if (hitArea) {
        hitArea.destroy();
        visual.container.setData('targetHit', undefined);
      }
    }
  }

  private onTargetSelect(targetId: string): void {
    if (!this.pendingAbility) return;

    const ability = this.pendingAbility;
    this.cleanupTargetHighlights();
    this.targetMode = false;
    this.pendingAbility = undefined;

    // 큐잉
    this.battleState = queueIntervention(this.battleState, ability, targetId);
    this.updateHeroBtn();

    const targetUnit = this.battleState.units.find((u) => u.id === targetId);
    this.toast.show(`${ability.name} → ${targetUnit?.name ?? '?'}`);

    // 개입 실행 (다음 턴에서 발동) 후 전투 재개
    this.doStep();
    this.resumeBattle();
  }

  private startAutoPlay(): void {
    if (this.autoPlaying) return;
    this.autoPlaying = true;
    this.autoTimer = this.time.addEvent({
      delay: 1200,
      callback: () => {
        if (this.battleState.isFinished) {
          this.stopAutoPlay();
          return;
        }
        this.doStep();
      },
      loop: true,
    });
  }

  private stopAutoPlay(): void {
    this.autoPlaying = false;
    if (this.autoTimer) {
      this.autoTimer.destroy();
      this.autoTimer = undefined;
    }
  }

  /** 런 상태 가져오기 (없으면 독립전투용 기본값 생성) */
  private getRunState(): RunState {
    return (
      gameState.runState ?? {
        currentStage: 1,
        maxStages: 1,
        seed: 0,
        party: [],
        bench: [],
        cardInventory: [],
        equippedCards: {},
        gold: 0,
        retryAvailable: false,
        status: RunStatus.IN_PROGRESS,
        preRunPartySnapshot: [],
      }
    );
  }

  private onBattleEnd(): void {
    this.stopAutoPlay();

    const runState = this.getRunState();
    const result = calculateBattleResult(this.battleState, runState);

    // ── 딤 배경 ──
    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setInteractive()
      .setDepth(100);

    // ── 패널 ──
    const panelW = 480;
    const panelH = 420;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const panelBg = this.add.graphics().setDepth(101);
    panelBg.fillStyle(0x0f1428, 0.95);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    panelBg.lineStyle(2, result.victory ? 0xffcc00 : 0xef4444);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);

    const cx = GAME_WIDTH / 2;
    let y = panelY + 28;

    // ── 타이틀 ──
    this.add
      .text(cx, y, result.victory ? '승리!' : '패배...', {
        fontSize: '28px',
        fontFamily: UITheme.font.family,
        fontStyle: 'bold',
        color: result.victory ? '#ffcc00' : '#ff4444',
      })
      .setOrigin(0.5)
      .setDepth(102);
    y += 36;

    // ── 스테이지 + 라운드 ──
    const stageLabel = gameState.runState ? `Stage ${result.currentStage} / ${result.maxStages}` : '';
    const roundLabel = result.victory
      ? `라운드 ${result.roundsElapsed} 클리어`
      : `라운드 ${result.roundsElapsed}에서 패배`;

    this.add
      .text(cx, y, [stageLabel, roundLabel].filter(Boolean).join('  ·  '), {
        fontSize: '14px',
        fontFamily: UITheme.font.family,
        color: '#8899aa',
      })
      .setOrigin(0.5)
      .setDepth(102);
    y += 30;

    // ── 유닛 현황 ──
    this.add
      .text(panelX + 24, y, '아군 현황', {
        fontSize: '13px',
        fontFamily: UITheme.font.family,
        color: '#aabbcc',
      })
      .setDepth(102);
    y += 22;

    const allAllies = [...result.survivingAllies, ...result.fallenAllies];
    const hpBarW = 120;
    const hpBarH = 10;

    for (const ally of allAllies) {
      const isDead = ally.currentHp <= 0;

      // 이름 + 클래스
      this.add
        .text(panelX + 32, y, `${ally.name}`, {
          fontSize: '13px',
          fontFamily: UITheme.font.family,
          color: isDead ? '#666677' : '#ccccdd',
        })
        .setDepth(102);

      this.add
        .text(panelX + 160, y, ally.characterClass, {
          fontSize: '11px',
          fontFamily: UITheme.font.family,
          color: isDead ? '#555566' : '#7788aa',
        })
        .setDepth(102);

      if (isDead) {
        this.add
          .text(panelX + 280, y, '전사', {
            fontSize: '12px',
            fontFamily: UITheme.font.family,
            color: '#ff4444',
          })
          .setDepth(102);
      } else {
        // HP 바
        const barX = panelX + 280;
        const barG = this.add.graphics().setDepth(102);
        barG.fillStyle(0x1a1a2e);
        barG.fillRoundedRect(barX, y + 2, hpBarW, hpBarH, 3);
        const ratio = ally.currentHp / ally.maxHp;
        const barColor = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444;
        barG.fillStyle(barColor);
        barG.fillRoundedRect(barX, y + 2, Math.max(4, hpBarW * ratio), hpBarH, 3);

        this.add
          .text(barX + hpBarW + 8, y, `${ally.currentHp}/${ally.maxHp}`, {
            fontSize: '11px',
            fontFamily: UITheme.font.family,
            color: '#8899aa',
          })
          .setDepth(102);
      }

      y += 24;
    }

    y += 8;

    // ── 골드 ──
    this.add
      .text(cx, y, `+${result.goldEarned} Gold`, {
        fontSize: '18px',
        fontFamily: UITheme.font.family,
        fontStyle: 'bold',
        color: '#ffcc00',
      })
      .setOrigin(0.5)
      .setDepth(102);
    y += 40;

    // ── 버튼 ──
    const btnW = 160;
    const btnH = 44;
    const btnY = panelY + panelH - 60;

    if (result.victory) {
      // 승리: "보상 확인" (보상 화면 미구현이므로 마을로 복귀)
      new UIButton(this, {
        x: cx - btnW / 2,
        y: btnY,
        width: btnW,
        height: btnH,
        label: '보상 확인',
        style: 'primary',
        onClick: () => {
          const runState = gameState.runState ?? this.getRunState();
          this.scene.start('RewardScene', {
            runState,
            battleState: this.battleState,
          });
        },
      }).container.setDepth(103);
    } else if (result.canRetry) {
      // 패배 + 리트라이 가능: "재도전" + "포기"
      new UIButton(this, {
        x: cx - btnW - 8,
        y: btnY,
        width: btnW,
        height: btnH,
        label: '재도전',
        style: 'primary',
        onClick: () => {
          if (gameState.runState) {
            gameState.setRunState(processDefeat(gameState.runState));
          }
          this.scene.start('FormationScene');
        },
      }).container.setDepth(103);

      new UIButton(this, {
        x: cx + 8,
        y: btnY,
        width: btnW,
        height: btnH,
        label: '포기',
        style: 'secondary',
        onClick: () => {
          const rs = gameState.runState;
          if (rs) {
            const defeatState = { ...rs, status: RunStatus.DEFEAT } as RunState;
            this.scene.start('RunResultScene', { runState: defeatState });
          } else {
            this.scene.start('TownScene');
          }
        },
      }).container.setDepth(103);
    } else {
      // 패배 + 리트라이 불가: "런 종료"
      new UIButton(this, {
        x: cx - btnW / 2,
        y: btnY,
        width: btnW,
        height: btnH,
        label: '런 종료',
        style: 'secondary',
        onClick: () => {
          const rs = gameState.runState;
          if (rs) {
            const defeatState = { ...rs, status: RunStatus.DEFEAT } as RunState;
            this.scene.start('RunResultScene', { runState: defeatState });
          } else {
            this.scene.start('TownScene');
          }
        },
      }).container.setDepth(103);
    }
  }
}
