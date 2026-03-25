/**
 * FormationScene — 편성 화면
 * 출전 3인 + 교체 1인 배치, 영웅 선택
 *
 * 레이아웃:
 * - 좌측: 보유 캐릭터 목록 (roster)
 * - 중앙: 전투 슬롯 (FRONT/BACK 포지션)
 * - 우측: 영웅 선택 + 상세 정보
 * - 하단: 출격/뒤로 버튼
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from '../ui/UITheme';
import { UIPanel } from '../ui/UIPanel';
import { UIToast } from '../ui/UIToast';
import { UIButton } from '../ui/UIButton';
import { UIModal } from '../ui/UIModal';
import { gameState } from '../core/GameState';
import { UICardVisual } from '../ui/UICardVisual';
import { HeroType, Position, RunStatus } from '../types';
import type { CharacterDefinition, SlotDisplayData, CardInstance, RunState } from '../types';
import { HERO_DEFINITIONS } from '../data/HeroDefinitions';
import { getSlotDisplayData, swapBaseActionSlots, swapRunActionSlots } from '../systems/FormationCardCalculator';
import { equipCard, unequipCard, getEquippableCards } from '../core/RunManager';

// 편성 슬롯 시각적 위치
interface SlotVisual {
  x: number;
  y: number;
  label: string;
  position: Position;
  type: 'combat' | 'reserve';
}

// 아군은 왼쪽에서 오른쪽을 바라봄: BACK(좌열) → FRONT(우열)
// 열 기반 정렬 — 인원 변경에도 유연하게 대응
const BACK_COL_X = 450;
const FRONT_COL_X = 630;
const SLOT_START_Y = 185;
const SLOT_GAP_Y = 120;

const SLOT_VISUALS: SlotVisual[] = [
  { x: BACK_COL_X, y: SLOT_START_Y, label: 'BACK 1', position: Position.BACK, type: 'combat' },
  { x: FRONT_COL_X, y: SLOT_START_Y, label: 'FRONT 1', position: Position.FRONT, type: 'combat' },
  { x: FRONT_COL_X, y: SLOT_START_Y + SLOT_GAP_Y, label: 'FRONT 2', position: Position.FRONT, type: 'combat' },
  { x: BACK_COL_X, y: SLOT_START_Y + SLOT_GAP_Y * 2 + 20, label: 'RESERVE', position: Position.BACK, type: 'reserve' },
];

const HERO_TYPES = [HeroType.COMMANDER, HeroType.MAGE, HeroType.SUPPORT] as const;

export class FormationScene extends Phaser.Scene {
  private rosterPanel!: UIPanel;
  private rosterItems: Phaser.GameObjects.Container[] = [];
  private slotContainers: Phaser.GameObjects.Container[] = [];
  private heroButtons: Phaser.GameObjects.Container[] = [];
  private detailPanel!: UIPanel;
  private detailContent!: Phaser.GameObjects.Text;
  private slotCards: UICardVisual[] = [];
  private inventoryCards: UICardVisual[] = [];
  private selectedActionSlot: number | null = null;
  private selectedRosterCharId: string | null = null;
  private selectedSlotIndex: number | null = null;
  private toast!: UIToast;

  constructor() {
    super({ key: 'FormationScene' });
  }

  create(): void {
    this.selectedRosterCharId = null;
    this.selectedSlotIndex = null;
    this.selectedActionSlot = null;
    this.rosterItems = [];
    this.slotContainers = [];
    this.heroButtons = [];
    this.slotCards = [];
    this.inventoryCards = [];

    this.drawBackground();
    this.drawTopBar();
    this.createRosterPanel();
    this.createSlots();
    this.createHeroSelector();
    this.createDetailPanel();
    this.createBottomButtons();
    this.toast = new UIToast(this, { y: GAME_HEIGHT - 110, duration: 2500 });
    this.refreshAll();
  }

  // === 배경/상단 ===

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

    this.add.text(20, 14, '작전실 — 편성', { ...UITheme.font.heading, color: UITheme.colors.textPrimary }).setDepth(11);

    this.add
      .text(GAME_WIDTH - 20, 14, `Gold: ${gameState.gold}`, { ...UITheme.font.body, color: '#ffcc00' })
      .setOrigin(1, 0)
      .setDepth(11);
  }

  // === 좌측: 보유 캐릭터 목록 ===

  private createRosterPanel(): void {
    this.rosterPanel = new UIPanel(this, {
      x: 20,
      y: 65,
      width: 240,
      height: GAME_HEIGHT - 130,
      title: '보유 캐릭터',
    });
  }

  private refreshRoster(): void {
    // 기존 아이템 제거
    for (const item of this.rosterItems) {
      item.destroy();
    }
    this.rosterItems = [];

    const characters = gameState.characters;
    const formationIds = new Set(gameState.getFormationCharacterIds());
    const startY = this.rosterPanel.contentY + 8;
    const itemH = 52;

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      const isAssigned = formationIds.has(char.id);
      const item = this.createRosterItem(char, isAssigned, 8, startY + i * itemH);
      this.rosterPanel.add(item);
      this.rosterItems.push(item);
    }
  }

  private createRosterItem(
    char: CharacterDefinition,
    isAssigned: boolean,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const w = 224;
    const h = 46;

    // 배경
    const bg = this.add.graphics();
    const bgColor = isAssigned ? 0x1a2a3a : 0x1a1a2e;
    bg.fillStyle(bgColor, 0.9);
    bg.fillRoundedRect(0, 0, w, h, 4);
    bg.lineStyle(1, isAssigned ? 0x3b82f6 : UITheme.colors.border);
    bg.strokeRoundedRect(0, 0, w, h, 4);
    container.add(bg);

    // 클래스 약자
    const classShort = char.characterClass.substring(0, 3);
    const classTag = this.add.text(8, 6, classShort, { ...UITheme.font.small, color: '#6688aa' }).setFontSize(11);
    container.add(classTag);

    // 이름
    const nameText = this.add.text(8, 22, char.name, {
      ...UITheme.font.label,
      color: isAssigned ? UITheme.colors.textAccent : UITheme.colors.textPrimary,
    });
    container.add(nameText);

    // 스탯 요약
    const stats = char.baseStats;
    const statText = this.add
      .text(w - 8, 14, `HP${stats.hp} A${stats.atk} G${stats.grd} S${stats.agi}`, {
        ...UITheme.font.small,
        color: '#666688',
      })
      .setOrigin(1, 0)
      .setFontSize(10);
    container.add(statText);

    // 배치 상태
    if (isAssigned) {
      const badge = this.add
        .text(w - 8, 32, '편성됨', { ...UITheme.font.small, color: '#4488cc' })
        .setOrigin(1, 0)
        .setFontSize(10);
      container.add(badge);
    }

    // 클릭 영역
    const hitArea = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x2a2a4a, 0.95);
      bg.fillRoundedRect(0, 0, w, h, 4);
      bg.lineStyle(1, UITheme.colors.borderHighlight);
      bg.strokeRoundedRect(0, 0, w, h, 4);
    });

    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 0.9);
      bg.fillRoundedRect(0, 0, w, h, 4);
      bg.lineStyle(1, isAssigned ? 0x3b82f6 : UITheme.colors.border);
      bg.strokeRoundedRect(0, 0, w, h, 4);
    });

    hitArea.on('pointerdown', () => {
      this.onRosterClick(char);
    });

    return container;
  }

  private onRosterClick(char: CharacterDefinition): void {
    this.selectedRosterCharId = char.id;
    this.updateDetailPanel(char);

    // 슬롯이 선택되어 있으면 바로 배치
    if (this.selectedSlotIndex !== null) {
      this.assignToSlot(this.selectedSlotIndex, char.id);
    } else {
      this.toast.show(`${char.name} 선택됨 — 배치할 슬롯을 클릭하세요`);
    }
  }

  // === 중앙: 전투 슬롯 ===

  private createSlots(): void {
    // 열 라벨 (슬롯 위쪽, 겹치지 않게)
    this.add.text(BACK_COL_X, SLOT_START_Y - 68, '← BACK', { ...UITheme.font.label, color: '#335577' }).setOrigin(0.5);
    this.add
      .text(FRONT_COL_X, SLOT_START_Y - 68, 'FRONT →', { ...UITheme.font.label, color: '#557733' })
      .setOrigin(0.5);

    // 방향 안내
    this.add
      .text((BACK_COL_X + FRONT_COL_X) / 2, SLOT_START_Y - 88, '아군 진행 방향 →', {
        ...UITheme.font.small,
        color: '#444466',
      })
      .setOrigin(0.5)
      .setFontSize(11);

    for (let i = 0; i < SLOT_VISUALS.length; i++) {
      const sv = SLOT_VISUALS[i];
      const container = this.createSlotVisual(sv, i);
      this.slotContainers.push(container);
    }
  }

  private createSlotVisual(sv: SlotVisual, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(sv.x, sv.y);
    const w = 120;
    const h = 100;
    const isReserve = sv.type === 'reserve';

    // 슬롯 배경 (점선 느낌)
    const bg = this.add.graphics();
    bg.fillStyle(isReserve ? 0x1a1a22 : 0x16213e, 0.6);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    bg.lineStyle(2, isReserve ? 0x444455 : UITheme.colors.border);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    container.add(bg);

    // 슬롯 라벨
    const label = this.add
      .text(0, -h / 2 + 8, sv.label, { ...UITheme.font.small, color: '#556677' })
      .setOrigin(0.5)
      .setFontSize(11);
    container.add(label);

    // 캐릭터 이름 (나중에 갱신)
    const nameText = this.add
      .text(0, 0, '', { ...UITheme.font.body, color: UITheme.colors.textPrimary })
      .setOrigin(0.5);
    container.add(nameText);

    // 스탯 (나중에 갱신)
    const statText = this.add
      .text(0, 20, '', { ...UITheme.font.small, color: '#666688' })
      .setOrigin(0.5)
      .setFontSize(11);
    container.add(statText);

    // 클래스 (나중에 갱신)
    const classText = this.add
      .text(0, -12, '', { ...UITheme.font.small, color: '#6688aa' })
      .setOrigin(0.5)
      .setFontSize(11);
    container.add(classText);

    // 데이터 저장
    container.setData('nameText', nameText);
    container.setData('statText', statText);
    container.setData('classText', classText);
    container.setData('bg', bg);

    // 클릭 영역
    const hitArea = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x2a2a4a, 0.7);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      bg.lineStyle(2, UITheme.colors.borderHighlight);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    });

    hitArea.on('pointerout', () => {
      this.redrawSlotBg(bg, w, h, isReserve, this.selectedSlotIndex === index);
    });

    hitArea.on('pointerdown', () => {
      this.onSlotClick(index);
    });

    return container;
  }

  private redrawSlotBg(
    bg: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    isReserve: boolean,
    selected: boolean,
  ): void {
    bg.clear();
    bg.fillStyle(isReserve ? 0x1a1a22 : 0x16213e, 0.6);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    bg.lineStyle(2, selected ? UITheme.colors.borderHighlight : isReserve ? 0x444455 : UITheme.colors.border);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
  }

  private onSlotClick(index: number): void {
    this.selectedSlotIndex = index;

    // 슬롯 선택 상태 시각 갱신
    for (let i = 0; i < this.slotContainers.length; i++) {
      const c = this.slotContainers[i];
      const bg = c.getData('bg') as Phaser.GameObjects.Graphics;
      const isReserve = SLOT_VISUALS[i].type === 'reserve';
      this.redrawSlotBg(bg, 120, 100, isReserve, i === index);
    }

    // 로스터에서 캐릭터가 선택되어 있으면 바로 배치
    if (this.selectedRosterCharId) {
      this.assignToSlot(index, this.selectedRosterCharId);
    } else {
      this.toast.show(`${SLOT_VISUALS[index].label} 슬롯 선택됨 — 좌측에서 캐릭터를 클릭하세요`);
    }

    // 해당 슬롯의 캐릭터 정보 표시
    const formation = gameState.formation;
    if (index < 3) {
      const slot = formation.slots[index];
      if (slot) {
        const char = gameState.getCharacter(slot.characterId);
        if (char) this.updateDetailPanel(char);
      }
    } else if (formation.reserveId) {
      const char = gameState.getCharacter(formation.reserveId);
      if (char) this.updateDetailPanel(char);
    }
  }

  private assignToSlot(slotIndex: number, characterId: string): void {
    const formation = gameState.formation;

    // 이미 다른 슬롯에 있으면 제거
    const newSlots = formation.slots.map((s) => (s.characterId === characterId ? { ...s, characterId: '' } : s));
    let newReserveId = formation.reserveId === characterId ? undefined : formation.reserveId;

    if (slotIndex < 3) {
      // 기존 슬롯 캐릭터와 swap
      const currentChar = newSlots[slotIndex]?.characterId;
      newSlots[slotIndex] = {
        characterId,
        position: SLOT_VISUALS[slotIndex].position,
      };
      // 빈 슬롯에 기존 캐릭터 넣기 (있었다면)
      if (currentChar) {
        const emptyIdx = newSlots.findIndex((s) => !s.characterId);
        if (emptyIdx >= 0) {
          newSlots[emptyIdx] = {
            characterId: currentChar,
            position: SLOT_VISUALS[emptyIdx].position,
          };
        }
      }
    } else {
      // reserve 슬롯
      newReserveId = characterId;
    }

    gameState.setFormation({
      slots: newSlots.filter((s) => s.characterId), // 빈 슬롯 제거
      reserveId: newReserveId,
      heroType: formation.heroType,
    });

    // 슬롯이 3개 미만이면 채워야 함
    while (gameState.formation.slots.length < 3) {
      gameState.formation.slots.push({
        characterId: '',
        position: Position.FRONT,
      });
    }

    const charName = gameState.getCharacter(characterId)?.name ?? '';
    this.selectedRosterCharId = null;
    this.selectedSlotIndex = null;
    this.refreshAll();
    this.toast.show(`${charName} → ${SLOT_VISUALS[slotIndex].label} 배치 완료!`);
  }

  private refreshSlots(): void {
    const formation = gameState.formation;

    for (let i = 0; i < SLOT_VISUALS.length; i++) {
      const container = this.slotContainers[i];
      const nameText = container.getData('nameText') as Phaser.GameObjects.Text;
      const statText = container.getData('statText') as Phaser.GameObjects.Text;
      const classText = container.getData('classText') as Phaser.GameObjects.Text;

      let char: CharacterDefinition | undefined;
      if (i < 3) {
        const slot = formation.slots[i];
        if (slot?.characterId) {
          char = gameState.getCharacter(slot.characterId);
        }
      } else {
        if (formation.reserveId) {
          char = gameState.getCharacter(formation.reserveId);
        }
      }

      if (char) {
        nameText.setText(char.name);
        classText.setText(char.characterClass.substring(0, 3));
        const s = char.baseStats;
        statText.setText(`HP${s.hp} A${s.atk} G${s.grd} S${s.agi}`);
      } else {
        nameText.setText('(empty)');
        classText.setText('');
        statText.setText('');
      }
    }
  }

  // === 우측 상단: 영웅 선택 ===

  private createHeroSelector(): void {
    const panel = new UIPanel(this, {
      x: 830,
      y: 65,
      width: 430,
      height: 130,
      title: '영웅 선택',
    });

    const startX = UITheme.panel.padding;
    const startY = panel.contentY + 4;
    const btnW = 125;
    const gap = 12;

    for (let i = 0; i < HERO_TYPES.length; i++) {
      const ht = HERO_TYPES[i];
      const def = HERO_DEFINITIONS[ht];
      const bx = startX + i * (btnW + gap);

      const container = this.add.container(bx, startY);
      const bg = this.add.graphics();
      container.add(bg);

      const nameText = this.add
        .text(btnW / 2, 12, def.name, { ...UITheme.font.label, color: UITheme.colors.textPrimary })
        .setOrigin(0.5);
      container.add(nameText);

      const descText = this.add
        .text(btnW / 2, 32, def.description.substring(0, 12), {
          ...UITheme.font.small,
          color: '#666688',
        })
        .setOrigin(0.5)
        .setFontSize(10);
      container.add(descText);

      const hitArea = this.add.rectangle(btnW / 2, 22, btnW, 44, 0x000000, 0).setInteractive({ useHandCursor: true });
      container.add(hitArea);

      hitArea.on('pointerdown', () => {
        if (gameState.runState) {
          this.toast.show('런 중에는 영웅을 변경할 수 없습니다');
          return;
        }
        gameState.setHeroType(ht);
        this.refreshHeroSelector();
      });

      container.setData('bg', bg);
      container.setData('heroType', ht);
      container.setData('hitArea', hitArea);
      panel.add(container);
      this.heroButtons.push(container);
    }

    this.refreshHeroSelector();
  }

  private refreshHeroSelector(): void {
    const currentHero = gameState.formation.heroType;
    const isRun = !!gameState.runState;
    const btnW = 125;
    const btnH = 44;

    for (const container of this.heroButtons) {
      const bg = container.getData('bg') as Phaser.GameObjects.Graphics;
      const ht = container.getData('heroType') as string;
      const isSelected = ht === currentHero;

      bg.clear();
      if (isRun && !isSelected) {
        // 런 중 비선택 영웅: 어둡게
        bg.fillStyle(0x111122, 0.6);
        bg.fillRoundedRect(0, 0, btnW, btnH, 4);
        bg.lineStyle(1, 0x333344);
        bg.strokeRoundedRect(0, 0, btnW, btnH, 4);
      } else {
        bg.fillStyle(isSelected ? 0x2a4a3a : 0x1a1a2e, 0.9);
        bg.fillRoundedRect(0, 0, btnW, btnH, 4);
        bg.lineStyle(2, isSelected ? 0x10b981 : UITheme.colors.border);
        bg.strokeRoundedRect(0, 0, btnW, btnH, 4);
      }

      container.setAlpha(isRun && !isSelected ? 0.5 : 1);
    }
  }

  // === 우측 하단: 상세 정보 ===

  private createDetailPanel(): void {
    this.detailPanel = new UIPanel(this, {
      x: 830,
      y: 210,
      width: 430,
      height: 440,
      title: '상세 정보',
    });

    this.detailContent = this.add.text(
      UITheme.panel.padding,
      this.detailPanel.contentY + 4,
      '캐릭터를 선택하면\n상세 정보가 표시됩니다.',
      { ...UITheme.font.body, color: UITheme.colors.textSecondary, wordWrap: { width: 398 } },
    );
    this.detailPanel.add(this.detailContent);
  }

  private updateDetailPanel(char: CharacterDefinition): void {
    const s = char.baseStats;
    const isRun = !!gameState.runState;
    const runState = gameState.runState;

    // 기본 텍스트 (이름 + 스탯)
    const text = [
      `${char.name} — ${char.characterClass}`,
      `HP: ${s.hp}  ATK: ${s.atk}  GRD: ${s.grd}  AGI: ${s.agi}`,
    ].join('\n');
    this.detailContent.setText(text);

    // 기존 카드 비주얼 정리
    this.clearCardVisuals();

    // 슬롯 카드 표시
    const slotData = getSlotDisplayData(char, runState);
    const cardW = 120;
    const cardH = 150;
    const cardGap = 10;
    const slotStartX = UITheme.panel.padding;
    const slotStartY = this.detailPanel.contentY + 52;

    for (const slot of slotData) {
      const cx = slotStartX + slot.slotIndex * (cardW + cardGap);

      const card = new UICardVisual(this, {
        x: cx,
        y: slotStartY,
        width: cardW,
        height: cardH,
        action: slot.action,
        rarity: slot.equippedCard?.rarity,
        classRestriction: slot.equippedCard?.classRestriction,
        interactive: isRun,
        selected: this.selectedActionSlot === slot.slotIndex,
        onClick: isRun
          ? () => {
              this.onActionSlotClick(char, slot);
            }
          : undefined,
      });
      this.detailPanel.add(card.container);
      this.slotCards.push(card);
    }

    // 슬롯 우선순위 번호 + 라벨
    for (let i = 0; i < slotData.length; i++) {
      const lx = slotStartX + i * (cardW + cardGap) + cardW / 2;

      // 우선순위 번호 (카드 위)
      const priority = this.add
        .text(lx, slotStartY - 16, `${'\u2460\u2461\u2462'[i]}`, {
          fontSize: '16px',
          fontFamily: UITheme.font.family,
          color: this.selectedActionSlot === i ? '#ffcc00' : '#aabbcc',
        })
        .setOrigin(0.5, 0);
      this.detailPanel.add(priority);

      // 라벨 (카드 아래)
      const label = this.add
        .text(lx, slotStartY + cardH + 4, `슬롯 ${i + 1}`, {
          ...UITheme.font.small,
          color: this.selectedActionSlot === i ? '#ffcc00' : UITheme.colors.textSecondary,
        })
        .setOrigin(0.5, 0);
      this.detailPanel.add(label);
    }

    // 스왑 버튼 (슬롯 사이)
    for (let i = 0; i < slotData.length - 1; i++) {
      const bx = slotStartX + (i + 1) * (cardW + cardGap) - cardGap / 2;
      const by = slotStartY + cardH / 2;
      const swapIdx = i;

      const swapBtn = this.add
        .text(bx, by, '⇄', {
          fontSize: '20px',
          fontFamily: UITheme.font.family,
          color: '#aabbcc',
          backgroundColor: '#1a1a2e',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      swapBtn.on('pointerover', () => swapBtn.setColor('#ffcc00'));
      swapBtn.on('pointerout', () => swapBtn.setColor('#aabbcc'));
      swapBtn.on('pointerdown', () => this.onSwapSlots(char, swapIdx, swapIdx + 1));
      this.detailPanel.add(swapBtn);
    }

    // 런 중이면 인벤토리 표시
    const inventoryY = slotStartY + cardH + 24;
    if (isRun && runState) {
      this.renderInventory(char, runState, inventoryY);
    }
  }

  private onActionSlotClick(char: CharacterDefinition, slot: SlotDisplayData): void {
    if (this.selectedActionSlot === slot.slotIndex) {
      // 같은 슬롯 재클릭: 장착된 카드면 해제
      if (!slot.isBase && gameState.runState) {
        const newRunState = unequipCard(gameState.runState, char.id, slot.slotIndex);
        gameState.setRunState(newRunState);
        this.selectedActionSlot = null;
        this.toast.show(`슬롯 ${slot.slotIndex + 1} 카드 해제`);
      } else {
        this.selectedActionSlot = null;
      }
    } else {
      this.selectedActionSlot = slot.slotIndex;
      this.toast.show(`슬롯 ${slot.slotIndex + 1} 선택 — 인벤토리에서 카드를 선택하세요`);
    }
    this.updateDetailPanel(char);
  }

  private onSwapSlots(char: CharacterDefinition, indexA: number, indexB: number): void {
    const runState = gameState.runState;

    if (runState) {
      // 런 모드: runState 내 party + equippedCards 교환
      const newRunState = swapRunActionSlots(runState, char.id, indexA, indexB);
      gameState.setRunState(newRunState);
      // 갱신된 party에서 charDef 다시 가져오기
      const updatedChar = newRunState.party.find((c) => c.id === char.id) ?? char;
      this.updateDetailPanel(updatedChar);
    } else {
      // 마을 모드: CharacterDefinition 직접 교환
      const newCharDef = swapBaseActionSlots(char, indexA, indexB);
      gameState.updateCharacter(newCharDef);
      this.updateDetailPanel(newCharDef);
    }

    this.toast.show(`슬롯 ${indexA + 1} ⇄ 슬롯 ${indexB + 1}`);
  }

  private onInventoryCardClick(char: CharacterDefinition, card: CardInstance): void {
    if (this.selectedActionSlot === null || !gameState.runState) return;

    const newRunState = equipCard(gameState.runState, char.id, this.selectedActionSlot, card.instanceId);
    gameState.setRunState(newRunState);
    this.toast.show(`${card.action.name} → 슬롯 ${this.selectedActionSlot + 1}`);
    this.selectedActionSlot = null;
    this.updateDetailPanel(char);
  }

  private renderInventory(char: CharacterDefinition, runState: RunState, startY: number): void {
    const equippable = getEquippableCards(runState, char.id);

    // 인벤토리 라벨 (항상 표시)
    const invLabel = this.add.text(UITheme.panel.padding, startY, '인벤토리', {
      ...UITheme.font.label,
      color: UITheme.colors.textAccent,
    });
    this.detailPanel.add(invLabel);

    if (equippable.length === 0) {
      const noCards = this.add.text(UITheme.panel.padding, startY + 22, '장착 가능한 카드 없음', {
        ...UITheme.font.small,
        color: UITheme.colors.textDisabled,
      });
      this.detailPanel.add(noCards);
      return;
    }

    const cardW = 90;
    const cardH = 120;
    const cardGap = 8;
    const cols = 4;
    const invStartY = startY + 20;

    for (let i = 0; i < equippable.length; i++) {
      const invCard = equippable[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = UITheme.panel.padding + col * (cardW + cardGap);
      const cy = invStartY + row * (cardH + cardGap);

      const visual = new UICardVisual(this, {
        x: cx,
        y: cy,
        width: cardW,
        height: cardH,
        action: invCard.action,
        rarity: invCard.rarity,
        classRestriction: invCard.classRestriction,
        interactive: this.selectedActionSlot !== null,
        onClick: () => this.onInventoryCardClick(char, invCard),
      });
      this.detailPanel.add(visual.container);
      this.inventoryCards.push(visual);
    }
  }

  private clearCardVisuals(): void {
    for (const card of this.slotCards) card.destroy();
    this.slotCards = [];
    for (const card of this.inventoryCards) card.destroy();
    this.inventoryCards = [];
  }

  // === 하단 버튼 ===

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

    new UIButton(this, {
      x: GAME_WIDTH - 200,
      y: GAME_HEIGHT - 55,
      width: 180,
      height: 44,
      label: '편성 완료',
      style: 'primary',
      onClick: () => {
        if (!this.isFormationValid()) {
          new UIModal(this, {
            title: '편성 오류',
            content: '출전 슬롯 3개를 모두 채워주세요.',
          });
          return;
        }

        // 런 진행 중이면 런맵으로, 아니면 마을로
        const runState = gameState.runState;
        if (runState && runState.status === RunStatus.IN_PROGRESS) {
          this.scene.start('RunMapScene');
        } else {
          this.scene.start('TownScene');
        }
      },
    });
  }

  private isFormationValid(): boolean {
    const f = gameState.formation;
    return f.slots.length >= 3 && f.slots.every((s) => s.characterId && s.characterId !== '');
  }

  // === 전체 갱신 ===

  private refreshAll(): void {
    this.refreshRoster();
    this.refreshSlots();
    this.refreshHeroSelector();
  }
}
