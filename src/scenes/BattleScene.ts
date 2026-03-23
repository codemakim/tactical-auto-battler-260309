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
import { createBattleState, stepBattle } from '../core/BattleEngine';
import { createUnit } from '../entities/UnitFactory';
import { generateEncounter } from '../systems/EnemyGenerator';
import { Team, Position, BattlePhase } from '../types';
import type { BattleState, BattleUnit, BattleEvent } from '../types';

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

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    this.unitVisuals = new Map();
    this.battleLog = [];
    this.autoPlaying = false;

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
    this.toast.show(`라운드 ${this.battleState.round} 시작`);
  }

  // === 초기화 ===

  private initBattle(): void {
    const formation = gameState.formation;

    // 플레이어 유닛 생성
    const playerUnits: BattleUnit[] = [];
    for (const slot of formation.slots) {
      const def = gameState.getCharacter(slot.characterId);
      if (def) {
        playerUnits.push(createUnit(def, Team.PLAYER, slot.position));
      }
    }

    // 교체 멤버
    const playerReserve: BattleUnit[] = [];
    if (formation.reserveId) {
      const def = gameState.getCharacter(formation.reserveId);
      if (def) {
        playerReserve.push(createUnit(def, Team.PLAYER, Position.BACK));
      }
    }

    // 적 생성 (스테이지 1)
    const stage = 1;
    const seed = Date.now();
    const encounter = generateEncounter(stage, seed);
    const enemyUnits = encounter.map((e) => createUnit(e.definition, Team.ENEMY, e.position));

    this.battleState = createBattleState(playerUnits, enemyUnits, playerReserve, [], seed, formation.heroType);
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

    // 뒤로가기
    new UIButton(this, {
      x: 16,
      y: GAME_HEIGHT - 64,
      width: 110,
      height: 48,
      label: '< 퇴각',
      style: 'secondary',
      onClick: () => {
        if (this.autoTimer) this.autoTimer.destroy();
        this.scene.start('TownScene');
      },
    });

    // 영웅 개입 버튼
    new UIButton(this, {
      x: BATTLE_CENTER_X - 90,
      y: GAME_HEIGHT - 64,
      width: 180,
      height: 48,
      label: '영웅 개입',
      style: 'primary',
      onClick: () => {
        new UIModal(this, {
          title: '영웅 개입',
          content: '영웅 능력 선택 UI는 다음 단계에서 구현됩니다.\n\n[ 준비 중 ]',
        });
      },
    });

    // 다음 턴 버튼
    new UIButton(this, {
      x: GAME_WIDTH - 320,
      y: GAME_HEIGHT - 64,
      width: 130,
      height: 48,
      label: '다음 턴 >',
      style: 'secondary',
      onClick: () => {
        if (!this.battleState.isFinished) {
          this.doStep();
        }
      },
    });

    // 자동 전투 버튼
    new UIButton(this, {
      x: GAME_WIDTH - 170,
      y: GAME_HEIGHT - 64,
      width: 150,
      height: 48,
      label: '▶ 자동 전투',
      style: 'secondary',
      onClick: () => {
        this.toggleAutoPlay();
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

  private toggleAutoPlay(): void {
    if (this.autoPlaying) {
      this.autoPlaying = false;
      if (this.autoTimer) {
        this.autoTimer.destroy();
        this.autoTimer = undefined;
      }
      this.toast.show('자동 전투 중지');
    } else {
      this.autoPlaying = true;
      this.toast.show('자동 전투 시작');
      this.autoTimer = this.time.addEvent({
        delay: 1200,
        callback: () => {
          if (this.battleState.isFinished) {
            this.autoPlaying = false;
            if (this.autoTimer) this.autoTimer.destroy();
            return;
          }
          this.doStep();
        },
        loop: true,
      });
    }
  }

  private onBattleEnd(): void {
    if (this.autoTimer) {
      this.autoTimer.destroy();
      this.autoTimer = undefined;
    }
    this.autoPlaying = false;

    const winner = this.battleState.winner;
    const isVictory = winner === Team.PLAYER;
    const reason = this.battleState.events.find((e) => e.type === 'BATTLE_END')?.data?.reason ?? '';

    const title = isVictory ? '승리!' : '패배...';
    const content = [
      isVictory ? '적을 모두 쓰러뜨렸습니다!' : '아군이 전멸했습니다.',
      '',
      `라운드: ${this.battleState.round}`,
      reason ? `사유: ${reason}` : '',
      '',
      '[ 마을로 돌아갑니다 ]',
    ].join('\n');

    new UIModal(this, {
      title,
      content,
      buttonLabel: '마을로',
      onClose: () => {
        this.scene.start('TownScene');
      },
    });
  }
}
