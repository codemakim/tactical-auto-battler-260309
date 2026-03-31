/**
 * RewardScene — 전투 승리 보상 화면
 *
 * 레이아웃:
 * - 상단: 골드 표시 + 스테이지 정보
 * - 중앙: 카드 선택 (5장 → 1장)
 * - 하단: 진행 버튼
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from '../ui/UITheme';
import { UIButton } from '../ui/UIButton';
import { UIToast } from '../ui/UIToast';
import { UICardVisual } from '../ui/UICardVisual';
import { gameState } from '../core/GameState';
import { calculateRewardPhase, applyRewardSelections } from '../systems/RewardCalculator';
import { getRewardProceedTarget } from '../systems/RewardFlow';
import { drawRoundedFrame } from '../ui/FormationGraphics';
import { getRewardActionLabels, getRewardEmptyStateCopy, getRewardHeaderCopy } from '../systems/RewardPresentation';
import type { RunState, BattleState, RewardPhaseData } from '../types';

// 카드 표시 상수
const CARD_W = 168;
const CARD_H = 232;
const CARD_GAP = 18;

interface SceneData {
  runState: RunState;
  battleState: BattleState;
}

export class RewardScene extends Phaser.Scene {
  private toast!: UIToast;
  private rewardData!: RewardPhaseData;
  private updatedRunState!: RunState;

  // 선택 상태
  private selectedCardIndex: number | null = null;
  private cardDecided: boolean = false;

  // UI 참조
  private cardVisuals: UICardVisual[] = [];
  private confirmBtn!: UIButton;
  private proceedLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'RewardScene' });
  }

  create(data: SceneData): void {
    this.selectedCardIndex = null;
    this.cardDecided = false;
    this.cardVisuals = [];

    // 보상 데이터 계산
    const result = calculateRewardPhase(data.runState, data.battleState);
    this.rewardData = result.rewardData;
    this.updatedRunState = result.updatedRunState;

    this.toast = new UIToast(this);

    this.drawBackground();
    this.drawGoldSection();
    this.drawCardSection();
  }

  // ── 배경 ──

  private drawBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(UITheme.colors.bgDark);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawRoundedFrame(bg, 36, 36, GAME_WIDTH - 72, GAME_HEIGHT - 72, 18, {
      backgroundColor: 0x121828,
      borderColor: 0x2d4266,
      borderWidth: 2,
      alpha: 0.98,
    });
    bg.fillStyle(0x18243a, 0.45);
    bg.fillRoundedRect(54, 54, GAME_WIDTH - 108, 120, 12);
    bg.lineStyle(1, 0x36527d, 0.5);
    bg.lineBetween(72, 186, GAME_WIDTH - 72, 186);
  }

  // ── 골드 + 스테이지 ──

  private drawGoldSection(): void {
    const cx = GAME_WIDTH / 2;
    const header = getRewardHeaderCopy({
      currentStage: this.rewardData.currentStage,
      maxStages: this.rewardData.maxStages,
      goldEarned: this.rewardData.goldEarned,
    });

    this.add
      .text(cx, 72, header.stageLabel, {
        fontSize: '14px',
        fontFamily: UITheme.font.family,
        color: '#7c95bf',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 96, header.title, {
        fontSize: '38px',
        fontFamily: UITheme.font.family,
        fontStyle: 'bold',
        color: '#ffcc00',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 138, header.subtitle, {
        fontSize: '13px',
        fontFamily: UITheme.font.family,
        color: '#b8c8df',
      })
      .setOrigin(0.5);
  }

  // ── 카드 선택 ──

  private drawCardSection(): void {
    const cards = this.rewardData.cardOptions;

    if (cards.length === 0) {
      this.add
        .text(GAME_WIDTH / 2, 278, getRewardEmptyStateCopy(this.rewardData.isLastStage), {
          ...UITheme.font.body,
          color: '#666677',
          wordWrap: { width: 520 },
          align: 'center',
        })
        .setOrigin(0.5);
      this.cardDecided = true;
      this.time.delayedCall(800, () => this.onProceed());
      return;
    }

    this.add
      .text(GAME_WIDTH / 2, 212, 'CHOOSE ONE TACTIC', {
        fontSize: '16px',
        fontFamily: UITheme.font.family,
        color: '#d7deee',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 236, 'Recovered after victory. Secure one card before moving on.', {
        fontSize: '12px',
        fontFamily: UITheme.font.family,
        color: '#8a9cbb',
      })
      .setOrigin(0.5);

    // 카드 배치
    const totalW = cards.length * (CARD_W + CARD_GAP) - CARD_GAP;
    const startX = (GAME_WIDTH - totalW) / 2;
    const cardY = 270;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const x = startX + i * (CARD_W + CARD_GAP);
      const idx = i;
      const cv = new UICardVisual(this, {
        x,
        y: cardY,
        width: CARD_W,
        height: CARD_H,
        action: card.action,
        rarity: card.rarity,
        classRestriction: card.classRestriction,
        interactive: true,
        onClick: () => {
          if (!this.cardDecided) this.selectCard(idx);
        },
      });
      this.cardVisuals.push(cv);
    }

    // 버튼 영역
    const btnY = cardY + CARD_H + 24;
    const actionLabels = getRewardActionLabels({ isLastStage: this.rewardData.isLastStage });

    this.proceedLabel = this.add
      .text(GAME_WIDTH / 2, btnY - 34, actionLabels.proceed, {
        fontSize: '12px',
        fontFamily: UITheme.font.family,
        color: '#7a90b6',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.confirmBtn = new UIButton(this, {
      x: GAME_WIDTH / 2 - 170,
      y: btnY,
      width: 180,
      height: 44,
      label: actionLabels.confirm,
      style: 'primary',
      disabled: true,
      onClick: () => this.onConfirmCard(),
    });

    new UIButton(this, {
      x: GAME_WIDTH / 2 + 30,
      y: btnY,
      width: 140,
      height: 44,
      label: actionLabels.skip,
      style: 'secondary',
      onClick: () => this.onSkipCard(),
    });
  }

  private selectCard(index: number): void {
    this.selectedCardIndex = index;

    for (let i = 0; i < this.cardVisuals.length; i++) {
      this.cardVisuals[i].setSelected(i === index);
    }

    this.confirmBtn.setDisabled(false);
    this.confirmBtn.setLabel(
      getRewardActionLabels({
        selectedCardName: this.rewardData.cardOptions[index].action.name,
        isLastStage: this.rewardData.isLastStage,
      }).confirm,
    );
  }

  private onConfirmCard(): void {
    if (this.selectedCardIndex === null) return;
    this.cardDecided = true;
    this.confirmBtn.setDisabled(true);
    this.toast.show(`카드 획득: ${this.rewardData.cardOptions[this.selectedCardIndex].action.name}`);
    this.time.delayedCall(800, () => this.onProceed());
  }

  private onSkipCard(): void {
    this.selectedCardIndex = null;
    this.cardDecided = true;
    this.confirmBtn.setDisabled(true);
    this.toast.show('카드 건너뛰기');
    this.time.delayedCall(800, () => this.onProceed());
  }

  // ── 전환 ──

  private onProceed(): void {
    const selectedCard = this.selectedCardIndex !== null ? this.rewardData.cardOptions[this.selectedCardIndex] : null;

    const finalRunState = applyRewardSelections(this.updatedRunState, selectedCard);

    gameState.setRunState(finalRunState);

    const proceedTarget = getRewardProceedTarget(this.rewardData.isLastStage, finalRunState);
    this.scene.start(proceedTarget.scene, proceedTarget.data);
  }
}
