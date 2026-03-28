/**
 * ReplayScene — 전투 리플레이 재생 화면
 *
 * 레이아웃:
 * - 상단: Round / Tick 정보 + 닫기 버튼
 * - 중앙: 유닛 시각화 (BattleScene과 동일 4열 구조)
 * - 이벤트: 현재 틱 이벤트 텍스트
 * - 하단: 네비게이션 컨트롤 + 라운드 점프
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from '../ui/UITheme';
import { UIButton } from '../ui/UIButton';
import { Team, Position } from '../types';
import type { ReplaySessionData, TickSnapshot, BattleUnit, BattleEvent } from '../types';
import {
  createReplayState,
  nextTick,
  prevTick,
  jumpToTick,
  jumpToRound,
  togglePlay,
  setSpeed,
  getCurrentSnapshot,
  isAtStart,
  isAtEnd,
  getRoundList,
  type ReplayState,
} from '../systems/ReplayController';
import { calculateBattleLayout } from '../systems/UnitLayoutCalculator';
import type { LayoutConfig } from '../systems/UnitLayoutCalculator';

// 레이아웃 상수 (BattleScene과 동일)
const BATTLE_CENTER_X = GAME_WIDTH / 2;
const UNIT_W = 90;
const UNIT_H = 90;

const COL_X = {
  PLAYER_BACK: BATTLE_CENTER_X - 260,
  PLAYER_FRONT: BATTLE_CENTER_X - 100,
  ENEMY_FRONT: BATTLE_CENTER_X + 100,
  ENEMY_BACK: BATTLE_CENTER_X + 260,
};

const LAYOUT_CONFIG: LayoutConfig = {
  columns: COL_X,
  yMin: 140,
  yMax: 520,
};

const CONTROL_Y = GAME_HEIGHT - 100;
const EVENT_Y = GAME_HEIGHT - 160;

interface ReplayUnitVisual {
  container: Phaser.GameObjects.Container;
  hpBar: Phaser.GameObjects.Graphics;
  hpText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  shieldBar: Phaser.GameObjects.Graphics;
  turnBadge: Phaser.GameObjects.Text;
  unitId: string;
}

export class ReplayScene extends Phaser.Scene {
  private replayState!: ReplayState;
  private unitVisuals: Map<string, ReplayUnitVisual> = new Map();
  private infoText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private playBtn!: UIButton;
  private prevBtn!: UIButton;
  private nextBtn!: UIButton;
  private firstBtn!: UIButton;
  private lastBtn!: UIButton;
  private speedBtns: UIButton[] = [];
  private roundBtnContainer!: Phaser.GameObjects.Container;
  private autoTimer?: Phaser.Time.TimerEvent;
  private replayData!: ReplaySessionData;
  private returnScene: string = 'TownScene';
  private returnData?: Record<string, unknown>;

  constructor() {
    super({ key: 'ReplayScene' });
  }

  create(data: { replayData: ReplaySessionData; returnScene?: string; returnData?: Record<string, unknown> }): void {
    this.replayData = data.replayData;
    this.returnScene = data.returnScene ?? 'TownScene';
    this.returnData = data.returnData;
    this.unitVisuals = new Map();
    this.replayState = createReplayState(this.replayData.snapshots);

    this.drawBackground();
    this.drawTopBar();
    this.createAllUnitVisuals();
    this.createEventDisplay();
    this.createControls();
    this.createRoundButtons();

    this.renderCurrentTick();
  }

  // === 배경 ===

  private drawBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(UITheme.colors.bgDark);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 중앙선
    bg.lineStyle(1, 0x334466, 0.3);
    bg.lineBetween(BATTLE_CENTER_X, 100, BATTLE_CENTER_X, GAME_HEIGHT - 180);

    // 열 배경
    const colAlpha = 0.08;
    for (const x of [COL_X.PLAYER_BACK, COL_X.PLAYER_FRONT]) {
      bg.fillStyle(0x1a3a5a, colAlpha);
      bg.fillRect(x - UNIT_W / 2 - 10, 120, UNIT_W + 20, GAME_HEIGHT - 320);
    }
    for (const x of [COL_X.ENEMY_FRONT, COL_X.ENEMY_BACK]) {
      bg.fillStyle(0x5a1a1a, colAlpha);
      bg.fillRect(x - UNIT_W / 2 - 10, 120, UNIT_W + 20, GAME_HEIGHT - 320);
    }
  }

  // === 상단 바 ===

  private drawTopBar(): void {
    const bar = this.add.graphics();
    bar.fillStyle(0x0a0a16, 0.9);
    bar.fillRect(0, 0, GAME_WIDTH, 50);
    bar.lineStyle(1, UITheme.colors.border);
    bar.lineBetween(0, 50, GAME_WIDTH, 50);

    // REPLAY 라벨
    this.add.text(16, 14, 'REPLAY', {
      fontSize: '18px',
      fontFamily: UITheme.font.family,
      fontStyle: 'bold',
      color: UITheme.colors.textAccent,
    });

    // 라운드 / 틱 정보
    this.infoText = this.add
      .text(GAME_WIDTH / 2, 14, '', {
        fontSize: '16px',
        fontFamily: UITheme.font.family,
        color: UITheme.colors.textPrimary,
      })
      .setOrigin(0.5, 0);

    // 닫기 버튼
    new UIButton(this, {
      x: GAME_WIDTH - 130,
      y: 6,
      width: 110,
      height: 36,
      label: '닫기',
      style: 'secondary',
      onClick: () => {
        this.stopAutoPlay();
        this.scene.start(this.returnScene, this.returnData);
      },
    });
  }

  // === 유닛 시각화 ===

  private createAllUnitVisuals(): void {
    // 모든 스냅샷에서 등장하는 유닛 ID 수집
    const allUnitIds = new Set<string>();
    for (const snap of this.replayData.snapshots) {
      for (const u of snap.units) {
        allUnitIds.add(u.id);
      }
    }

    // 첫 스냅샷 기준으로 시각 오브젝트 생성
    const firstSnap = this.replayData.snapshots[0];
    for (const unitId of allUnitIds) {
      // 유닛 정보는 처음 등장하는 스냅샷에서 가져옴
      const unit = this.findUnitInSnapshots(unitId);
      if (!unit) continue;

      const container = this.add.container(0, 0);

      // 유닛 사각형
      const body = this.add.graphics();
      const bodyColor = unit.team === Team.PLAYER ? 0x2a4a7a : 0x7a2a2a;
      body.fillStyle(bodyColor, 0.9);
      body.fillRoundedRect(-UNIT_W / 2, -UNIT_H / 2, UNIT_W, UNIT_H, 6);
      body.lineStyle(1, unit.team === Team.PLAYER ? 0x4a7acc : 0xcc4a4a);
      body.strokeRoundedRect(-UNIT_W / 2, -UNIT_H / 2, UNIT_W, UNIT_H, 6);
      container.add(body);

      // 이름
      const nameText = this.add
        .text(0, -UNIT_H / 2 + 8, unit.name, {
          fontSize: '12px',
          fontFamily: UITheme.font.family,
          color: UITheme.colors.textPrimary,
        })
        .setOrigin(0.5, 0);
      container.add(nameText);

      // HP 바 배경
      const hpBar = this.add.graphics();
      container.add(hpBar);

      // HP 텍스트
      const hpText = this.add
        .text(0, UNIT_H / 2 - 8, '', {
          fontSize: '11px',
          fontFamily: UITheme.font.family,
          color: UITheme.colors.textPrimary,
        })
        .setOrigin(0.5, 1);
      container.add(hpText);

      // 실드 바
      const shieldBar = this.add.graphics();
      container.add(shieldBar);

      // 턴 배지
      const turnBadge = this.add
        .text(UNIT_W / 2 - 4, -UNIT_H / 2 - 4, '', {
          fontSize: '11px',
          fontFamily: UITheme.font.family,
          fontStyle: 'bold',
          color: '#ffcc00',
          backgroundColor: '#000000aa',
          padding: { x: 3, y: 1 },
        })
        .setOrigin(1, 1);
      container.add(turnBadge);

      container.setVisible(false);

      this.unitVisuals.set(unitId, {
        container,
        hpBar,
        hpText,
        nameText,
        shieldBar,
        turnBadge,
        unitId,
      });
    }
  }

  private findUnitInSnapshots(unitId: string): BattleUnit | undefined {
    for (const snap of this.replayData.snapshots) {
      const unit = snap.units.find((u) => u.id === unitId);
      if (unit) return unit;
    }
    return undefined;
  }

  private updateUnitVisuals(snapshot: TickSnapshot): void {
    // 위치 계산 (배열 → Map 변환)
    const posArray = calculateBattleLayout(snapshot.units, LAYOUT_CONFIG);
    const posMap = new Map(posArray.map((p) => [p.unitId, p]));

    // 턴 순서 계산 (미행동 유닛만)
    const actedSet = new Set(snapshot.units.filter((u) => u.hasActedThisRound).map((u) => u.id));
    const turnQueue = snapshot.turnOrder.filter(
      (id) => !actedSet.has(id) && snapshot.units.find((u) => u.id === id && u.isAlive),
    );

    for (const [unitId, visual] of this.unitVisuals) {
      const unit = snapshot.units.find((u) => u.id === unitId);
      if (!unit) {
        visual.container.setVisible(false);
        continue;
      }

      const pos = posMap.get(unitId);
      if (!pos) {
        visual.container.setVisible(false);
        continue;
      }

      visual.container.setPosition(pos.x, pos.y);
      visual.container.setVisible(true);
      visual.container.setAlpha(unit.isAlive ? 1 : 0.3);

      // HP 바
      const barW = UNIT_W - 16;
      const barH = 6;
      const barY = UNIT_H / 2 - 20;
      visual.hpBar.clear();
      visual.hpBar.fillStyle(0x1a1a2e);
      visual.hpBar.fillRoundedRect(-barW / 2, barY, barW, barH, 2);
      if (unit.stats.maxHp > 0) {
        const ratio = Math.max(0, unit.stats.hp / unit.stats.maxHp);
        const hpColor = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444;
        visual.hpBar.fillStyle(hpColor);
        visual.hpBar.fillRoundedRect(-barW / 2, barY, Math.max(2, barW * ratio), barH, 2);
      }

      visual.hpText.setText(`${Math.max(0, unit.stats.hp)}/${unit.stats.maxHp}`);

      // 실드 바
      visual.shieldBar.clear();
      if (unit.shield > 0) {
        const shieldY = barY - barH - 2;
        visual.shieldBar.fillStyle(0x4a9eff, 0.8);
        const shieldW = Math.min(barW, (unit.shield / unit.stats.maxHp) * barW);
        visual.shieldBar.fillRoundedRect(-barW / 2, shieldY, Math.max(2, shieldW), barH, 2);
      }

      // 턴 배지
      const turnIdx = turnQueue.indexOf(unitId);
      if (turnIdx === 0) {
        visual.turnBadge.setText('NOW');
        visual.turnBadge.setColor('#ffcc00');
      } else if (turnIdx > 0) {
        visual.turnBadge.setText(`${turnIdx}`);
        visual.turnBadge.setColor('#aabbcc');
      } else {
        visual.turnBadge.setText('');
      }
    }
  }

  // === 이벤트 표시 ===

  private createEventDisplay(): void {
    // 이벤트 패널 배경
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a16, 0.8);
    bg.fillRect(40, EVENT_Y - 4, GAME_WIDTH - 80, 40);
    bg.lineStyle(1, UITheme.colors.border, 0.5);
    bg.strokeRect(40, EVENT_Y - 4, GAME_WIDTH - 80, 40);

    this.eventText = this.add
      .text(GAME_WIDTH / 2, EVENT_Y + 14, '', {
        fontSize: '14px',
        fontFamily: UITheme.font.family,
        color: UITheme.colors.textPrimary,
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 120 },
      })
      .setOrigin(0.5, 0.5);
  }

  private updateEventText(snapshot: TickSnapshot): void {
    if (snapshot.events.length === 0) {
      this.eventText.setText('전투 시작 상태');
      return;
    }

    const lines: string[] = [];
    for (const ev of snapshot.events) {
      const line = this.formatEvent(ev, snapshot);
      if (line) lines.push(line);
    }
    this.eventText.setText(lines.slice(0, 2).join('  |  ') || '...');
  }

  private formatEvent(ev: BattleEvent, snapshot: TickSnapshot): string {
    const findName = (id?: string) => {
      if (!id) return '?';
      return snapshot.units.find((u) => u.id === id)?.name ?? '?';
    };

    switch (ev.type) {
      case 'ACTION_EXECUTED': {
        const actionName = (ev.data?.actionName as string) ?? '행동';
        const condType = (ev.data?.conditionType as string) ?? '';
        const condText = (ev.data?.conditionText as string) ?? '';
        const slotIdx = (ev.data?.slotIndex as number) ?? 0;
        const circled = '\u2460\u2461\u2462\u2463\u2464'[slotIdx] ?? '';
        if (condType && condType !== 'ALWAYS' && condText) {
          return `${findName(ev.sourceId)} ${circled} [${condText}] → ${actionName}`;
        }
        return `${findName(ev.sourceId)} ${circled} → ${actionName}`;
      }
      case 'DAMAGE_DEALT':
        return `${findName(ev.targetId)}에게 ${ev.value} 데미지`;
      case 'HEAL_APPLIED':
        return `${findName(ev.targetId)} ${ev.value} 회복`;
      case 'SHIELD_APPLIED':
        return `${findName(ev.targetId)} 실드 ${ev.value}`;
      case 'UNIT_DIED':
        return `${findName(ev.targetId)} 전사`;
      case 'HERO_INTERVENTION':
        return `영웅 개입: ${(ev.data?.abilityName as string) ?? ''}`;
      case 'ROUND_START':
        return `라운드 ${ev.round} 시작`;
      case 'ROUND_END':
        return `라운드 ${ev.round} 종료`;
      case 'BATTLE_END':
        return '전투 종료';
      case 'BUFF_APPLIED':
      case 'DEBUFF_APPLIED':
        return `${findName(ev.targetId)} ${(ev.data?.buffType as string) ?? '버프'}`;
      case 'UNIT_MOVED':
        return `${findName(ev.sourceId)} 이동`;
      case 'UNIT_PUSHED':
        return `${findName(ev.targetId)} 밀림`;
      case 'COVER_TRIGGERED':
        return `${findName(ev.sourceId)} 커버 발동`;
      default:
        return '';
    }
  }

  // === 컨트롤 ===

  private createControls(): void {
    // 하단 바 배경
    const bar = this.add.graphics();
    bar.fillStyle(0x0a0a16, 0.9);
    bar.fillRect(0, GAME_HEIGHT - 120, GAME_WIDTH, 120);
    bar.lineStyle(1, UITheme.colors.border);
    bar.lineBetween(0, GAME_HEIGHT - 120, GAME_WIDTH, GAME_HEIGHT - 120);

    const btnW = 56;
    const btnH = 40;
    const gap = 8;
    const totalW = btnW * 5 + gap * 4;
    const startX = (GAME_WIDTH - totalW) / 2;
    const btnY = CONTROL_Y;

    // |◀ 처음
    this.firstBtn = new UIButton(this, {
      x: startX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: '|◀',
      style: 'secondary',
      onClick: () => this.onFirst(),
    });

    // ◀ 이전
    this.prevBtn = new UIButton(this, {
      x: startX + (btnW + gap),
      y: btnY,
      width: btnW,
      height: btnH,
      label: '◀',
      style: 'secondary',
      onClick: () => this.onPrev(),
    });

    // ▶ 재생/정지
    this.playBtn = new UIButton(this, {
      x: startX + (btnW + gap) * 2,
      y: btnY,
      width: btnW,
      height: btnH,
      label: '▶',
      style: 'primary',
      onClick: () => this.onTogglePlay(),
    });

    // ▶ 다음
    this.nextBtn = new UIButton(this, {
      x: startX + (btnW + gap) * 3,
      y: btnY,
      width: btnW,
      height: btnH,
      label: '▶',
      style: 'secondary',
      onClick: () => this.onNext(),
    });

    // ▶| 끝
    this.lastBtn = new UIButton(this, {
      x: startX + (btnW + gap) * 4,
      y: btnY,
      width: btnW,
      height: btnH,
      label: '▶|',
      style: 'secondary',
      onClick: () => this.onLast(),
    });

    // 속도 버튼
    const speedX = startX + totalW + 40;
    const speeds = [1, 2];
    this.speedBtns = speeds.map((spd, i) => {
      return new UIButton(this, {
        x: speedX + i * (50 + gap),
        y: btnY,
        width: 50,
        height: btnH,
        label: `${spd}x`,
        style: spd === this.replayState.playbackSpeed ? 'primary' : 'secondary',
        onClick: () => this.onSetSpeed(spd),
      });
    });
  }

  private createRoundButtons(): void {
    this.roundBtnContainer = this.add.container(0, 0);
    const rounds = getRoundList(this.replayState);
    const btnW = 48;
    const gap = 6;
    const totalW = rounds.length * btnW + (rounds.length - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2;
    const btnY = CONTROL_Y + 46;

    // "R:" 라벨
    this.add.text(startX - 30, btnY + 8, 'R:', {
      fontSize: '13px',
      fontFamily: UITheme.font.family,
      color: UITheme.colors.textSecondary,
    });

    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      new UIButton(this, {
        x: startX + i * (btnW + gap),
        y: btnY,
        width: btnW,
        height: 32,
        label: `${round}`,
        style: 'secondary',
        onClick: () => this.onJumpToRound(round),
      });
    }
  }

  // === 네비게이션 핸들러 ===

  private onFirst(): void {
    this.stopAutoPlay();
    this.replayState = jumpToTick(this.replayState, 0);
    this.renderCurrentTick();
  }

  private onPrev(): void {
    this.stopAutoPlay();
    this.replayState = prevTick(this.replayState);
    this.renderCurrentTick();
  }

  private onNext(): void {
    this.stopAutoPlay();
    this.replayState = nextTick(this.replayState);
    this.renderCurrentTick();
  }

  private onLast(): void {
    this.stopAutoPlay();
    this.replayState = jumpToTick(this.replayState, this.replayState.snapshots.length - 1);
    this.renderCurrentTick();
  }

  private onTogglePlay(): void {
    this.replayState = togglePlay(this.replayState);
    if (this.replayState.playing) {
      this.startAutoPlay();
    } else {
      this.stopAutoPlay();
    }
    this.updateControlStates();
  }

  private onSetSpeed(speed: number): void {
    this.replayState = setSpeed(this.replayState, speed);
    // 속도 버튼 스타일 갱신
    this.speedBtns.forEach((btn, i) => {
      const spd = [1, 2][i];
      // 간단하게 라벨로 현재 속도 표시
      btn.setLabel(spd === speed ? `[${spd}x]` : `${spd}x`);
    });
    // 자동 재생 중이면 타이머 재시작
    if (this.replayState.playing) {
      this.stopAutoPlay();
      this.startAutoPlay();
    }
  }

  private onJumpToRound(round: number): void {
    this.stopAutoPlay();
    this.replayState = jumpToRound(this.replayState, round);
    this.renderCurrentTick();
  }

  // === 자동 재생 ===

  private startAutoPlay(): void {
    if (this.autoTimer) return;
    const delay = Math.floor(1200 / this.replayState.playbackSpeed);
    this.autoTimer = this.time.addEvent({
      delay,
      callback: () => {
        this.replayState = nextTick(this.replayState);
        this.renderCurrentTick();
        if (!this.replayState.playing) {
          this.stopAutoPlay();
        }
      },
      loop: true,
    });
  }

  private stopAutoPlay(): void {
    this.replayState = { ...this.replayState, playing: false };
    if (this.autoTimer) {
      this.autoTimer.destroy();
      this.autoTimer = undefined;
    }
  }

  // === 렌더링 ===

  private renderCurrentTick(): void {
    const snapshot = getCurrentSnapshot(this.replayState);
    const total = this.replayState.snapshots.length;

    // 상단 정보
    this.infoText.setText(`Round ${snapshot.round}    Tick ${this.replayState.currentTick} / ${total - 1}`);

    // 유닛 시각화
    this.updateUnitVisuals(snapshot);

    // 이벤트 텍스트
    this.updateEventText(snapshot);

    // 컨트롤 상태 갱신
    this.updateControlStates();
  }

  private updateControlStates(): void {
    const atStart = isAtStart(this.replayState);
    const atEnd = isAtEnd(this.replayState);

    this.firstBtn.setDisabled(atStart);
    this.prevBtn.setDisabled(atStart);
    this.nextBtn.setDisabled(atEnd);
    this.lastBtn.setDisabled(atEnd);
    this.playBtn.setLabel(this.replayState.playing ? '⏸' : '▶');
  }
}
