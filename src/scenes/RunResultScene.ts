/**
 * RunResultScene — 런 종료 결과 요약 화면
 *
 * 레이아웃:
 * - 상단: 결과 타이틀 (승리/패배)
 * - 중앙: 성과 요약 (스테이지, 골드, 카드)
 * - 하단: "마을로 돌아가기" 버튼
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from '../ui/UITheme';
import { UIButton } from '../ui/UIButton';
import { gameState } from '../core/GameState';
import { calculateRunResult, finalizeRun } from '../systems/RunResultCalculator';
import type { RunState, RunResultData } from '../types';

interface SceneData {
  runState: RunState;
}

export class RunResultScene extends Phaser.Scene {
  constructor() {
    super('RunResultScene');
  }

  create(data: SceneData): void {
    const { runState } = data;

    // 결과 계산 (endRun 호출 전 상태로)
    const result = calculateRunResult(runState);

    // 영속 자원 반영 + 런 상태 제거
    finalizeRun(runState, gameState);

    // 배경
    this.cameras.main.setBackgroundColor(UITheme.colors.bgDark);

    this.renderTitle(result);
    this.renderSummary(result);
    this.renderReturnButton();
  }

  private renderTitle(result: RunResultData): void {
    const titleText = result.victory ? '런 완료!' : '런 실패';
    const titleColor = result.victory ? UITheme.colors.textGold : UITheme.colors.textWarning;

    this.add
      .text(GAME_WIDTH / 2, 120, titleText, {
        ...UITheme.font.title,
        fontSize: '40px',
        color: titleColor,
      })
      .setOrigin(0.5);
  }

  private renderSummary(result: RunResultData): void {
    const cx = GAME_WIDTH / 2;
    const startY = 260;
    const lineGap = 56;

    // 패널 배경
    const panelW = 500;
    const panelH = 240;
    this.add
      .rectangle(cx, startY + panelH / 2 - 30, panelW, panelH, UITheme.colors.bgPanel)
      .setStrokeStyle(UITheme.panel.borderWidth, UITheme.colors.border);

    // 스테이지 클리어
    this.add
      .text(cx, startY, `${result.stagesCleared} / ${result.maxStages} 스테이지 클리어`, {
        ...UITheme.font.heading,
      })
      .setOrigin(0.5);

    // 획득 골드
    this.add
      .text(cx, startY + lineGap, `+${result.goldEarned} Gold`, {
        ...UITheme.font.heading,
        color: UITheme.colors.textGold,
      })
      .setOrigin(0.5);

    // 획득 카드
    this.add
      .text(cx, startY + lineGap * 2, `${result.cardsAcquired}장 획득`, {
        ...UITheme.font.heading,
        color: UITheme.colors.textAccent,
      })
      .setOrigin(0.5);
  }

  private renderReturnButton(): void {
    new UIButton(this, {
      x: GAME_WIDTH / 2 - 100,
      y: GAME_HEIGHT - 100,
      width: 200,
      height: 48,
      label: '마을로 돌아가기',
      style: 'primary',
      onClick: () => {
        this.scene.start('TownScene');
      },
    });
  }
}
