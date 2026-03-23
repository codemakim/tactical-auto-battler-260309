import Phaser from 'phaser';
import { phaserConfig } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { TownScene } from './scenes/TownScene';
import { FormationScene } from './scenes/FormationScene';
import { BattleScene } from './scenes/BattleScene';

const config: Phaser.Types.Core.GameConfig = {
  ...phaserConfig,
  scene: [BootScene, MainMenuScene, TownScene, FormationScene, BattleScene],
};

new Phaser.Game(config);
