/**
 * SortieScene — 출격 선택 화면
 * 전장 목록에서 하나를 선택하여 런을 시작
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from '../ui/UITheme';
import { UIButton } from '../ui/UIButton';
import { UIModal } from '../ui/UIModal';
import { UIToast } from '../ui/UIToast';
import { gameState } from '../core/GameState';
import { createRunState } from '../core/RunManager';
import type { CharacterDefinition } from '../types';

interface BattlefieldDef {
  id: string;
  name: string;
  description: string;
  difficulty: number; // 1~5
  theme: string;
  enemyPreview: string; // 주요 적 타입
  color: number; // 카드 테두리 색
  bgColor: number; // 카드 배경 색
  unlocked: boolean;
  unlockCondition?: string;
}

const BATTLEFIELDS: BattlefieldDef[] = [
  {
    id: 'plains',
    name: '변방 초원',
    description: '평화로운 초원 변두리에 도적들이 출몰한다.\n입문자를 위한 전장.',
    difficulty: 1,
    theme: '초원 / 평야',
    enemyPreview: 'Brute, Ranger',
    color: 0x4ade80,
    bgColor: 0x1a2e1a,
    unlocked: true,
  },
  {
    id: 'dark_forest',
    name: '어둠의 숲',
    description: '빽빽한 수림 사이로 적의 화살이 날아온다.\n후열 위협이 강한 전장.',
    difficulty: 2,
    theme: '숲 / 야간',
    enemyPreview: 'Ranger, Guard',
    color: 0x8b5cf6,
    bgColor: 0x1a1a2e,
    unlocked: false,
    unlockCondition: '변방 초원 클리어',
  },
  {
    id: 'ruined_fortress',
    name: '폐허 요새',
    description: '무너진 요새에 강력한 적이 포진해 있다.\n포지션 전략이 핵심.',
    difficulty: 3,
    theme: '폐허 / 성채',
    enemyPreview: 'Guard, Disruptor, Boss',
    color: 0xef4444,
    bgColor: 0x2e1a1a,
    unlocked: false,
    unlockCondition: '어둠의 숲 클리어',
  },
];

// 카드 레이아웃 상수
const CARD_W = 340;
const CARD_H = 380;
const CARD_GAP = 40;
const CARDS_START_X = (GAME_WIDTH - (CARD_W * 3 + CARD_GAP * 2)) / 2;
const CARDS_Y = 100;

export class SortieScene extends Phaser.Scene {
  private toast!: UIToast;
  private selectedId: string | null = null;
  private cardContainers: Phaser.GameObjects.Container[] = [];
  private sortieBtn!: UIButton;

  constructor() {
    super({ key: 'SortieScene' });
  }

  create(): void {
    this.selectedId = null;
    this.cardContainers = [];

    this.drawBackground();
    this.drawTopBar();
    this.createBattlefieldCards();
    this.createBottomButtons();
    this.toast = new UIToast(this, { y: GAME_HEIGHT - 80 });
  }

  private drawBackground(): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x0f0f1a, 1);
    gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private drawTopBar(): void {
    const bar = this.add.graphics();
    bar.fillStyle(0x0a0a16, 0.85);
    bar.fillRect(0, 0, GAME_WIDTH, 50);
    bar.lineStyle(1, UITheme.colors.border);
    bar.lineBetween(0, 50, GAME_WIDTH, 50);
    bar.setDepth(10);

    this.add.text(20, 14, '출격 선택', { ...UITheme.font.heading, color: UITheme.colors.textPrimary }).setDepth(11);

    this.add
      .text(GAME_WIDTH - 20, 14, `Gold: ${gameState.gold}`, { ...UITheme.font.body, color: '#ffcc00' })
      .setOrigin(1, 0)
      .setDepth(11);
  }

  private createBattlefieldCards(): void {
    for (let i = 0; i < BATTLEFIELDS.length; i++) {
      const bf = BATTLEFIELDS[i];
      const x = CARDS_START_X + i * (CARD_W + CARD_GAP);
      const container = this.createCard(bf, x, CARDS_Y);
      this.cardContainers.push(container);
    }
  }

  private createCard(bf: BattlefieldDef, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const locked = !bf.unlocked;

    // 카드 배경
    const bg = this.add.graphics();
    this.drawCardBg(bg, bf, false);
    container.add(bg);

    // 난이도 별
    const stars = '★'.repeat(bf.difficulty) + '☆'.repeat(5 - bf.difficulty);
    const starsText = this.add
      .text(CARD_W / 2, 24, stars, {
        fontSize: '20px',
        fontFamily: UITheme.font.family,
        color: locked ? '#444455' : '#ffcc00',
      })
      .setOrigin(0.5);
    container.add(starsText);

    // 전장 이름
    const nameText = this.add
      .text(CARD_W / 2, 60, bf.name, {
        fontSize: '24px',
        fontFamily: UITheme.font.family,
        color: locked ? '#555566' : '#ffffff',
      })
      .setOrigin(0.5);
    container.add(nameText);

    // 테마
    const themeText = this.add
      .text(CARD_W / 2, 90, bf.theme, {
        ...UITheme.font.label,
        color: locked ? '#444455' : '#8888aa',
      })
      .setOrigin(0.5);
    container.add(themeText);

    // 구분선
    const divider = this.add.graphics();
    divider.lineStyle(1, locked ? 0x333344 : bf.color, 0.4);
    divider.lineBetween(20, 115, CARD_W - 20, 115);
    container.add(divider);

    // 설명
    const descText = this.add
      .text(24, 130, locked ? '' : bf.description, {
        ...UITheme.font.body,
        color: '#bbbbcc',
        wordWrap: { width: CARD_W - 48 },
        lineSpacing: 6,
      })
      .setFontSize(15);
    container.add(descText);

    // 적 미리보기
    if (!locked) {
      const enemyLabel = this.add.text(24, 210, '주요 적', { ...UITheme.font.small, color: '#666688' }).setFontSize(12);
      container.add(enemyLabel);

      const enemyText = this.add.text(24, 228, bf.enemyPreview, {
        ...UITheme.font.body,
        color: '#cc9966',
      });
      container.add(enemyText);

      // 스테이지 정보
      const stageText = this.add.text(24, 270, '5 스테이지 런', {
        ...UITheme.font.label,
        color: '#7788aa',
      });
      container.add(stageText);
    }

    // 잠금 표시
    if (locked) {
      const lockIcon = this.add
        .text(CARD_W / 2, 180, '🔒', { fontSize: '48px', fontFamily: UITheme.font.family })
        .setOrigin(0.5);
      container.add(lockIcon);

      const lockText = this.add
        .text(CARD_W / 2, 240, bf.unlockCondition ?? '잠김', {
          ...UITheme.font.body,
          color: '#666677',
          align: 'center',
        })
        .setOrigin(0.5);
      container.add(lockText);
    }

    // 하단 상태 바
    const statusBg = this.add.graphics();
    statusBg.fillStyle(locked ? 0x1a1a22 : 0x1a2a1a, 0.8);
    statusBg.fillRoundedRect(0, CARD_H - 50, CARD_W, 50, { tl: 0, tr: 0, bl: 8, br: 8 });
    container.add(statusBg);

    const statusText = this.add
      .text(CARD_W / 2, CARD_H - 26, locked ? '잠김' : '출격 가능', {
        ...UITheme.font.body,
        color: locked ? '#555566' : '#44cc44',
      })
      .setOrigin(0.5);
    container.add(statusText);

    // 클릭 영역
    if (!locked) {
      const hitArea = this.add
        .rectangle(CARD_W / 2, CARD_H / 2, CARD_W, CARD_H, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      container.add(hitArea);

      hitArea.on('pointerover', () => {
        this.drawCardBg(bg, bf, true);
      });
      hitArea.on('pointerout', () => {
        this.drawCardBg(bg, bf, false);
      });
      hitArea.on('pointerdown', () => {
        this.selectBattlefield(bf.id);
      });
    }

    container.setData('id', bf.id);
    container.setData('bg', bg);

    return container;
  }

  private drawCardBg(gfx: Phaser.GameObjects.Graphics, bf: BattlefieldDef, hovered: boolean): void {
    const locked = !bf.unlocked;
    const selected = this.selectedId === bf.id;
    gfx.clear();

    // 배경
    gfx.fillStyle(locked ? 0x111118 : bf.bgColor, locked ? 0.6 : 0.9);
    gfx.fillRoundedRect(0, 0, CARD_W, CARD_H, 8);

    // 테두리
    const borderColor = selected ? 0xffffff : hovered ? bf.color : locked ? 0x333344 : bf.color;
    const borderAlpha = selected ? 1 : hovered ? 0.9 : locked ? 0.5 : 0.6;
    const borderWidth = selected ? 3 : 2;
    gfx.lineStyle(borderWidth, borderColor, borderAlpha);
    gfx.strokeRoundedRect(0, 0, CARD_W, CARD_H, 8);
  }

  private selectBattlefield(id: string): void {
    this.selectedId = id;
    const bf = BATTLEFIELDS.find((b) => b.id === id)!;

    // 모든 카드 배경 갱신
    for (const container of this.cardContainers) {
      const cid = container.getData('id') as string;
      const cbf = BATTLEFIELDS.find((b) => b.id === cid)!;
      const bg = container.getData('bg') as Phaser.GameObjects.Graphics;
      this.drawCardBg(bg, cbf, false);
    }

    // 선택 카드 scale 효과
    const selected = this.cardContainers.find((c) => c.getData('id') === id);
    if (selected) {
      this.tweens.add({
        targets: selected,
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 100,
        yoyo: true,
        ease: 'Power1',
      });
    }

    this.sortieBtn.setDisabled(false);
    this.sortieBtn.setLabel(`${bf.name} 출격!`);
    this.toast.show(`${bf.name} 선택됨`);
  }

  private createBottomButtons(): void {
    new UIButton(this, {
      x: 20,
      y: GAME_HEIGHT - 55,
      width: 140,
      height: 44,
      label: '< 마을로',
      style: 'secondary',
      onClick: () => {
        this.scene.start('TownScene');
      },
    });

    this.sortieBtn = new UIButton(this, {
      x: GAME_WIDTH - 240,
      y: GAME_HEIGHT - 55,
      width: 220,
      height: 44,
      label: '전장을 선택하세요',
      style: 'primary',
      disabled: true,
      onClick: () => {
        if (!this.selectedId) return;

        // 편성에서 파티 추출
        const formation = gameState.formation;
        const party: CharacterDefinition[] = [];
        for (const slot of formation.slots) {
          const def = gameState.getCharacter(slot.characterId);
          if (def) party.push(def);
        }

        if (party.length < 4) {
          this.toast.show('편성이 부족합니다 (4명 필요)');
          return;
        }

        // 런 생성
        const seed = Date.now();
        const runState = createRunState(party, seed);
        gameState.setRunState(runState);

        this.scene.start('RunMapScene');
      },
    });
  }
}
