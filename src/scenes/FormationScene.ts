/**
 * FormationScene — 편성 화면 (영역 기반 자유 배치)
 *
 * 레이아웃:
 * - 좌측: 보유 캐릭터 목록 (roster)
 * - 중앙: BACK 영역 / FRONT 영역 (자유 배치, 4명)
 * - 우측: 영웅 선택 + 상세 정보
 * - 하단: 출격/뒤로 버튼
 *
 * 영역에 캐릭터를 올려놓으면 UnitLayoutCalculator로 자동 균등 배치.
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
import type { FormationFlowContext, FormationSceneData } from '../systems/FormationFlow';
import {
  resolveFormationFlowContext,
  getFormationTopBarTitle,
  getFormationBackButtonConfig,
  getFormationActionButtonConfig,
} from '../systems/FormationFlow';
import { calculateColumnLayout } from '../systems/UnitLayoutCalculator';
import { validateFormation, canAddToZone } from '../systems/FormationValidator';
import { formatSlotsSummary } from '../utils/actionText';
import { getFormationPresetSlots, getFormationPresetSlotName } from '../systems/FormationPresetSlots';

// 영역 정의
interface ZoneDef {
  key: 'BACK' | 'FRONT';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  position: Position;
  maxUnits: number;
}

// 영역 레이아웃 상수
const ZONE_Y = 100;
const ZONE_HEIGHT = 360;
const ZONE_WIDTH = 160;
const ZONE_GAP = 24;
const BACK_ZONE_X = 380;
const FRONT_ZONE_X = BACK_ZONE_X + ZONE_WIDTH + ZONE_GAP;
const ZONES: ZoneDef[] = [
  {
    key: 'BACK',
    x: BACK_ZONE_X,
    y: ZONE_Y,
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    label: '← BACK (후열)',
    position: Position.BACK,
    maxUnits: 4,
  },
  {
    key: 'FRONT',
    x: FRONT_ZONE_X,
    y: ZONE_Y,
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    label: 'FRONT (전열) →',
    position: Position.FRONT,
    maxUnits: 4,
  },
];

const HERO_TYPES = [HeroType.COMMANDER, HeroType.MAGE, HeroType.SUPPORT] as const;

export class FormationScene extends Phaser.Scene {
  private rosterPanel!: UIPanel;
  private rosterItems: Phaser.GameObjects.Container[] = [];
  private heroButtons: Phaser.GameObjects.Container[] = [];
  private detailPanel!: UIPanel;
  private detailContent!: Phaser.GameObjects.Text;
  private slotCards: UICardVisual[] = [];
  private inventoryCards: UICardVisual[] = [];
  private detailDynamic: Phaser.GameObjects.GameObject[] = [];
  private presetPanel!: UIPanel;
  private presetButtons: UIButton[] = [];
  private presetDynamic: Phaser.GameObjects.GameObject[] = [];
  private selectedPresetSlotIndex = 0;
  private selectedActionSlot: number | null = null;
  private selectedRosterCharId: string | null = null;
  private toast!: UIToast;

  // 영역 관련
  private zoneContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private zoneUnitVisuals: Phaser.GameObjects.Container[] = [];

  // 재도전 컨텍스트
  private isRetry = false;
  private flowContext: FormationFlowContext = 'TOWN';
  private defeatedByEnemies: Array<{ name: string; characterClass: string; hp: number; maxHp: number }> = [];

  constructor() {
    super({ key: 'FormationScene' });
  }

  create(data?: FormationSceneData): void {
    this.selectedRosterCharId = null;
    this.selectedActionSlot = null;
    this.rosterItems = [];
    this.heroButtons = [];
    this.slotCards = [];
    this.inventoryCards = [];
    this.zoneContainers = new Map();
    this.zoneUnitVisuals = [];
    this.isRetry = data?.isRetry ?? false;
    this.defeatedByEnemies = data?.defeatedByEnemies ?? [];
    this.flowContext = resolveFormationFlowContext({
      runState: gameState.runState,
      isRetry: this.isRetry,
      returnScene: data?.returnScene,
    });

    this.drawBackground();
    this.drawTopBar();
    if (this.isRetry) this.drawRetryBanner();
    this.createRosterPanel();
    this.createZones();
    this.createHeroSelector();
    this.createDetailPanel();
    this.createPresetPanel();
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

    const title = getFormationTopBarTitle(this.flowContext);
    const titleColor = this.isRetry
      ? '#ffaa44'
      : this.flowContext === 'RUN_EDIT'
        ? '#ffcc66'
        : UITheme.colors.textPrimary;
    this.add.text(20, 14, title, { ...UITheme.font.heading, color: titleColor }).setDepth(11);

    this.add
      .text(GAME_WIDTH - 20, 14, `Gold: ${gameState.gold}`, { ...UITheme.font.body, color: '#ffcc00' })
      .setOrigin(1, 0)
      .setDepth(11);
  }

  private drawRetryBanner(): void {
    const bannerY = 52;
    const bannerH = this.defeatedByEnemies.length > 0 ? 56 : 32;

    // 배너 배경
    const bg = this.add.graphics().setDepth(10);
    bg.fillStyle(0x3a2200, 0.9);
    bg.fillRect(0, bannerY, GAME_WIDTH, bannerH);
    bg.lineStyle(1, 0xffaa44, 0.6);
    bg.lineBetween(0, bannerY + bannerH, GAME_WIDTH, bannerY + bannerH);

    // 메인 메시지
    const msg = this.add
      .text(GAME_WIDTH / 2, bannerY + 8, '패배 후 재도전 — 편성을 수정하고 다시 싸우세요! (마지막 기회)', {
        fontSize: '13px',
        fontFamily: UITheme.font.family,
        fontStyle: 'bold',
        color: '#ffcc00',
      })
      .setOrigin(0.5, 0)
      .setDepth(11);

    // 남은 적 정보
    if (this.defeatedByEnemies.length > 0) {
      const enemyInfo = this.defeatedByEnemies.map((e) => `${e.name}(${e.hp}/${e.maxHp})`).join('  ');
      this.add
        .text(GAME_WIDTH / 2, bannerY + 28, `남은 적: ${enemyInfo}`, {
          fontSize: '11px',
          fontFamily: UITheme.font.family,
          color: '#ff8866',
        })
        .setOrigin(0.5, 0)
        .setDepth(11);
    }

    // 메시지 펄스
    this.tweens.add({
      targets: msg,
      alpha: { from: 1, to: 0.6 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });
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
      const isSelected = char.id === this.selectedRosterCharId;
      const item = this.createRosterItem(char, isAssigned, isSelected, 8, startY + i * itemH);
      this.rosterPanel.add(item);
      this.rosterItems.push(item);
    }
  }

  private createRosterItem(
    char: CharacterDefinition,
    isAssigned: boolean,
    isSelected: boolean,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const w = 224;
    const h = 46;

    const bg = this.add.graphics();
    const bgColor = isSelected ? 0x2a3a4a : isAssigned ? 0x1a2a3a : 0x1a1a2e;
    const borderColor = isSelected ? 0xffcc00 : isAssigned ? 0x3b82f6 : UITheme.colors.border;
    const borderWidth = isSelected ? 2 : 1;
    bg.fillStyle(bgColor, 0.9);
    bg.fillRoundedRect(0, 0, w, h, 4);
    bg.lineStyle(borderWidth, borderColor);
    bg.strokeRoundedRect(0, 0, w, h, 4);
    container.add(bg);

    const classShort = char.characterClass.substring(0, 3);
    const classTag = this.add.text(8, 6, classShort, { ...UITheme.font.small, color: '#6688aa' }).setFontSize(11);
    container.add(classTag);

    const nameText = this.add.text(8, 22, char.name, {
      ...UITheme.font.label,
      color: isAssigned ? UITheme.colors.textAccent : UITheme.colors.textPrimary,
    });
    container.add(nameText);

    const stats = char.baseStats;
    const statText = this.add
      .text(w - 8, 14, `HP${stats.hp} A${stats.atk} G${stats.grd} S${stats.agi}`, {
        ...UITheme.font.small,
        color: '#666688',
      })
      .setOrigin(1, 0)
      .setFontSize(10);
    container.add(statText);

    if (isAssigned) {
      const badge = this.add
        .text(w - 8, 32, '편성됨', { ...UITheme.font.small, color: '#4488cc' })
        .setOrigin(1, 0)
        .setFontSize(10);
      container.add(badge);
    }

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
      bg.lineStyle(borderWidth, borderColor);
      bg.strokeRoundedRect(0, 0, w, h, 4);
    });

    hitArea.on('pointerdown', () => {
      this.onRosterClick(char);
    });

    return container;
  }

  private onRosterClick(char: CharacterDefinition): void {
    if (this.selectedRosterCharId === char.id) {
      // 같은 캐릭터 재클릭: 선택 해제
      this.selectedRosterCharId = null;
      this.refreshRoster();
      return;
    }

    this.selectedRosterCharId = char.id;
    this.selectedActionSlot = null;
    this.refreshRoster();
    this.updateDetailPanel(char);
    this.toast.show(`${char.name} 선택됨 — 영역을 클릭해 배치하세요`);
  }

  // === 중앙: 영역 기반 배치 ===

  private createZones(): void {
    // 방향 안내
    this.add
      .text((BACK_ZONE_X + FRONT_ZONE_X + ZONE_WIDTH) / 2, ZONE_Y - 20, '아군 진행 방향 →', {
        ...UITheme.font.small,
        color: '#444466',
      })
      .setOrigin(0.5)
      .setFontSize(11);

    for (const zone of ZONES) {
      this.createZoneVisual(zone);
    }
  }

  private createZoneVisual(zone: ZoneDef): void {
    const container = this.add.container(zone.x, zone.y);

    // 영역 배경: 반투명 사각형 + 점선 테두리
    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 0.4);
    bg.fillRoundedRect(0, 0, zone.width, zone.height, 8);
    bg.lineStyle(2, UITheme.colors.border);
    bg.strokeRoundedRect(0, 0, zone.width, zone.height, 8);
    container.add(bg);

    // 영역 라벨
    const label = this.add
      .text(zone.width / 2, 12, zone.label, { ...UITheme.font.small, color: '#556677' })
      .setOrigin(0.5)
      .setFontSize(11);
    container.add(label);

    // 비어있을 때 안내 텍스트
    const emptyText = this.add
      .text(zone.width / 2, zone.height / 2, '캐릭터를\n배치하세요', {
        ...UITheme.font.small,
        color: '#334455',
        align: 'center',
      })
      .setOrigin(0.5)
      .setFontSize(11);
    container.add(emptyText);
    container.setData('emptyText', emptyText);
    container.setData('bg', bg);

    // 클릭 영역
    const hitArea = this.add
      .rectangle(zone.width / 2, zone.height / 2, zone.width, zone.height, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x1e2d4e, 0.5);
      bg.fillRoundedRect(0, 0, zone.width, zone.height, 8);
      bg.lineStyle(2, UITheme.colors.borderHighlight);
      bg.strokeRoundedRect(0, 0, zone.width, zone.height, 8);
    });

    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x16213e, 0.4);
      bg.fillRoundedRect(0, 0, zone.width, zone.height, 8);
      bg.lineStyle(2, UITheme.colors.border);
      bg.strokeRoundedRect(0, 0, zone.width, zone.height, 8);
    });

    hitArea.on('pointerdown', () => {
      this.onZoneClick(zone);
    });

    this.zoneContainers.set(zone.key, container);
  }

  private onZoneClick(zone: ZoneDef): void {
    if (!this.selectedRosterCharId) {
      // 로스터 선택 없이 영역 클릭 → 영역 내 캐릭터가 있으면 첫 번째 캐릭터 상세 표시
      const charsInZone = this.getCharactersInZone(zone.key);
      if (charsInZone.length > 0) {
        this.updateDetailPanel(charsInZone[0]);
      } else {
        this.toast.show('좌측에서 캐릭터를 먼저 선택하세요');
      }
      return;
    }

    const charId = this.selectedRosterCharId;

    this.assignToZone(zone.key, charId);
  }

  private getCharactersInZone(zoneKey: string): CharacterDefinition[] {
    const formation = gameState.formation;

    const position = zoneKey === 'FRONT' ? Position.FRONT : Position.BACK;
    return formation.slots
      .filter((s) => s.characterId && s.position === position)
      .map((s) => gameState.getCharacter(s.characterId))
      .filter((c): c is CharacterDefinition => !!c);
  }

  private assignToZone(zoneKey: 'FRONT' | 'BACK', characterId: string): void {
    const formation = gameState.formation;
    const targetPosition = zoneKey === 'FRONT' ? Position.FRONT : Position.BACK;

    // 추가 가능 여부 확인
    const check = canAddToZone(formation, zoneKey, characterId);
    if (!check.allowed) {
      this.toast.show(check.reason ?? '배치할 수 없습니다');
      return;
    }

    // 기존 위치에서 제거
    let newSlots = formation.slots.filter((s) => s.characterId !== characterId);

    // 새 위치에 추가
    newSlots.push({ characterId, position: targetPosition });

    gameState.setFormation({
      slots: newSlots,
      heroType: formation.heroType,
    });

    const charName = gameState.getCharacter(characterId)?.name ?? '';
    this.selectedRosterCharId = null;
    this.refreshAll();
    this.toast.show(`${charName} → ${zoneKey} 배치 완료!`);
  }

  private refreshZones(): void {
    // 기존 유닛 비주얼 제거
    for (const v of this.zoneUnitVisuals) {
      v.destroy();
    }
    this.zoneUnitVisuals = [];

    for (const zone of ZONES) {
      const container = this.zoneContainers.get(zone.key);
      if (!container) continue;

      const emptyText = container.getData('emptyText') as Phaser.GameObjects.Text;
      const charsInZone = this.getCharactersInZone(zone.key);

      emptyText.setVisible(charsInZone.length === 0);

      if (charsInZone.length === 0) continue;

      // calculateColumnLayout으로 영역 내 균등 배치
      const unitIds = charsInZone.map((c) => c.id);
      const colX = zone.width / 2;
      const yMin = 30; // 라벨 아래
      const yMax = zone.height - 10;
      const positions = calculateColumnLayout(unitIds, colX, yMin, yMax);

      for (let i = 0; i < charsInZone.length; i++) {
        const char = charsInZone[i];
        const pos = positions[i];
        const unitVisual = this.createUnitInZone(char, pos.x, pos.y, zone);
        container.add(unitVisual);
        this.zoneUnitVisuals.push(unitVisual);
      }
    }
  }

  private createUnitInZone(
    char: CharacterDefinition,
    x: number,
    y: number,
    zone: ZoneDef,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const w = zone.width - 16;
    const h = 80;

    // 유닛 박스 배경
    const bg = this.add.graphics();
    bg.fillStyle(0x1e2844, 0.9);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    bg.lineStyle(1, UITheme.colors.border);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    container.add(bg);

    // 클래스
    const classText = this.add
      .text(0, -h / 2 + 10, char.characterClass.substring(0, 3), {
        ...UITheme.font.small,
        color: '#6688aa',
      })
      .setOrigin(0.5)
      .setFontSize(10);
    container.add(classText);

    // 이름
    const nameText = this.add
      .text(0, -4, char.name, { ...UITheme.font.label, color: UITheme.colors.textPrimary })
      .setOrigin(0.5);
    container.add(nameText);

    // 스탯
    const s = char.baseStats;
    const statText = this.add
      .text(0, 14, `HP${s.hp} A${s.atk}`, {
        ...UITheme.font.small,
        color: '#666688',
      })
      .setOrigin(0.5)
      .setFontSize(10);
    container.add(statText);

    // 제거 버튼 (×)
    const removeBtn = this.add
      .text(w / 2 - 4, -h / 2 + 4, '×', {
        fontSize: '14px',
        fontFamily: UITheme.font.family,
        color: '#aa4444',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    container.add(removeBtn);

    removeBtn.on('pointerover', () => removeBtn.setColor('#ff6666'));
    removeBtn.on('pointerout', () => removeBtn.setColor('#aa4444'));
    removeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.removeFromFormation(char.id, zone.key);
    });

    // 유닛 클릭 → 상세 표시
    const hitArea = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      // 유닛 선택 → 다른 영역 클릭으로 이동 가능
      this.selectedRosterCharId = char.id;
      this.selectedActionSlot = null;
      this.refreshRoster();
      this.updateDetailPanel(char);
      this.toast.show(`${char.name} 선택됨 — 다른 영역을 클릭해 이동하세요`);
    });

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x2a3a5a, 0.95);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      bg.lineStyle(2, 0xffcc00);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    });

    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1e2844, 0.9);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      bg.lineStyle(1, UITheme.colors.border);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    });

    return container;
  }

  private removeFromFormation(characterId: string, _zoneKey: string): void {
    const formation = gameState.formation;
    const newSlots = formation.slots.filter((s) => s.characterId !== characterId);
    gameState.setFormation({
      slots: newSlots,
      heroType: formation.heroType,
    });

    const charName = gameState.getCharacter(characterId)?.name ?? '';
    this.toast.show(`${charName} 편성 해제`);
    this.refreshAll();
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
          if (ht === gameState.formation.heroType) {
            this.showHeroDetail(ht);
          } else {
            this.toast.show('런 중에는 영웅을 변경할 수 없습니다');
          }
          return;
        }
        gameState.setHeroType(ht);
        this.refreshHeroSelector();
        this.showHeroDetail(ht);
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

  private showHeroDetail(heroType: string): void {
    const def = HERO_DEFINITIONS[heroType];
    if (!def) return;

    this.selectedRosterCharId = null;
    this.selectedActionSlot = null;
    this.clearDetailDynamic();

    const lines = [`${def.name} — ${def.description}`];
    lines.push('');
    lines.push('능력 목록:');
    for (const ability of def.abilities) {
      const typeTag = ability.abilityType === 'EDIT_ACTION' ? '[편집]' : '[효과]';
      lines.push(`  ${typeTag} ${ability.name}`);
      lines.push(`    ${ability.description}`);
    }

    this.detailContent.setText(lines.join('\n'));
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

    const text = [
      `${char.name} — ${char.characterClass}`,
      `HP: ${s.hp}  ATK: ${s.atk}  GRD: ${s.grd}  AGI: ${s.agi}`,
    ].join('\n');
    this.detailContent.setText(text);

    this.clearDetailDynamic();

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
        condition: slot.condition,
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

      const priority = this.add
        .text(lx, slotStartY - 16, `${'\u2460\u2461\u2462'[i]}`, {
          fontSize: '16px',
          fontFamily: UITheme.font.family,
          color: this.selectedActionSlot === i ? '#ffcc00' : '#aabbcc',
        })
        .setOrigin(0.5, 0);
      this.detailPanel.add(priority);
      this.detailDynamic.push(priority);

      const label = this.add
        .text(lx, slotStartY + cardH + 4, `슬롯 ${i + 1}`, {
          ...UITheme.font.small,
          color: this.selectedActionSlot === i ? '#ffcc00' : UITheme.colors.textSecondary,
        })
        .setOrigin(0.5, 0);
      this.detailPanel.add(label);
      this.detailDynamic.push(label);
    }

    // 스왑 버튼
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
      this.detailDynamic.push(swapBtn);
    }

    // AI 행동 로직 요약
    const logicY = slotStartY + cardH + 22;
    this.renderLogicSummary(slotData, logicY);

    // 런 중이면 인벤토리 표시
    const inventoryY = logicY + slotData.length * 14 + 20;
    if (isRun && runState) {
      this.renderInventory(char, runState, inventoryY);
    }
  }

  private onActionSlotClick(char: CharacterDefinition, slot: SlotDisplayData): void {
    if (this.selectedActionSlot === slot.slotIndex) {
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
      const newRunState = swapRunActionSlots(runState, char.id, indexA, indexB);
      gameState.setRunState(newRunState);
      const updatedChar = newRunState.party.find((c) => c.id === char.id) ?? char;
      this.updateDetailPanel(updatedChar);
    } else {
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

  private renderLogicSummary(slotData: SlotDisplayData[], startY: number): void {
    const slots = slotData.map((s) => ({ condition: s.condition, action: s.action }));
    const lines = formatSlotsSummary(slots);

    const headerText = this.add.text(UITheme.panel.padding, startY, '[행동 로직]', {
      ...UITheme.font.small,
      fontSize: '10px',
      color: UITheme.colors.textSecondary,
    });
    this.detailPanel.add(headerText);
    this.detailDynamic.push(headerText);

    for (let i = 0; i < lines.length; i++) {
      const ly = startY + 14 + i * 14;
      const lineText = this.add.text(UITheme.panel.padding + 4, ly, lines[i], {
        fontFamily: UITheme.font.family,
        fontSize: '11px',
        color: '#ccddee',
      });
      this.detailPanel.add(lineText);
      this.detailDynamic.push(lineText);
    }
  }

  private renderInventory(char: CharacterDefinition, runState: RunState, startY: number): void {
    const equippable = getEquippableCards(runState, char.id);

    const invLabel = this.add.text(UITheme.panel.padding, startY, '인벤토리', {
      ...UITheme.font.label,
      color: UITheme.colors.textAccent,
    });
    this.detailPanel.add(invLabel);
    this.detailDynamic.push(invLabel);

    if (equippable.length === 0) {
      const noCards = this.add.text(UITheme.panel.padding, startY + 22, '장착 가능한 카드 없음', {
        ...UITheme.font.small,
        color: UITheme.colors.textDisabled,
      });
      this.detailPanel.add(noCards);
      this.detailDynamic.push(noCards);
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

  private clearDetailDynamic(): void {
    for (const card of this.slotCards) card.destroy();
    this.slotCards = [];
    for (const card of this.inventoryCards) card.destroy();
    this.inventoryCards = [];
    for (const obj of this.detailDynamic) obj.destroy();
    this.detailDynamic = [];
  }

  // === 하단 버튼 ===

  private createBottomButtons(): void {
    const backConfig = getFormationBackButtonConfig(this.flowContext);
    const actionConfig = getFormationActionButtonConfig(this.flowContext);
    const backWidth = backConfig.label.includes('포기') ? 160 : 140;
    new UIButton(this, {
      x: 20,
      y: GAME_HEIGHT - 55,
      width: backWidth,
      height: 44,
      label: backConfig.label,
      style: 'secondary',
      onClick: () => {
        if (backConfig.targetScene === 'RunResultScene') {
          // 재도전 포기 → RunResultScene (런 정리)
          const rs = gameState.runState;
          if (rs) {
            const defeatState = { ...rs, status: RunStatus.DEFEAT } as RunState;
            this.scene.start('RunResultScene', { runState: defeatState });
          } else {
            this.scene.start('TownScene');
          }
        } else if (backConfig.targetScene === 'RunMapScene') {
          this.scene.start('RunMapScene');
        } else {
          this.scene.start('TownScene');
        }
      },
    });

    new UIButton(this, {
      x: GAME_WIDTH - 200,
      y: GAME_HEIGHT - 55,
      width: 180,
      height: 44,
      label: actionConfig.label,
      style: 'primary',
      onClick: () => {
        const result = validateFormation(gameState.formation);
        if (!result.valid) {
          new UIModal(this, {
            title: '편성 오류',
            content: result.errors.join('\n'),
          });
          return;
        }

        if (actionConfig.targetScene === 'RunMapScene') {
          this.scene.start('RunMapScene');
        } else {
          this.scene.start('TownScene');
        }
      },
    });
  }

  private createPresetPanel(): void {
    this.presetPanel = new UIPanel(this, {
      x: 280,
      y: 525,
      width: 520,
      height: 120,
      title: '편성 프리셋',
    });
  }

  private refreshPresetPanel(): void {
    this.clearPresetPanel();

    const slots = getFormationPresetSlots(gameState.presets);
    const startY = this.presetPanel.contentY + 6;

    slots.forEach((slot, index) => {
      const isSelected = index === this.selectedPresetSlotIndex;
      const button = new UIButton(this, {
        x: UITheme.panel.padding + index * 110,
        y: startY,
        width: 100,
        height: 38,
        label: slot.filled ? slot.name : `${slot.name} (Empty)`,
        style: isSelected ? 'primary' : 'secondary',
        onClick: () => {
          this.selectedPresetSlotIndex = index;
          this.refreshPresetPanel();
        },
      });
      this.presetPanel.add(button.container);
      this.presetButtons.push(button);
    });

    const selectedSlot = slots[this.selectedPresetSlotIndex];
    const summaryText = this.add.text(
      UITheme.panel.padding,
      startY + 48,
      selectedSlot.filled
        ? `${selectedSlot.name}: ${selectedSlot.preset!.formation.slots.length} units / ${selectedSlot.preset!.formation.heroType}`
        : `${selectedSlot.name}: 비어 있음`,
      {
        ...UITheme.font.small,
        color: selectedSlot.filled ? UITheme.colors.textAccent : UITheme.colors.textSecondary,
      },
    );
    this.presetPanel.add(summaryText);
    this.presetDynamic.push(summaryText);

    const saveBtn = new UIButton(this, {
      x: 240,
      y: startY + 42,
      width: 80,
      height: 38,
      label: '저장',
      style: 'primary',
      onClick: () => {
        const name = getFormationPresetSlotName(this.selectedPresetSlotIndex);
        gameState.savePreset(name);
        this.toast.show(`${name} 저장`);
        this.refreshPresetPanel();
      },
    });
    this.presetPanel.add(saveBtn.container);
    this.presetButtons.push(saveBtn);

    const loadBtn = new UIButton(this, {
      x: 330,
      y: startY + 42,
      width: 80,
      height: 38,
      label: '불러오기',
      style: 'secondary',
      disabled: !selectedSlot.filled,
      onClick: () => {
        if (!selectedSlot.filled) return;
        gameState.loadPreset(selectedSlot.name);
        this.toast.show(`${selectedSlot.name} 불러오기`);
        this.refreshAll();
      },
    });
    this.presetPanel.add(loadBtn.container);
    this.presetButtons.push(loadBtn);

    const deleteBtn = new UIButton(this, {
      x: 420,
      y: startY + 42,
      width: 80,
      height: 38,
      label: '삭제',
      style: 'secondary',
      disabled: !selectedSlot.filled,
      onClick: () => {
        if (!selectedSlot.filled) return;
        gameState.deletePreset(selectedSlot.name);
        this.toast.show(`${selectedSlot.name} 삭제`);
        this.refreshPresetPanel();
      },
    });
    this.presetPanel.add(deleteBtn.container);
    this.presetButtons.push(deleteBtn);
  }

  private clearPresetPanel(): void {
    this.presetButtons.forEach((button) => button.destroy());
    this.presetButtons = [];
    this.presetDynamic.forEach((obj) => obj.destroy());
    this.presetDynamic = [];
  }

  // === 전체 갱신 ===

  private refreshAll(): void {
    this.refreshRoster();
    this.refreshZones();
    this.refreshHeroSelector();
    this.refreshPresetPanel();
  }
}
