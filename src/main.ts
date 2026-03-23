import Phaser from 'phaser';
import { phaserConfig } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { TownScene } from './scenes/TownScene';
import { BattleScene } from './scenes/BattleScene';

const config: Phaser.Types.Core.GameConfig = {
  ...phaserConfig,
  scene: [BootScene, MainMenuScene, TownScene, BattleScene],
};

new Phaser.Game(config);
