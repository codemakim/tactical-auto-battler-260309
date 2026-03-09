import Phaser from 'phaser';
import { phaserConfig } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { BattleScene } from './scenes/BattleScene';

const config: Phaser.Types.Core.GameConfig = {
  ...phaserConfig,
  scene: [BootScene, MainMenuScene, BattleScene],
};

new Phaser.Game(config);
