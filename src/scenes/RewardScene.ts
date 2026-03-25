/**
 * RewardScene — 전투 승리 보상 화면
 *
 * 레이아웃:
 * - 상단: 골드 표시 + 스테이지 정보
 * - 중앙: 카드 선택 (5장 → 1장)
 * - 하단: 게스트 멤버 (Stage 2~4) + 진행 버튼
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from '../ui/UITheme';
import { UIButton } from '../ui/UIButton';
import { UIToast } from '../ui/UIToast';
import { UICardVisual } from '../ui/UICardVisual';
import { gameState } from '../core/GameState';
import { calculateRewardPhase, applyRewardSelections } from '../systems/RewardCalculator';
import type { RunState, BattleState, RewardPhaseData, CardInstance, CharacterReward } from '../types';

// 카드 표시 상수
const CARD_W = 150;
const CARD_H = 200;
const CARD_GAP = 16;

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
  private acceptGuest: boolean = true; // 기본값: 수락
  private guestDecided: boolean = false;

  // UI 참조
  private cardVisuals: UICardVisual[] = [];
  private confirmBtn!: UIButton;
  private proceedBtn!: UIButton;

  constructor() {
    super({ key: 'RewardScene' });
  }

  create(data: SceneData): void {
    this.selectedCardIndex = null;
    this.cardDecided = false;
    this.acceptGuest = true;
    this.guestDecided = false;
    this.cardVisuals = [];

    // 보상 데이터 계산
    const result = calculateRewardPhase(data.runState, data.battleState);
    this.rewardData = result.rewardData;
    this.updatedRunState = result.updatedRunState;

    this.toast = new UIToast(this);

    this.drawBackground();
    this.drawGoldSection();
    this.drawCardSection();

    if (this.rewardData.guestReward) {
      this.drawGuestSection();
    } else {
      this.guestDecided = true;
    }

    this.drawProceedButton();
    this.updateProceedButton();
  }

  // ── 배경 ──

  private drawBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(UITheme.colors.bgDark);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 상단 장식선
    bg.lineStyle(1, UITheme.colors.border);
    bg.lineBetween(0, 50, GAME_WIDTH, 50);
  }

  // ── 골드 + 스테이지 ──

  private drawGoldSection(): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 24, `Stage ${this.rewardData.currentStage} 클리어`, {
        ...UITheme.font.label,
        color: '#8899aa',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 76, `+${this.rewardData.goldEarned} Gold`, {
        fontSize: '24px',
        fontFamily: UITheme.font.family,
        fontStyle: 'bold',
        color: '#ffcc00',
      })
      .setOrigin(0.5);
  }

  // ── 카드 선택 ──

  private drawCardSection(): void {
    const cards = this.rewardData.cardOptions;

    if (cards.length === 0) {
      this.add
        .text(GAME_WIDTH / 2, 220, '획득 가능한 카드가 없습니다', {
          ...UITheme.font.body,
          color: '#666677',
        })
        .setOrigin(0.5);
      this.cardDecided = true;
      return;
    }

    this.add
      .text(GAME_WIDTH / 2, 110, '카드를 선택하세요 (1장)', {
        ...UITheme.font.body,
        color: '#ccccdd',
      })
      .setOrigin(0.5);

    // 카드 배치
    const totalW = cards.length * (CARD_W + CARD_GAP) - CARD_GAP;
    const startX = (GAME_WIDTH - totalW) / 2;
    const cardY = 140;

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
    const btnY = cardY + CARD_H + 16;

    this.confirmBtn = new UIButton(this, {
      x: GAME_WIDTH / 2 - 170,
      y: btnY,
      width: 150,
      height: 40,
      label: '카드 획득',
      style: 'primary',
      disabled: true,
      onClick: () => this.onConfirmCard(),
    });

    new UIButton(this, {
      x: GAME_WIDTH / 2 + 20,
      y: btnY,
      width: 150,
      height: 40,
      label: '건너뛰기',
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
    this.confirmBtn.setLabel(`${this.rewardData.cardOptions[index].action.name} 획득`);
  }

  private onConfirmCard(): void {
    if (this.selectedCardIndex === null) return;
    this.cardDecided = true;
    this.confirmBtn.setDisabled(true);
    this.toast.show(`카드 획득: ${this.rewardData.cardOptions[this.selectedCardIndex].action.name}`);
    this.updateProceedButton();
  }

  private onSkipCard(): void {
    this.selectedCardIndex = null;
    this.cardDecided = true;
    this.confirmBtn.setDisabled(true);
    this.toast.show('카드 건너뛰기');
    this.updateProceedButton();
  }

  // ── 게스트 멤버 ──

  private drawGuestSection(): void {
    const guest = this.rewardData.guestReward!;
    const y = 420;
    const cx = GAME_WIDTH / 2;

    // 구분선
    const line = this.add.graphics();
    line.lineStyle(1, UITheme.colors.border);
    line.lineBetween(cx - 300, y - 10, cx + 300, y - 10);

    this.add
      .text(cx, y, '객원 멤버 등장!', {
        fontSize: '16px',
        fontFamily: UITheme.font.family,
        fontStyle: 'bold',
        color: '#4a9eff',
      })
      .setOrigin(0.5);

    // 캐릭터 정보
    const charDef = guest.character;
    const statsText = `HP:${charDef.baseStats.hp}  ATK:${charDef.baseStats.atk}  GRD:${charDef.baseStats.grd}  AGI:${charDef.baseStats.agi}`;

    this.add
      .text(cx, y + 28, `${charDef.name}  (${charDef.characterClass})`, {
        fontSize: '14px',
        fontFamily: UITheme.font.family,
        color: '#ccccdd',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, y + 50, statsText, {
        fontSize: '12px',
        fontFamily: UITheme.font.family,
        color: '#8899aa',
      })
      .setOrigin(0.5);

    // 영입/거절 버튼
    new UIButton(this, {
      x: cx - 170,
      y: y + 74,
      width: 150,
      height: 40,
      label: '영입',
      style: 'primary',
      onClick: () => this.onAcceptGuest(),
    });

    new UIButton(this, {
      x: cx + 20,
      y: y + 74,
      width: 150,
      height: 40,
      label: '거절',
      style: 'secondary',
      onClick: () => this.onRejectGuest(),
    });
  }

  private onAcceptGuest(): void {
    this.acceptGuest = true;
    this.guestDecided = true;
    this.toast.show(`${this.rewardData.guestReward!.character.name} 영입!`);
    this.updateProceedButton();
  }

  private onRejectGuest(): void {
    this.acceptGuest = false;
    this.guestDecided = true;
    this.toast.show('객원 멤버를 거절했습니다');
    this.updateProceedButton();
  }

  // ── 진행 버튼 ──

  private drawProceedButton(): void {
    const label = this.rewardData.isLastStage ? '런 완료!' : '다음 스테이지 →';
    const btnY = GAME_HEIGHT - 70;

    this.proceedBtn = new UIButton(this, {
      x: GAME_WIDTH / 2 - 100,
      y: btnY,
      width: 200,
      height: 48,
      label,
      style: 'primary',
      disabled: true,
      onClick: () => this.onProceed(),
    });
  }

  private updateProceedButton(): void {
    const ready = this.cardDecided && this.guestDecided;
    this.proceedBtn.setDisabled(!ready);
  }

  private onProceed(): void {
    const selectedCard = this.selectedCardIndex !== null ? this.rewardData.cardOptions[this.selectedCardIndex] : null;

    const guestId = this.rewardData.guestReward?.character.id;

    const finalRunState = applyRewardSelections(this.updatedRunState, selectedCard, this.acceptGuest, guestId);

    gameState.setRunState(finalRunState);

    if (this.rewardData.isLastStage) {
      // 런 완료 → 결과 화면
      this.scene.start('RunResultScene', { runState: finalRunState });
    } else {
      // 다음 스테이지 → 편성
      this.scene.start('RunMapScene');
    }
  }
}
