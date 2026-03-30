/**
 * RunMapScene — 런 진행 맵 (런 중 허브)
 *
 * 5스테이지 노드맵 표시 + 전투/편성/포기 버튼
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from '../ui/UITheme';
import { UIButton } from '../ui/UIButton';
import { gameState } from '../core/GameState';
import { calculateStageNodes } from '../systems/RunMapCalculator';
import { StageNodeStatus, RunStatus } from '../types';
import type { StageNodeState, BattleReplayEntry } from '../types';

// 노드 시각 상수
const NODE_RADIUS = 28;
const NODE_GAP = 180;
const NODE_Y = 300;
const LINE_Y = NODE_Y;

// 노드 상태별 색상
const NODE_COLORS: Record<StageNodeStatus, { fill: number; border: number; label: string }> = {
  [StageNodeStatus.COMPLETED]: { fill: 0x333344, border: 0x888899, label: '#888899' },
  [StageNodeStatus.CURRENT]: { fill: 0x2a3a5a, border: 0xffcc00, label: '#ffcc00' },
  [StageNodeStatus.UPCOMING]: { fill: 0x1a1a2e, border: 0x444455, label: '#555566' },
  [StageNodeStatus.BOSS_UPCOMING]: { fill: 0x2a1a1a, border: 0x664444, label: '#664444' },
  [StageNodeStatus.BOSS_CURRENT]: { fill: 0x3a2a1a, border: 0xffcc00, label: '#ffcc00' },
};

export class RunMapScene extends Phaser.Scene {
  constructor() {
    super('RunMapScene');
  }

  create(): void {
    const runState = gameState.runState;
    if (!runState) {
      this.scene.start('TownScene');
      return;
    }

    this.cameras.main.setBackgroundColor(UITheme.colors.bgDark);

    const nodes = calculateStageNodes(runState);

    this.renderHeader(runState.currentStage, runState.maxStages, runState.gold);
    this.renderNodes(nodes);
    this.renderButtons();
  }

  private renderHeader(currentStage: number, maxStages: number, gold: number): void {
    // 타이틀
    this.add
      .text(GAME_WIDTH / 2, 60, '런 진행', {
        ...UITheme.font.title,
      })
      .setOrigin(0.5);

    // 스테이지 정보
    this.add
      .text(GAME_WIDTH / 2, 105, `Stage ${currentStage} / ${maxStages}`, {
        ...UITheme.font.body,
        color: UITheme.colors.textSecondary,
      })
      .setOrigin(0.5);

    // 재도전 불가 경고
    const runState = gameState.runState;
    if (runState && !runState.retryAvailable) {
      const warning = this.add
        .text(GAME_WIDTH / 2, 130, '재도전 불가 — 이번이 마지막 기회입니다', {
          fontSize: '14px',
          fontFamily: UITheme.font.family,
          fontStyle: 'bold',
          color: '#ff6644',
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: warning,
        alpha: { from: 1, to: 0.5 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
      });
    }

    // 골드
    this.add
      .text(GAME_WIDTH - 30, 30, `${gold} Gold`, {
        ...UITheme.font.body,
        color: UITheme.colors.textGold,
      })
      .setOrigin(1, 0);
  }

  private renderNodes(nodes: StageNodeState[]): void {
    const totalWidth = (nodes.length - 1) * NODE_GAP;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    // 연결선 먼저 그리기
    const lineG = this.add.graphics();
    for (let i = 0; i < nodes.length - 1; i++) {
      const x1 = startX + i * NODE_GAP + NODE_RADIUS;
      const x2 = startX + (i + 1) * NODE_GAP - NODE_RADIUS;
      const completed = nodes[i].status === StageNodeStatus.COMPLETED;

      if (completed) {
        lineG.lineStyle(3, 0x888899, 1);
      } else {
        lineG.lineStyle(2, 0x333344, 0.5);
      }
      lineG.lineBetween(x1, LINE_Y, x2, LINE_Y);
    }

    // 노드 그리기
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const x = startX + i * NODE_GAP;
      const colors = NODE_COLORS[node.status];
      const isBoss = node.status === StageNodeStatus.BOSS_UPCOMING || node.status === StageNodeStatus.BOSS_CURRENT;
      const isCurrent = node.status === StageNodeStatus.CURRENT || node.status === StageNodeStatus.BOSS_CURRENT;

      // 노드 원
      const g = this.add.graphics();
      g.fillStyle(colors.fill, 1);
      g.fillCircle(x, NODE_Y, NODE_RADIUS);
      g.lineStyle(isCurrent ? 3 : 2, colors.border, 1);
      g.strokeCircle(x, NODE_Y, NODE_RADIUS);

      // 노드 내부 아이콘/텍스트
      if (node.status === StageNodeStatus.COMPLETED) {
        this.add
          .text(x, NODE_Y, '✓', {
            fontSize: '24px',
            fontFamily: UITheme.font.family,
            color: colors.label,
          })
          .setOrigin(0.5);
      } else if (isBoss) {
        this.add
          .text(x, NODE_Y, '★', {
            fontSize: '24px',
            fontFamily: UITheme.font.family,
            color: colors.label,
          })
          .setOrigin(0.5);
      } else if (isCurrent) {
        this.add
          .text(x, NODE_Y, '●', {
            fontSize: '20px',
            fontFamily: UITheme.font.family,
            color: colors.label,
          })
          .setOrigin(0.5);
      }

      // 스테이지 라벨
      const stageLabel = isBoss ? `Boss` : `Stage ${node.stage}`;
      this.add
        .text(x, NODE_Y + NODE_RADIUS + 16, stageLabel, {
          ...UITheme.font.small,
          color: colors.label,
        })
        .setOrigin(0.5);

      // 현재 노드 펄스
      if (isCurrent) {
        const pulse = this.add.graphics();
        pulse.lineStyle(2, colors.border, 0.4);
        pulse.strokeCircle(x, NODE_Y, NODE_RADIUS + 6);
        this.tweens.add({
          targets: pulse,
          alpha: { from: 0.8, to: 0.2 },
          duration: 800,
          yoyo: true,
          repeat: -1,
        });
      }
    }
  }

  private renderButtons(): void {
    const btnY = GAME_HEIGHT - 100;
    const btnW = 170;
    const btnH = 48;
    const gap = 16;

    // 전투 시작 (중앙)
    const runState = gameState.runState;
    const isLastChance = runState && !runState.retryAvailable;
    const battleLabel = isLastChance ? '전투 시작 (최후의 기회)' : '전투 시작';
    const battleBtnW = isLastChance ? 220 : btnW;
    const cx = GAME_WIDTH / 2;

    new UIButton(this, {
      x: cx - battleBtnW / 2,
      y: btnY,
      width: battleBtnW,
      height: btnH,
      label: battleLabel,
      style: 'primary',
      onClick: () => {
        this.scene.start('BattleScene');
      },
    });

    // 편성 수정 (중앙 버튼 왼쪽)
    new UIButton(this, {
      x: cx - battleBtnW / 2 - gap - btnW,
      y: btnY,
      width: btnW,
      height: btnH,
      label: '편성 수정',
      style: 'secondary',
      onClick: () => {
        this.scene.start('FormationScene');
      },
    });

    // 포기 (중앙 버튼 오른쪽)
    new UIButton(this, {
      x: cx + battleBtnW / 2 + gap,
      y: btnY,
      width: btnW,
      height: btnH,
      label: '포기',
      style: 'secondary',
      onClick: () => {
        this.showForfeitConfirm();
      },
    });

    // 리플레이 (전투 기록이 있을 때만 활성)
    const replays = gameState.battleReplays;
    if (replays.length > 0) {
      new UIButton(this, {
        x: GAME_WIDTH / 2 - 70,
        y: btnY + btnH + 16,
        width: 140,
        height: 40,
        label: `리플레이 (${replays.length})`,
        style: 'secondary',
        onClick: () => {
          this.showReplayList();
        },
      });
    }
  }

  private showForfeitConfirm(): void {
    // 딤 배경
    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive()
      .setDepth(100);

    // 패널
    const panelW = 400;
    const panelH = 180;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.add.graphics().setDepth(101);
    bg.fillStyle(UITheme.colors.bgPanel, 0.95);
    bg.fillRoundedRect(px, py, panelW, panelH, 8);
    bg.lineStyle(2, UITheme.colors.border);
    bg.strokeRoundedRect(px, py, panelW, panelH, 8);

    const title = this.add
      .text(GAME_WIDTH / 2, py + 24, '런 포기', {
        ...UITheme.font.heading,
        color: UITheme.colors.textWarning,
      })
      .setOrigin(0.5)
      .setDepth(102);

    const msg = this.add
      .text(GAME_WIDTH / 2, py + 60, '정말 포기하시겠습니까?\n현재까지 획득한 골드는 유지됩니다.', {
        ...UITheme.font.body,
        color: UITheme.colors.textSecondary,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(102);

    const cleanup = () => {
      dim.destroy();
      bg.destroy();
      title.destroy();
      msg.destroy();
    };

    const confirmBtn = new UIButton(this, {
      x: GAME_WIDTH / 2 - 140,
      y: py + panelH - 50,
      width: 120,
      height: 40,
      label: '포기',
      style: 'primary',
      onClick: () => {
        cleanup();
        confirmBtn.container.destroy();
        cancelBtn.container.destroy();
        const rs = gameState.runState;
        if (rs) {
          const defeatState = { ...rs, status: RunStatus.DEFEAT };
          this.scene.start('RunResultScene', { runState: defeatState });
        }
      },
    });
    confirmBtn.container.setDepth(102);

    const cancelBtn = new UIButton(this, {
      x: GAME_WIDTH / 2 + 20,
      y: py + panelH - 50,
      width: 120,
      height: 40,
      label: '취소',
      style: 'secondary',
      onClick: () => {
        cleanup();
        confirmBtn.container.destroy();
        cancelBtn.container.destroy();
      },
    });
    cancelBtn.container.setDepth(102);
  }

  private showReplayList(): void {
    const replays = gameState.battleReplays;
    if (replays.length === 0) return;

    // 딤 배경
    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive()
      .setDepth(100);

    // 패널
    const panelW = 400;
    const panelH = 80 + replays.length * 56 + 60;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.add.graphics().setDepth(101);
    bg.fillStyle(UITheme.colors.bgPanel, 0.95);
    bg.fillRoundedRect(px, py, panelW, panelH, 8);
    bg.lineStyle(2, UITheme.colors.border);
    bg.strokeRoundedRect(px, py, panelW, panelH, 8);

    const title = this.add
      .text(GAME_WIDTH / 2, py + 24, '전투 리플레이', {
        ...UITheme.font.heading,
      })
      .setOrigin(0.5)
      .setDepth(102);

    // 스테이지 버튼 목록
    const stageButtons: UIButton[] = [];
    for (let i = 0; i < replays.length; i++) {
      const entry = replays[i];
      const winLabel = entry.replayData.winner === 'PLAYER' ? '승리' : '패배';
      const roundLabel = `${entry.replayData.totalRounds}R`;
      const btn = new UIButton(this, {
        x: px + 40,
        y: py + 64 + i * 56,
        width: panelW - 80,
        height: 44,
        label: `Stage ${entry.stage}  —  ${winLabel} (${roundLabel})`,
        style: 'secondary',
        onClick: () => {
          cleanup();
          this.scene.start('ReplayScene', {
            replayData: entry.replayData,
            returnScene: 'RunMapScene',
          });
        },
      });
      btn.container.setDepth(102);
      stageButtons.push(btn);
    }

    // 닫기 버튼
    const closeBtn = new UIButton(this, {
      x: GAME_WIDTH / 2 - 60,
      y: py + panelH - 50,
      width: 120,
      height: 40,
      label: '닫기',
      style: 'secondary',
      onClick: () => {
        cleanup();
      },
    });
    closeBtn.container.setDepth(102);

    const cleanup = () => {
      dim.destroy();
      bg.destroy();
      title.destroy();
      closeBtn.container.destroy();
      for (const btn of stageButtons) {
        btn.container.destroy();
      }
    };
  }
}
